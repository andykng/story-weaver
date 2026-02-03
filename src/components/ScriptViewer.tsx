import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, ChevronDown, ChevronUp, Terminal, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Script Bash avec commentaires
const bashScript = `#!/bin/bash
# ============================================
# Script de Collecte d'Infrastructure Serveur
# GitDocs - Génération de Documentation
# ============================================
# 
# Ce script collecte les informations système d'un serveur Linux
# et les exporte au format JSON pour générer de la documentation.
#
# Usage: ./collect-infra.sh [output_file.json]
# Par défaut, le fichier est enregistré dans: ./infra-data.json
#
# Compatible: Ubuntu, Debian, CentOS, RHEL, Fedora, Arch Linux
# Prérequis: bash, coreutils (commandes de base Linux)
# ============================================

set -e  # Arrête le script en cas d'erreur

# ============================================
# Configuration
# ============================================
OUTPUT_FILE="\${1:-infra-data.json}"  # Fichier de sortie (modifiable en argument)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")  # Timestamp ISO pour la traçabilité

echo "🔍 Collecte des informations d'infrastructure..."
echo "   Fichier de sortie: $OUTPUT_FILE"
echo ""

# ============================================
# Fonction utilitaire
# ============================================
# Exécute une commande et retourne "N/A" en cas d'échec
get_value() {
    local result
    result=$("$@" 2>/dev/null) || result="N/A"
    echo "$result"
}

# ============================================
# SECTION 1: Informations Système de Base
# ============================================
# Collecte: hostname, OS, kernel, architecture, uptime
echo "📊 Collecte des informations système..."

HOSTNAME=$(get_value hostname)
KERNEL=$(get_value uname -r)
OS_NAME=$(get_value cat /etc/os-release | grep "^PRETTY_NAME=" | cut -d'"' -f2)
[ -z "$OS_NAME" ] && OS_NAME=$(get_value uname -s)
ARCHITECTURE=$(get_value uname -m)
UPTIME_SECONDS=$(get_value cat /proc/uptime | cut -d' ' -f1 | cut -d'.' -f1)
UPTIME_DAYS=$((UPTIME_SECONDS / 86400))
UPTIME_HOURS=$(((UPTIME_SECONDS % 86400) / 3600))

# ============================================
# SECTION 2: Informations CPU
# ============================================
# Collecte: modèle CPU, cœurs, threads, fréquence, charge système
echo "🔧 Collecte des informations CPU..."

CPU_MODEL=$(get_value cat /proc/cpuinfo | grep "model name" | head -1 | cut -d':' -f2 | xargs)
CPU_CORES=$(get_value nproc)
CPU_THREADS=$(get_value cat /proc/cpuinfo | grep "processor" | wc -l)
CPU_FREQ=$(get_value cat /proc/cpuinfo | grep "cpu MHz" | head -1 | cut -d':' -f2 | xargs)

# Load average: charge moyenne sur 1, 5 et 15 minutes
LOAD_AVG=$(get_value cat /proc/loadavg | cut -d' ' -f1-3)
LOAD_1=$(echo "$LOAD_AVG" | cut -d' ' -f1)
LOAD_5=$(echo "$LOAD_AVG" | cut -d' ' -f2)
LOAD_15=$(echo "$LOAD_AVG" | cut -d' ' -f3)

# ============================================
# SECTION 3: Informations Mémoire
# ============================================
# Collecte: RAM totale, utilisée, disponible, swap
echo "💾 Collecte des informations mémoire..."

MEM_TOTAL_KB=$(get_value cat /proc/meminfo | grep "MemTotal" | awk '{print $2}')
MEM_FREE_KB=$(get_value cat /proc/meminfo | grep "MemFree" | awk '{print $2}')
MEM_AVAILABLE_KB=$(get_value cat /proc/meminfo | grep "MemAvailable" | awk '{print $2}')
SWAP_TOTAL_KB=$(get_value cat /proc/meminfo | grep "SwapTotal" | awk '{print $2}')
SWAP_FREE_KB=$(get_value cat /proc/meminfo | grep "SwapFree" | awk '{print $2}')

# Conversion en Go pour une meilleure lisibilité
MEM_TOTAL_GB=$(echo "scale=2; $MEM_TOTAL_KB / 1048576" | bc 2>/dev/null || echo "N/A")
MEM_AVAILABLE_GB=$(echo "scale=2; $MEM_AVAILABLE_KB / 1048576" | bc 2>/dev/null || echo "N/A")
MEM_USED_GB=$(echo "scale=2; ($MEM_TOTAL_KB - $MEM_AVAILABLE_KB) / 1048576" | bc 2>/dev/null || echo "N/A")
SWAP_TOTAL_GB=$(echo "scale=2; $SWAP_TOTAL_KB / 1048576" | bc 2>/dev/null || echo "0")

# ============================================
# SECTION 4: Informations Disques
# ============================================
# Collecte: partitions, taille, utilisation, points de montage
echo "💿 Collecte des informations disques..."

DISK_INFO=$(df -h --output=source,fstype,size,used,avail,pcent,target 2>/dev/null | grep -E "^/dev" | head -20)

# ============================================
# SECTION 5: Informations Réseau
# ============================================
# Collecte: interfaces, IPs, MAC, ports en écoute, DNS, passerelle
echo "🌐 Collecte des informations réseau..."

NETWORK_INTERFACES=$(ip -j addr 2>/dev/null || echo "[]")
LISTENING_PORTS=$(ss -tlnp 2>/dev/null | grep LISTEN | awk '{print $4}' | sed 's/.*://' | sort -n | uniq | tr '\\n' ',' | sed 's/,$//')
DNS_SERVERS=$(get_value cat /etc/resolv.conf | grep "^nameserver" | awk '{print $2}' | tr '\\n' ',' | sed 's/,$//')
DEFAULT_GATEWAY=$(get_value ip route | grep default | awk '{print $3}' | head -1)

# ============================================
# SECTION 6: Services Actifs
# ============================================
# Collecte: liste des services systemd en cours d'exécution
echo "⚙️  Collecte des services actifs..."

if command -v systemctl &> /dev/null; then
    SERVICES=$(systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null | awk '{print $1}' | sed 's/.service$//' | head -50 | tr '\\n' ',' | sed 's/,$//')
else
    SERVICES="systemctl non disponible"
fi

# ============================================
# SECTION 7: Conteneurs Docker
# ============================================
# Collecte: version Docker, conteneurs en cours, images disponibles
echo "🐳 Collecte des informations Docker..."

DOCKER_INSTALLED="false"
DOCKER_CONTAINERS="[]"
DOCKER_IMAGES="[]"

if command -v docker &> /dev/null; then
    DOCKER_INSTALLED="true"
    DOCKER_VERSION=$(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')
    DOCKER_CONTAINERS=$(docker ps --format '{"name":"{{.Names}}","image":"{{.Image}}","status":"{{.Status}}","ports":"{{.Ports}}"}' 2>/dev/null | jq -s '.' 2>/dev/null || echo "[]")
    DOCKER_IMAGES=$(docker images --format '{"repository":"{{.Repository}}","tag":"{{.Tag}}","size":"{{.Size}}"}' 2>/dev/null | jq -s '.' 2>/dev/null || echo "[]")
fi

# ============================================
# SECTION 8: Packages Installés
# ============================================
# Détecte le gestionnaire de paquets et compte les packages
echo "📦 Collecte des packages installés..."

if command -v dpkg &> /dev/null; then
    PKG_MANAGER="apt/dpkg"
    PKG_COUNT=$(dpkg -l 2>/dev/null | grep "^ii" | wc -l)
elif command -v rpm &> /dev/null; then
    PKG_MANAGER="rpm/yum"
    PKG_COUNT=$(rpm -qa 2>/dev/null | wc -l)
elif command -v pacman &> /dev/null; then
    PKG_MANAGER="pacman"
    PKG_COUNT=$(pacman -Q 2>/dev/null | wc -l)
else
    PKG_MANAGER="inconnu"
    PKG_COUNT="N/A"
fi

# ============================================
# SECTION 9: Utilisateurs et Sécurité
# ============================================
# Collecte: nombre d'utilisateurs, sudo, SSH, firewall
echo "🔐 Collecte des informations sécurité..."

USER_COUNT=$(get_value cat /etc/passwd | wc -l)
SUDO_USERS=$(get_value getent group sudo wheel 2>/dev/null | cut -d':' -f4)
SSH_PORT=$(get_value cat /etc/ssh/sshd_config 2>/dev/null | grep "^Port" | awk '{print $2}')
[ -z "$SSH_PORT" ] && SSH_PORT="22"

# Détection du firewall actif
if command -v ufw &> /dev/null; then
    FIREWALL_STATUS=$(ufw status 2>/dev/null | head -1)
elif command -v firewalld &> /dev/null; then
    FIREWALL_STATUS=$(firewall-cmd --state 2>/dev/null)
elif command -v iptables &> /dev/null; then
    IPTABLES_RULES=$(iptables -L 2>/dev/null | wc -l)
    FIREWALL_STATUS="iptables ($IPTABLES_RULES règles)"
else
    FIREWALL_STATUS="Non détecté"
fi

# ============================================
# SECTION 10: Fichiers de Configuration
# ============================================
# Détecte les fichiers de config importants présents
echo "📄 Détection des fichiers de configuration..."

CONFIG_FILES=""
CONFIG_PATHS=(
    "/etc/nginx/nginx.conf"
    "/etc/apache2/apache2.conf"
    "/etc/httpd/conf/httpd.conf"
    "/etc/mysql/my.cnf"
    "/etc/postgresql/*/main/postgresql.conf"
    "/etc/redis/redis.conf"
    "/etc/mongod.conf"
    "/etc/docker/daemon.json"
    "/etc/ssh/sshd_config"
    "/etc/hosts"
    "/etc/fstab"
    "/etc/crontab"
)

for config in "\${CONFIG_PATHS[@]}"; do
    if [ -f "$config" ]; then
        CONFIG_FILES="$CONFIG_FILES\\"$config\\","
    fi
done
CONFIG_FILES="[\${CONFIG_FILES%,}]"

# ============================================
# GÉNÉRATION DU JSON FINAL
# ============================================
echo ""
echo "📝 Génération du fichier JSON..."

# Construction du JSON des disques
DISK_JSON="["
while IFS= read -r line; do
    if [ -n "$line" ]; then
        device=$(echo "$line" | awk '{print $1}')
        fstype=$(echo "$line" | awk '{print $2}')
        size=$(echo "$line" | awk '{print $3}')
        used=$(echo "$line" | awk '{print $4}')
        avail=$(echo "$line" | awk '{print $5}')
        percent=$(echo "$line" | awk '{print $6}' | tr -d '%')
        mount=$(echo "$line" | awk '{print $7}')
        DISK_JSON="$DISK_JSON{\\"device\\":\\"$device\\",\\"filesystem\\":\\"$fstype\\",\\"size\\":\\"$size\\",\\"used\\":\\"$used\\",\\"available\\":\\"$avail\\",\\"usage_percent\\":$percent,\\"mount_point\\":\\"$mount\\"},"
    fi
done <<< "$DISK_INFO"
DISK_JSON="\${DISK_JSON%,}]"

# Construction du JSON des interfaces réseau
NETWORK_JSON="["
while IFS= read -r iface; do
    if [ -n "$iface" ] && [ "$iface" != "lo" ]; then
        ip_addr=$(ip -4 addr show "$iface" 2>/dev/null | grep inet | awk '{print $2}' | cut -d'/' -f1 | head -1)
        mac_addr=$(ip link show "$iface" 2>/dev/null | grep ether | awk '{print $2}')
        state=$(ip link show "$iface" 2>/dev/null | grep -oP '(?<=state )\\w+')
        NETWORK_JSON="$NETWORK_JSON{\\"name\\":\\"$iface\\",\\"ip\\":\\"\${ip_addr:-N/A}\\",\\"mac\\":\\"\${mac_addr:-N/A}\\",\\"state\\":\\"\${state:-unknown}\\"},"
    fi
done <<< "$(ls /sys/class/net 2>/dev/null)"
NETWORK_JSON="\${NETWORK_JSON%,}]"

# Écriture du fichier JSON final
cat > "$OUTPUT_FILE" << EOF
{
  "metadata": {
    "collected_at": "$TIMESTAMP",
    "collector_version": "1.0.0",
    "collector_type": "bash"
  },
  "system": {
    "hostname": "$HOSTNAME",
    "os": "$OS_NAME",
    "kernel": "$KERNEL",
    "architecture": "$ARCHITECTURE",
    "uptime": {
      "days": $UPTIME_DAYS,
      "hours": $UPTIME_HOURS,
      "total_seconds": $UPTIME_SECONDS
    }
  },
  "cpu": {
    "model": "$CPU_MODEL",
    "cores": $CPU_CORES,
    "threads": $CPU_THREADS,
    "frequency_mhz": "\${CPU_FREQ:-0}",
    "load_average": {
      "1min": $LOAD_1,
      "5min": $LOAD_5,
      "15min": $LOAD_15
    }
  },
  "memory": {
    "total_gb": $MEM_TOTAL_GB,
    "used_gb": $MEM_USED_GB,
    "available_gb": $MEM_AVAILABLE_GB,
    "swap_total_gb": $SWAP_TOTAL_GB
  },
  "disks": $DISK_JSON,
  "network": {
    "interfaces": $NETWORK_JSON,
    "listening_ports": "$(echo $LISTENING_PORTS | tr -d '\\n')",
    "dns_servers": "$DNS_SERVERS",
    "default_gateway": "$DEFAULT_GATEWAY"
  },
  "services": {
    "running": "$(echo $SERVICES | tr -d '\\n')"
  },
  "docker": {
    "installed": $DOCKER_INSTALLED,
    "version": "\${DOCKER_VERSION:-null}",
    "containers": $DOCKER_CONTAINERS,
    "images": $DOCKER_IMAGES
  },
  "packages": {
    "manager": "$PKG_MANAGER",
    "count": $PKG_COUNT
  },
  "security": {
    "user_count": $USER_COUNT,
    "sudo_users": "$SUDO_USERS",
    "ssh_port": $SSH_PORT,
    "firewall_status": "$FIREWALL_STATUS"
  },
  "config_files": $CONFIG_FILES
}
EOF

echo ""
echo "✅ Collecte terminée!"
echo "   Fichier généré: $OUTPUT_FILE"
echo ""
echo "📤 Utilisez ce fichier JSON dans GitDocs pour générer"
echo "   votre documentation d'infrastructure."`;

