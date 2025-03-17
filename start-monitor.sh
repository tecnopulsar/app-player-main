#!/bin/bash

# chmod +x start-monitor.sh
# ./start-monitor.sh
# ./start-monitor.sh --port 3001
# tail -f monitor.log

# Configuración inicial
DEFAULT_PORT=3001
SERVER_PATH="src/servers/monitorServer.mjs"
LOG_FILE="monitor.log"

# Colores para mensajes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # Sin color

# Manejar Ctrl+C para limpiar la salida
trap "echo -e '\n${BLUE}=== Servidor detenido ===${NC}'; exit" SIGINT

# Verificar dependencias
check_dependencies() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js no está instalado. Instálalo con:"
        echo -e "  sudo apt install nodejs${NC}"
        exit 1
    fi

    if [ ! -d "src" ]; then
        echo -e "${RED}Error: No se encuentra el directorio 'src'${NC}"
        exit 1
    fi

    if [ ! -f "$SERVER_PATH" ]; then
        echo -e "${RED}Error: No se encuentra el archivo $SERVER_PATH${NC}"
        exit 1
    fi
}

# Mostrar ayuda
show_help() {
    echo -e "${GREEN}Uso: $0 [--port <número>] [--help]${NC}"
    echo "  --port   Especifica el puerto (default: 3001)"
    echo "  --help   Muestra este mensaje"
    echo -e "\n${YELLOW}Nota: Este servidor simula la app controladora para debug${NC}"
    exit 0
}

# Procesar parámetros
while [[ $# -gt 0 ]]; do
    case $1 in
        --port)
            DEFAULT_PORT=$2
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            echo -e "${RED}Parámetro desconocido: $1${NC}"
            exit 1
            ;;
    esac
    shift
done

# Iniciar servidor
start_server() {
    echo -e "\n${BLUE}=== Servidor de Monitoreo (Puerto: $DEFAULT_PORT) ===${NC}"
    echo -e "${YELLOW}Modo: Simulación de App Controladora${NC}"
    echo -e "${GREEN}Logs guardados en: $LOG_FILE${NC}"
    echo -e "${BLUE}Presiona Ctrl+C para detener${NC}\n"
    
    # Ejecutar y guardar logs
    node "$SERVER_PATH" $DEFAULT_PORT >> "$LOG_FILE" 2>&1
}

# Ejecutar flujo principal
check_dependencies
start_server