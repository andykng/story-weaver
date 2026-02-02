#!/usr/bin/env python3
# ============================================
# Script de Collecte d'Infrastructure Serveur
# GitDocs - Génération de Documentation
# ============================================
#
# Ce script collecte les informations système d'un serveur
# et les exporte au format JSON pour générer de la documentation.
#
# Compatible: Linux, macOS, Windows
#
# Usage: python3 collect-infra.py [output_file.json]
# Par défaut, le fichier est enregistré dans: ./infra-data.json
#
# Dépendances: psutil (pip install psutil)
# ============================================

import json
import os
import sys
import socket
import platform
import subprocess
from datetime import datetime, timezone
from pathlib import Path

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("⚠️  psutil non installé. Installation: pip install psutil")
    print("   Certaines fonctionnalités seront limitées.\n")


def get_timestamp():
    """Retourne le timestamp ISO actuel."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def safe_execute(func, default=None):
    """Exécute une fonction en capturant les erreurs."""
    try:
        return func()
    except Exception:
        return default


def run_command(command, shell=True):
    """Exécute une commande shell et retourne le résultat."""
    try:
        result = subprocess.run(
            command,
            shell=shell,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout.strip() if result.returncode == 0 else None
    except Exception:
        return None


def get_system_info():
    """Collecte les informations système de base."""
    print("📊 Collecte des informations système...")
    
    uptime_seconds = 0
    if PSUTIL_AVAILABLE:
        uptime_seconds = int(datetime.now().timestamp() - psutil.boot_time())
    
    return {
        "hostname": socket.gethostname(),
        "os": f"{platform.system()} {platform.release()}",
        "os_version": platform.version(),
        "kernel": platform.release(),
        "architecture": platform.machine(),
        "python_version": platform.python_version(),
        "uptime": {
            "days": uptime_seconds // 86400,
            "hours": (uptime_seconds % 86400) // 3600,
            "total_seconds": uptime_seconds
        }
    }


def get_cpu_info():
    """Collecte les informations CPU."""
    print("🔧 Collecte des informations CPU...")
    
    cpu_info = {
        "model": platform.processor() or "N/A",
        "cores": os.cpu_count() or 0,
        "threads": os.cpu_count() or 0,
        "architecture": platform.machine(),
        "load_average": {
            "1min": 0,
            "5min": 0,
            "15min": 0
        }
    }
    
    if PSUTIL_AVAILABLE:
        cpu_info["cores"] = psutil.cpu_count(logical=False) or os.cpu_count()
        cpu_info["threads"] = psutil.cpu_count(logical=True) or os.cpu_count()
        cpu_info["usage_percent"] = psutil.cpu_percent(interval=1)
        
        # Fréquence CPU
        try:
            freq = psutil.cpu_freq()
            if freq:
                cpu_info["frequency_mhz"] = freq.current
                cpu_info["frequency_max_mhz"] = freq.max
        except Exception:
            pass
    
    # Load average (Unix seulement)
    if hasattr(os, 'getloadavg'):
        try:
            load = os.getloadavg()
            cpu_info["load_average"] = {
                "1min": round(load[0], 2),
                "5min": round(load[1], 2),
                "15min": round(load[2], 2)
            }
        except Exception:
            pass
    
    return cpu_info


def get_memory_info():
    """Collecte les informations mémoire."""
    print("💾 Collecte des informations mémoire...")
    
    memory_info = {
        "total_gb": 0,
        "used_gb": 0,
        "available_gb": 0,
        "usage_percent": 0,
        "swap_total_gb": 0,
        "swap_used_gb": 0
    }
    
    if PSUTIL_AVAILABLE:
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        memory_info = {
            "total_gb": round(mem.total / (1024**3), 2),
            "used_gb": round(mem.used / (1024**3), 2),
            "available_gb": round(mem.available / (1024**3), 2),
            "usage_percent": mem.percent,
            "swap_total_gb": round(swap.total / (1024**3), 2),
            "swap_used_gb": round(swap.used / (1024**3), 2),
            "swap_usage_percent": swap.percent
        }
    
    return memory_info


def get_disk_info():
    """Collecte les informations sur les disques."""
    print("💿 Collecte des informations disques...")
    
    disks = []
    
    if PSUTIL_AVAILABLE:
        for partition in psutil.disk_partitions(all=False):
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disks.append({
                    "device": partition.device,
                    "mount_point": partition.mountpoint,
                    "filesystem": partition.fstype,
                    "size": f"{usage.total / (1024**3):.1f}G",
                    "used": f"{usage.used / (1024**3):.1f}G",
                    "available": f"{usage.free / (1024**3):.1f}G",
                    "usage_percent": usage.percent
                })
            except (PermissionError, OSError):
                continue
    
    return disks


def get_network_info():
    """Collecte les informations réseau."""
    print("🌐 Collecte des informations réseau...")
    
    network_info = {
        "interfaces": [],
        "listening_ports": "",
        "dns_servers": "",
        "default_gateway": ""
    }
    
    if PSUTIL_AVAILABLE:
        # Interfaces réseau
        addrs = psutil.net_if_addrs()
        stats = psutil.net_if_stats()
        
        for iface_name, addresses in addrs.items():
            if iface_name == "lo":
                continue
                
            iface_info = {
                "name": iface_name,
                "ip": "N/A",
                "mac": "N/A",
                "state": "down"
            }
            
            for addr in addresses:
                if addr.family == socket.AF_INET:
                    iface_info["ip"] = addr.address
                elif addr.family == psutil.AF_LINK:
                    iface_info["mac"] = addr.address
            
            if iface_name in stats:
                iface_info["state"] = "up" if stats[iface_name].isup else "down"
                iface_info["speed_mbps"] = stats[iface_name].speed
            
            network_info["interfaces"].append(iface_info)
        
        # Ports en écoute
        try:
            connections = psutil.net_connections(kind='inet')
            listening = set()
            for conn in connections:
                if conn.status == 'LISTEN' and conn.laddr:
                    listening.add(conn.laddr.port)
            network_info["listening_ports"] = ",".join(map(str, sorted(listening)))
        except (psutil.AccessDenied, PermissionError):
            network_info["listening_ports"] = "Accès refusé (exécuter en root)"
    
    # DNS servers (Linux/macOS)
    try:
        with open("/etc/resolv.conf", "r") as f:
            dns = [line.split()[1] for line in f if line.startswith("nameserver")]
            network_info["dns_servers"] = ",".join(dns)
    except Exception:
        pass
    
    # Default gateway
    gateway = run_command("ip route | grep default | awk '{print $3}' | head -1")
    if gateway:
        network_info["default_gateway"] = gateway
    
    return network_info


def get_services_info():
    """Collecte les informations sur les services."""
    print("⚙️  Collecte des services actifs...")
    
    services = {"running": "", "failed": ""}
    
    if platform.system() == "Linux":
        running = run_command("systemctl list-units --type=service --state=running --no-pager --no-legend | awk '{print $1}' | sed 's/.service$//' | head -50")
        if running:
            services["running"] = ",".join(running.split('\n'))
        
        failed = run_command("systemctl list-units --type=service --state=failed --no-pager --no-legend | awk '{print $1}' | sed 's/.service$//'")
        if failed:
            services["failed"] = ",".join(failed.split('\n'))
    
    return services


def get_docker_info():
    """Collecte les informations Docker."""
    print("🐳 Collecte des informations Docker...")
    
    docker_info = {
        "installed": False,
        "version": None,
        "containers": [],
        "images": []
    }
    
    # Vérifier si Docker est installé
    version = run_command("docker --version")
    if version:
        docker_info["installed"] = True
        docker_info["version"] = version.split()[2].rstrip(',') if len(version.split()) >= 3 else version
        
        # Conteneurs en cours d'exécution
        containers_json = run_command('docker ps --format \'{"name":"{{.Names}}","image":"{{.Image}}","status":"{{.Status}}","ports":"{{.Ports}}"}\'')
        if containers_json:
            try:
                docker_info["containers"] = [json.loads(line) for line in containers_json.split('\n') if line]
            except json.JSONDecodeError:
                pass
        
        # Images Docker
        images_json = run_command('docker images --format \'{"repository":"{{.Repository}}","tag":"{{.Tag}}","size":"{{.Size}}"}\'')
        if images_json:
            try:
                docker_info["images"] = [json.loads(line) for line in images_json.split('\n') if line]
            except json.JSONDecodeError:
                pass
    
    return docker_info


def get_security_info():
    """Collecte les informations de sécurité."""
    print("🔐 Collecte des informations sécurité...")
    
    security_info = {
        "user_count": 0,
        "sudo_users": "",
        "ssh_port": 22,
        "firewall_status": "Non détecté",
        "selinux_status": "N/A"
    }
    
    # Nombre d'utilisateurs
    try:
        with open("/etc/passwd", "r") as f:
            security_info["user_count"] = len(f.readlines())
    except Exception:
        pass
    
    # Utilisateurs sudo
    sudo_users = run_command("getent group sudo wheel 2>/dev/null | cut -d':' -f4")
    if sudo_users:
        security_info["sudo_users"] = sudo_users
    
    # Port SSH
    ssh_port = run_command("grep '^Port' /etc/ssh/sshd_config | awk '{print $2}'")
    if ssh_port:
        try:
            security_info["ssh_port"] = int(ssh_port)
        except ValueError:
            pass
    
    # Firewall
    if run_command("which ufw"):
        status = run_command("ufw status | head -1")
        if status:
            security_info["firewall_status"] = status
    elif run_command("which firewalld"):
        status = run_command("firewall-cmd --state")
        if status:
            security_info["firewall_status"] = f"firewalld: {status}"
    
    # SELinux
    selinux = run_command("getenforce")
    if selinux:
        security_info["selinux_status"] = selinux
    
    return security_info


def get_config_files():
    """Détecte les fichiers de configuration importants."""
    print("📄 Détection des fichiers de configuration...")
    
    config_paths = [
        "/etc/nginx/nginx.conf",
        "/etc/apache2/apache2.conf",
        "/etc/httpd/conf/httpd.conf",
        "/etc/mysql/my.cnf",
        "/etc/redis/redis.conf",
        "/etc/mongod.conf",
        "/etc/docker/daemon.json",
        "/etc/ssh/sshd_config",
        "/etc/hosts",
        "/etc/fstab",
        "/etc/crontab",
        "/etc/environment",
        "/etc/systemd/system.conf",
    ]
    
    # Ajouter les fichiers PostgreSQL
    pg_paths = list(Path("/etc/postgresql").glob("*/main/postgresql.conf")) if Path("/etc/postgresql").exists() else []
    config_paths.extend([str(p) for p in pg_paths])
    
    found_configs = []
    for path in config_paths:
        if os.path.isfile(path):
            found_configs.append(path)
    
    return found_configs


def get_installed_software():
    """Détecte les logiciels majeurs installés."""
    print("📦 Détection des logiciels installés...")
    
    software = {
        "package_manager": "unknown",
        "package_count": 0,
        "major_software": []
    }
    
    # Gestionnaire de paquets
    if run_command("which dpkg"):
        software["package_manager"] = "apt/dpkg"
        count = run_command("dpkg -l | grep '^ii' | wc -l")
        if count:
            software["package_count"] = int(count)
    elif run_command("which rpm"):
        software["package_manager"] = "rpm/yum"
        count = run_command("rpm -qa | wc -l")
        if count:
            software["package_count"] = int(count)
    elif run_command("which pacman"):
        software["package_manager"] = "pacman"
        count = run_command("pacman -Q | wc -l")
        if count:
            software["package_count"] = int(count)
    
    # Logiciels majeurs
    major_apps = [
        ("nginx", "nginx -v"),
        ("apache2", "apache2 -v"),
        ("mysql", "mysql --version"),
        ("postgresql", "psql --version"),
        ("redis", "redis-server --version"),
        ("mongodb", "mongod --version"),
        ("node", "node --version"),
        ("python3", "python3 --version"),
        ("java", "java -version"),
        ("go", "go version"),
        ("rust", "rustc --version"),
        ("php", "php --version"),
        ("git", "git --version"),
    ]
    
    for name, cmd in major_apps:
        version = run_command(cmd)
        if version:
            software["major_software"].append({
                "name": name,
                "version": version.split('\n')[0]
            })
    
    return software


def main():
    """Fonction principale."""
    output_file = sys.argv[1] if len(sys.argv) > 1 else "infra-data.json"
    
    print("=" * 50)
    print("🔍 Script de Collecte d'Infrastructure GitDocs")
    print("=" * 50)
    print(f"   Fichier de sortie: {output_file}")
    print()
    
    # Collecte des données
    data = {
        "metadata": {
            "collected_at": get_timestamp(),
            "collector_version": "1.0.0",
            "collector_type": "python",
            "psutil_available": PSUTIL_AVAILABLE
        },
        "system": get_system_info(),
        "cpu": get_cpu_info(),
        "memory": get_memory_info(),
        "disks": get_disk_info(),
        "network": get_network_info(),
        "services": get_services_info(),
        "docker": get_docker_info(),
        "software": get_installed_software(),
        "security": get_security_info(),
        "config_files": get_config_files()
    }
    
    # Écriture du fichier JSON
    print()
    print("📝 Génération du fichier JSON...")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print()
    print("=" * 50)
    print("✅ Collecte terminée!")
    print(f"   Fichier généré: {output_file}")
    print()
    print("📤 Utilisez ce fichier JSON dans GitDocs pour générer")
    print("   votre documentation d'infrastructure.")
    print("=" * 50)


if __name__ == "__main__":
    main()
