#!/bin/bash
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
# ============================================

set -e

OUTPUT_FILE="${1:-infra-data.json}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "🔍 Collecte des informations d'infrastructure..."
echo "   Fichier de sortie: $OUTPUT_FILE"
echo ""

# Fonction pour obtenir une valeur ou "N/A"
get_value() {
    local result
    result=$("$@" 2>/dev/null) || result="N/A"
    echo "$result"
}

# ============================================
# Informations Système de Base
# ============================================
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
# Informations CPU
# ============================================
echo "🔧 Collecte des informations CPU..."

CPU_MODEL=$(get_value cat /proc/cpuinfo | grep "model name" | head -1 | cut -d':' -f2 | xargs)
CPU_CORES=$(get_value nproc)
CPU_THREADS=$(get_value cat /proc/cpuinfo | grep "processor" | wc -l)
CPU_FREQ=$(get_value cat /proc/cpuinfo | grep "cpu MHz" | head -1 | cut -d':' -f2 | xargs)

# Charge système
LOAD_AVG=$(get_value cat /proc/loadavg | cut -d' ' -f1-3)
LOAD_1=$(echo "$LOAD_AVG" | cut -d' ' -f1)
LOAD_5=$(echo "$LOAD_AVG" | cut -d' ' -f2)
LOAD_15=$(echo "$LOAD_AVG" | cut -d' ' -f3)

# ============================================
# Informations Mémoire
# ============================================
echo "💾 Collecte des informations mémoire..."

MEM_TOTAL_KB=$(get_value cat /proc/meminfo | grep "MemTotal" | awk '{print $2}')
MEM_FREE_KB=$(get_value cat /proc/meminfo | grep "MemFree" | awk '{print $2}')
MEM_AVAILABLE_KB=$(get_value cat /proc/meminfo | grep "MemAvailable" | awk '{print $2}')
SWAP_TOTAL_KB=$(get_value cat /proc/meminfo | grep "SwapTotal" | awk '{print $2}')
SWAP_FREE_KB=$(get_value cat /proc/meminfo | grep "SwapFree" | awk '{print $2}')

# Conversion en Go
MEM_TOTAL_GB=$(echo "scale=2; $MEM_TOTAL_KB / 1048576" | bc 2>/dev/null || echo "N/A")
MEM_AVAILABLE_GB=$(echo "scale=2; $MEM_AVAILABLE_KB / 1048576" | bc 2>/dev/null || echo "N/A")
MEM_USED_GB=$(echo "scale=2; ($MEM_TOTAL_KB - $MEM_AVAILABLE_KB) / 1048576" | bc 2>/dev/null || echo "N/A")
SWAP_TOTAL_GB=$(echo "scale=2; $SWAP_TOTAL_KB / 1048576" | bc 2>/dev/null || echo "0")

# ============================================
# Informations Disques
# ============================================
echo "💿 Collecte des informations disques..."

DISK_INFO=$(df -h --output=source,fstype,size,used,avail,pcent,target 2>/dev/null | grep -E "^/dev" | head -20)

# ============================================
# Informations Réseau
# ============================================
echo "🌐 Collecte des informations réseau..."

# Interfaces réseau
NETWORK_INTERFACES=$(ip -j addr 2>/dev/null || echo "[]")

# Ports en écoute
LISTENING_PORTS=$(ss -tlnp 2>/dev/null | grep LISTEN | awk '{print $4}' | sed 's/.*://' | sort -n | uniq | tr '\n' ',' | sed 's/,$//')

# DNS
DNS_SERVERS=$(get_value cat /etc/resolv.conf | grep "^nameserver" | awk '{print $2}' | tr '\n' ',' | sed 's/,$//')

# Passerelle par défaut
DEFAULT_GATEWAY=$(get_value ip route | grep default | awk '{print $3}' | head -1)

# ============================================
# Services Actifs
# ============================================
echo "⚙️  Collecte des services actifs..."

if command -v systemctl &> /dev/null; then
    SERVICES=$(systemctl list-units --type=service --state=running --no-pager --no-legend 2>/dev/null | awk '{print $1}' | sed 's/.service$//' | head -50 | tr '\n' ',' | sed 's/,$//')