// Script Python avec commentaires
const pythonScript = `#!/usr/bin/env python3
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

# ============================================
# Vérification des dépendances
# ============================================
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    print("⚠️  psutil non installé. Installation: pip install psutil")
    print("   Certaines fonctionnalités seront limitées.\\n")


# ============================================
# Fonctions Utilitaires
# ============================================

def get_timestamp():
    """Retourne le timestamp ISO actuel en UTC."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def safe_execute(func, default=None):
    """Exécute une fonction en capturant les erreurs silencieusement."""
    try:
        return func()
    except Exception:
        return default


def run_command(command, shell=True):
    """
    Exécute une commande shell et retourne le résultat.
    Timeout de 30 secondes pour éviter les blocages.
    """
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


# ============================================
# SECTION 1: Informations Système
# ============================================

def get_system_info():
    """
    Collecte les informations système de base:
    - Hostname, OS, Kernel, Architecture
    - Version Python, Uptime
    """
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


# ============================================
# SECTION 2: Informations CPU
# ============================================

def get_cpu_info():
    """
    Collecte les informations CPU:
    - Modèle, Cœurs physiques et logiques
    - Fréquence actuelle et maximale
    - Load average (charge système)
    """
    print("🔧 Collecte des informations CPU...")
    
    cpu_info = {
        "model": platform.processor() or "N/A",
        "cores": os.cpu_count() or 0,
        "threads": os.cpu_count() or 0,
        "architecture": platform.machine(),
        "load_average": {"1min": 0, "5min": 0, "15min": 0}
    }
    
    if PSUTIL_AVAILABLE:
        # Cœurs physiques vs logiques (threads)
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
    
    # Load average (Unix uniquement)
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


# ============================================
# SECTION 3: Informations Mémoire
# ============================================

def get_memory_info():
    """
    Collecte les informations mémoire:
    - RAM totale, utilisée, disponible
    - Swap totale et utilisée
    - Pourcentages d'utilisation
    """
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


# ============================================
# SECTION 4: Informations Disques
# ============================================

def get_disk_info():
    """
    Collecte les informations sur les disques:
    - Partitions montées
    - Taille, espace utilisé, espace disponible
    - Système de fichiers
    """
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


# ============================================
# SECTION 5: Informations Réseau
# ============================================

def get_network_info():
    """
    Collecte les informations réseau:
    - Interfaces (IP, MAC, état)
    - Ports en écoute
    - Serveurs DNS, passerelle par défaut
    """
    print("🌐 Collecte des informations réseau...")
    
    network_info = {
        "interfaces": [],
        "listening_ports": "",
        "dns_servers": "",
        "default_gateway": ""
    }
    
    if PSUTIL_AVAILABLE:
        addrs = psutil.net_if_addrs()
        stats = psutil.net_if_stats()
        
        for iface_name, addresses in addrs.items():
            if iface_name == "lo":  # Ignorer loopback
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
        
        # Ports en écoute (nécessite souvent les droits root)
        try:
            connections = psutil.net_connections(kind='inet')
            listening = set()
            for conn in connections:
                if conn.status == 'LISTEN' and conn.laddr:
                    listening.add(conn.laddr.port)
            network_info["listening_ports"] = ",".join(map(str, sorted(listening)))
        except (psutil.AccessDenied, PermissionError):
            network_info["listening_ports"] = "Accès refusé (exécuter en root)"
    
    # Serveurs DNS (Linux/macOS)
    try:
        with open("/etc/resolv.conf", "r") as f:
            dns = [line.split()[1] for line in f if line.startswith("nameserver")]
            network_info["dns_servers"] = ",".join(dns)
    except Exception:
        pass
    
    # Passerelle par défaut
    gateway = run_command("ip route | grep default | awk '{print $3}' | head -1")
    if gateway:
        network_info["default_gateway"] = gateway
    
    return network_info


# ============================================
# SECTION 6: Services Actifs
# ============================================

def get_services_info():
    """
    Collecte les services systemd:
    - Services en cours d'exécution
    - Services en échec
    """
    print("⚙️  Collecte des services actifs...")
    
    services = {"running": "", "failed": ""}
    
    if platform.system() == "Linux":
        running = run_command(
            "systemctl list-units --type=service --state=running "
            "--no-pager --no-legend | awk '{print $1}' | sed 's/.service$//' | head -50"
        )
        if running:
            services["running"] = ",".join(running.split('\\n'))
        
        failed = run_command(
            "systemctl list-units --type=service --state=failed "
            "--no-pager --no-legend | awk '{print $1}' | sed 's/.service$//'"
        )
        if failed:
            services["failed"] = ",".join(failed.split('\\n'))
    
    return services


# ============================================
# SECTION 7: Docker
# ============================================

def get_docker_info():
    """
    Collecte les informations Docker:
    - Version installée
    - Conteneurs en cours d'exécution
    - Images disponibles
    """
    print("🐳 Collecte des informations Docker...")
    
    docker_info = {
        "installed": False,
        "version": None,
        "containers": [],
        "images": []
    }
    
    version = run_command("docker --version")
    if version:
        docker_info["installed"] = True
        docker_info["version"] = version.split()[2].rstrip(',') if len(version.split()) >= 3 else version
        
        # Conteneurs en cours
        containers_json = run_command(
            'docker ps --format \\'{"name":"{{.Names}}","image":"{{.Image}}",'
            '"status":"{{.Status}}","ports":"{{.Ports}}"}\\''
        )
        if containers_json:
            try:
                docker_info["containers"] = [
                    json.loads(line) for line in containers_json.split('\\n') if line
                ]
            except json.JSONDecodeError:
                pass
        
        # Images Docker
        images_json = run_command(
            'docker images --format \\'{"repository":"{{.Repository}}",'
            '"tag":"{{.Tag}}","size":"{{.Size}}"}\\''
        )
        if images_json:
            try:
                docker_info["images"] = [
                    json.loads(line) for line in images_json.split('\\n') if line
                ]
            except json.JSONDecodeError:
                pass
    
    return docker_info


# ============================================
# SECTION 8: Sécurité
# ============================================

def get_security_info():
    """
    Collecte les informations de sécurité:
    - Nombre d'utilisateurs système
    - Utilisateurs sudo
    - Port SSH configuré
    - État du firewall
    """
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
    
    # Utilisateurs sudo/wheel
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
    
    # Firewall (ufw, firewalld)
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


# ============================================
# SECTION 9: Fichiers de Configuration
# ============================================

def get_config_files():
    """
    Détecte les fichiers de configuration importants:
    - Serveurs web (nginx, apache)
    - Bases de données (MySQL, PostgreSQL, Redis)
    - Docker, SSH, système
    """
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
    
    # Fichiers PostgreSQL (version dynamique)
    pg_paths = list(Path("/etc/postgresql").glob("*/main/postgresql.conf")) \\
        if Path("/etc/postgresql").exists() else []
    config_paths.extend([str(p) for p in pg_paths])
    
    found_configs = [path for path in config_paths if os.path.isfile(path)]
    return found_configs


# ============================================
# SECTION 10: Logiciels Installés
# ============================================

def get_installed_software():
    """
    Détecte les logiciels majeurs installés:
    - Gestionnaire de paquets utilisé
    - Nombre de packages
    - Versions des logiciels courants
    """
    print("📦 Détection des logiciels installés...")
    
    software = {
        "package_manager": "unknown",
        "package_count": 0,
        "major_software": []
    }
    
    # Détection du gestionnaire de paquets
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
    
    # Logiciels majeurs avec leurs versions
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
                "version": version.split('\\n')[0]
            })
    
    return software


# ============================================
# FONCTION PRINCIPALE
# ============================================

def main():
    """Point d'entrée principal du script."""
    output_file = sys.argv[1] if len(sys.argv) > 1 else "infra-data.json"
    
    print("=" * 50)
    print("🔍 Script de Collecte d'Infrastructure GitDocs")
    print("=" * 50)
    print(f"   Fichier de sortie: {output_file}")
    print()
    
    # Collecte de toutes les données
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
    main()`;

