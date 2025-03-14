#!/bin/bash

# Configuración
osdImagePath="/home/tecno/app-player/public/images/OSD/sinred.png"  # Ruta a la imagen

# Verificar si la imagen existe
if [ ! -f "$osdImagePath" ]; then
    echo "Error: La imagen no existe en la ruta especificada: $osdImagePath"
    exit 1
fi

# Mostrar la imagen OSD durante 30 segundos
feh -x -F "$osdImagePath" &
FEH_PID=$!

# Esperar 30 segundos antes de cerrar la imagen
# sleep 30

# Cerrar la ventana de feh
# kill $FEH_PID