else
    SERVICES="systemctl non disponible"
fi

# ============================================
# Conteneurs Docker
# ============================================
echo "🐳 Collecte des informations Docker..."

DOCKER_INSTALLED="false"
DOCKER_CONTAINERS="[]"
DOCKER_IMAGES="[]"

if command -v docker &> /dev/null; then
    DOCKER_INSTALLED="true"
    DOCKER_VERSION=$(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')
    
    # Conteneurs en cours d'exécution
    DOCKER_CONTAINERS=$(docker ps --format '{"name":"{{.Names}}","image":"{{.Image}}","status":"{{.Status}}","ports":"{{.Ports}}"}' 2>/dev/null | jq -s '.' 2>/dev/null || echo "[]")
    
    # Images Docker
    DOCKER_IMAGES=$(docker images --format '{"repository":"{{.Repository}}","tag":"{{.Tag}}","size":"{{.Size}}"}' 2>/dev/null | jq -s '.' 2>/dev/null || echo "[]")
fi

# ============================================
# Packages Installés (principaux)
# ============================================
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
# Utilisateurs et Sécurité
# ============================================
echo "🔐 Collecte des informations sécurité..."

USER_COUNT=$(get_value cat /etc/passwd | wc -l)
SUDO_USERS=$(get_value getent group sudo wheel 2>/dev/null | cut -d':' -f4)
SSH_PORT=$(get_value cat /etc/ssh/sshd_config 2>/dev/null | grep "^Port" | awk '{print $2}')
[ -z "$SSH_PORT" ] && SSH_PORT="22"

# Firewall status
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
# Fichiers de Configuration Importants
# ============================================
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

for config in "${CONFIG_PATHS[@]}"; do
    if [ -f "$config" ]; then
        CONFIG_FILES="$CONFIG_FILES\"$config\","
    fi
done
CONFIG_FILES="[${CONFIG_FILES%,}]"

# ============================================
# Génération du JSON
# ============================================
echo ""
echo "📝 Génération du fichier JSON..."

# Construire le JSON des disques
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
        DISK_JSON="$DISK_JSON{\"device\":\"$device\",\"filesystem\":\"$fstype\",\"size\":\"$size\",\"used\":\"$used\",\"available\":\"$avail\",\"usage_percent\":$percent,\"mount_point\":\"$mount\"},"
    fi
done <<< "$DISK_INFO"
DISK_JSON="${DISK_JSON%,}]"

# Construire le JSON des interfaces réseau simplifié
NETWORK_JSON="["
while IFS= read -r iface; do
    if [ -n "$iface" ] && [ "$iface" != "lo" ]; then
        ip_addr=$(ip -4 addr show "$iface" 2>/dev/null | grep inet | awk '{print $2}' | cut -d'/' -f1 | head -1)
        mac_addr=$(ip link show "$iface" 2>/dev/null | grep ether | awk '{print $2}')
        state=$(ip link show "$iface" 2>/dev/null | grep -oP '(?<=state )\w+')
        NETWORK_JSON="$NETWORK_JSON{\"name\":\"$iface\",\"ip\":\"${ip_addr:-N/A}\",\"mac\":\"${mac_addr:-N/A}\",\"state\":\"${state:-unknown}\"},"
    fi
done <<< "$(ls /sys/class/net 2>/dev/null)"
NETWORK_JSON="${NETWORK_JSON%,}]"

# JSON final
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
    "frequency_mhz": "${CPU_FREQ:-0}",
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
    "listening_ports": "$(echo $LISTENING_PORTS | tr -d '\n')",
    "dns_servers": "$DNS_SERVERS",
    "default_gateway": "$DEFAULT_GATEWAY"
  },
  "services": {
    "running": "$(echo $SERVICES | tr -d '\n')"
  },
  "docker": {
    "installed": $DOCKER_INSTALLED,
    "version": "${DOCKER_VERSION:-null}",
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
echo "   votre documentation d'infrastructure."
