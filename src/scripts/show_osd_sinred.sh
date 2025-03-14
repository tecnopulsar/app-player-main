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
FEH_PID=$!  # Capturar el PID del proceso de feh

sleep 5000

# Guardar el PID en un archivo para poder matar el proceso más tarde
# echo $FEH_PID > /home/tecno/app-player/tmp/feh_osd.pid

# Terminar el script después de iniciar feh
# exit 0