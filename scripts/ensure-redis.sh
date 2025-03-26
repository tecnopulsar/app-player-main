#!/bin/bash

# Script para asegurar que Redis está disponible antes de iniciar la aplicación
# Puede ser agregado a los scripts de inicio del sistema

# Colores para mejorar la legibilidad
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[Redis] Verificando si el servicio Redis está activo...${NC}"

# Verificar si Redis está instalado
if ! command -v redis-server &> /dev/null; then
    echo -e "${RED}[Redis] Redis no está instalado. Instalando...${NC}"
    sudo apt-get update && sudo apt-get install -y redis-server
    if [ $? -ne 0 ]; then
        echo -e "${RED}[Redis] Error al instalar Redis. Por favor, instálelo manualmente.${NC}"
        echo -e "${YELLOW}[Redis] La aplicación continuará en modo de archivo.${NC}"
        exit 1
    fi
    echo -e "${GREEN}[Redis] Redis instalado correctamente.${NC}"
fi

# Verificar si Redis está ejecutándose
if ! systemctl is-active --quiet redis-server; then
    echo -e "${YELLOW}[Redis] El servicio Redis no está activo. Iniciándolo...${NC}"
    sudo systemctl start redis-server
    if [ $? -ne 0 ]; then
        echo -e "${RED}[Redis] Error al iniciar el servicio Redis.${NC}"
        echo -e "${YELLOW}[Redis] La aplicación continuará en modo de archivo.${NC}"
        exit 1
    fi
    echo -e "${GREEN}[Redis] Servicio Redis iniciado correctamente.${NC}"
else
    echo -e "${GREEN}[Redis] El servicio Redis ya está activo.${NC}"
fi

# Verificar si podemos conectarnos a Redis
if ! redis-cli ping > /dev/null 2>&1; then
    echo -e "${RED}[Redis] No se puede conectar a Redis.${NC}"
    echo -e "${YELLOW}[Redis] Intentando reiniciar el servicio...${NC}"
    sudo systemctl restart redis-server
    sleep 2
    if ! redis-cli ping > /dev/null 2>&1; then
        echo -e "${RED}[Redis] No se pudo restablecer la conexión a Redis.${NC}"
        echo -e "${YELLOW}[Redis] La aplicación continuará en modo de archivo.${NC}"
        exit 1
    fi
    echo -e "${GREEN}[Redis] Conexión a Redis restablecida después de reiniciar.${NC}"
else
    echo -e "${GREEN}[Redis] Conexión a Redis verificada correctamente (PONG).${NC}"
fi

# Verificar la configuración de Redis
echo -e "${BLUE}[Redis] Verificando configuración de Redis...${NC}"
REDIS_CONFIG_DIR="/home/tecno/app-player/src/config"
REDIS_CONFIG_FILE="${REDIS_CONFIG_DIR}/redis.conf"
REDIS_DATA_DIR="/home/tecno/app-player/redis-data"  # Nueva ubicación para los datos de Redis

if [ -f "$REDIS_CONFIG_FILE" ]; then
    # Verificar y ajustar la configuración de memoria máxima si es muy baja
    MAX_MEMORY=$(grep -oP "^maxmemory\s+\K\d+" "$REDIS_CONFIG_FILE" || echo "0")
    if [ "$MAX_MEMORY" -lt "67108864" ]; then  # 64MB mínimo
        echo -e "${YELLOW}[Redis] La configuración de memoria máxima es muy baja o no está configurada.${NC}"
        echo -e "${YELLOW}[Redis] Configurando maxmemory a 128MB...${NC}"
        sudo sed -i '/^maxmemory/d' "$REDIS_CONFIG_FILE"
        echo "maxmemory 134217728" | sudo tee -a "$REDIS_CONFIG_FILE" > /dev/null
        echo "maxmemory-policy allkeys-lru" | sudo tee -a "$REDIS_CONFIG_FILE" > /dev/null
        sudo systemctl restart redis-server
        echo -e "${GREEN}[Redis] Configuración de memoria actualizada.${NC}"
    else
        echo -e "${GREEN}[Redis] Configuración de memoria correcta.${NC}"
    fi
else
    echo -e "${YELLOW}[Redis] Archivo de configuración no encontrado en ${REDIS_CONFIG_FILE}.${NC}"
    echo -e "${YELLOW}[Redis] Usando configuración por defecto.${NC}"
fi

# Asegurarse de que el directorio de datos exista
if [ ! -d "$REDIS_DATA_DIR" ]; then
    echo -e "${YELLOW}[Redis] Creando directorio de datos en ${REDIS_DATA_DIR}.${NC}"
    sudo mkdir -p "$REDIS_DATA_DIR"
    sudo chown redis:redis "$REDIS_DATA_DIR"
fi

echo -e "${GREEN}[Redis] Redis está listo para ser utilizado por la aplicación.${NC}"
exit 0 