interface ScriptViewerProps {
  className?: string;
}

export function ScriptViewer({ className }: ScriptViewerProps) {
  const [expandedScript, setExpandedScript] = useState<"bash" | "python" | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const copyToClipboard = async (text: string, scriptType: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedScript(scriptType);
    toast.success("Script copié dans le presse-papier !");
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const downloadScript = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} téléchargé !`);
  };

  return (
    <Card className={cn("border-2", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="h-5 w-5" />
          Scripts de Collecte d'Infrastructure
        </CardTitle>
        <CardDescription>
          Copiez et exécutez l'un de ces scripts sur votre serveur pour collecter les informations système.
          Le fichier JSON généré sera utilisé pour créer votre documentation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bash">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-4">
            <TabsTrigger value="bash">🐧 Script Bash (Linux)</TabsTrigger>
            <TabsTrigger value="python">🐍 Script Python (Multi-OS)</TabsTrigger>
          </TabsList>

          <TabsContent value="bash" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">
                <strong>Compatible:</strong> Ubuntu, Debian, CentOS, RHEL, Fedora, Arch Linux
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(bashScript, "bash")}
                >
                  {copiedScript === "bash" ? (
                    <Check className="h-4 w-4 mr-1 text-success" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  Copier
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadScript(bashScript, "collect-infra.sh")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="bg-muted rounded-lg border">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
                  <span className="text-sm font-mono text-muted-foreground">collect-infra.sh</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedScript(expandedScript === "bash" ? null : "bash")}
                  >
                    {expandedScript === "bash" ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Réduire
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Voir tout
                      </>
                    )}
                  </Button>
                </div>
                <pre
                  className={cn(
                    "p-4 overflow-x-auto text-sm font-mono transition-all duration-300",
                    expandedScript === "bash" ? "max-h-[600px]" : "max-h-[300px]"
                  )}
                >
                  <code className="language-bash">{bashScript}</code>
                </pre>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold mb-2">📋 Instructions d'utilisation :</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Copiez le script ci-dessus</li>
                <li>Créez un fichier sur votre serveur : <code className="bg-muted px-1 rounded">nano collect-infra.sh</code></li>
                <li>Collez le contenu et sauvegardez</li>
                <li>Rendez-le exécutable : <code className="bg-muted px-1 rounded">chmod +x collect-infra.sh</code></li>
                <li>Exécutez : <code className="bg-muted px-1 rounded">./collect-infra.sh</code></li>
                <li>Récupérez le fichier <code className="bg-muted px-1 rounded">infra-data.json</code> généré</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="python" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">
                <strong>Compatible:</strong> Linux, macOS, Windows • <strong>Prérequis:</strong> Python 3.6+, psutil
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(pythonScript, "python")}
                >
                  {copiedScript === "python" ? (
                    <Check className="h-4 w-4 mr-1 text-success" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  Copier
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadScript(pythonScript, "collect-infra.py")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="bg-muted rounded-lg border">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
                  <span className="text-sm font-mono text-muted-foreground">collect-infra.py</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedScript(expandedScript === "python" ? null : "python")}
                  >
                    {expandedScript === "python" ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Réduire
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Voir tout
                      </>
                    )}
                  </Button>
                </div>
                <pre
                  className={cn(
                    "p-4 overflow-x-auto text-sm font-mono transition-all duration-300",
                    expandedScript === "python" ? "max-h-[600px]" : "max-h-[300px]"
                  )}
                >
                  <code className="language-python">{pythonScript}</code>
                </pre>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="font-semibold mb-2">📋 Instructions d'utilisation :</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Installez la dépendance : <code className="bg-muted px-1 rounded">pip install psutil</code></li>
                <li>Copiez le script ci-dessus</li>
                <li>Créez un fichier : <code className="bg-muted px-1 rounded">collect-infra.py</code></li>
                <li>Exécutez : <code className="bg-muted px-1 rounded">python3 collect-infra.py</code></li>
                <li>Récupérez le fichier <code className="bg-muted px-1 rounded">infra-data.json</code> généré</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
