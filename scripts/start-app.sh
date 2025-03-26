#!/bin/bash

# Script para iniciar la aplicación con soporte para Redis
# Primero verifica que Redis esté disponible y luego inicia la aplicación

# Directorio de la aplicación (directorio actual)
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$APP_DIR"

# Colores para mejorar la legibilidad
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Iniciando App Player...${NC}"

# Verificar y asegurar que Redis está disponible
echo -e "${BLUE}Verificando Redis...${NC}"
if [ -f "$APP_DIR/scripts/ensure-redis.sh" ]; then
    "$APP_DIR/scripts/ensure-redis.sh"
    REDIS_STATUS=$?
    if [ $REDIS_STATUS -ne 0 ]; then
        echo -e "${YELLOW}Redis no está disponible. La aplicación funcionará en modo de archivo.${NC}"
    fi
else
    echo -e "${YELLOW}Script ensure-redis.sh no encontrado. Omitiendo verificación de Redis.${NC}"
fi

# Verificar si hay una variable de entorno DISPLAY disponible
if [ -z "$DISPLAY" ]; then
    echo -e "${YELLOW}Variable DISPLAY no configurada. Estableciendo DISPLAY=:0${NC}"
    export DISPLAY=:0
fi

# Iniciar la aplicación
echo -e "${GREEN}Iniciando la aplicación...${NC}"
npm start -- --no-sandbox

# Verificar si la aplicación se inició correctamente
if [ $? -ne 0 ]; then
    echo -e "${RED}Error al iniciar la aplicación.${NC}"
    exit 1
fi

echo -e "${GREEN}Aplicación iniciada correctamente.${NC}"
exit 0 