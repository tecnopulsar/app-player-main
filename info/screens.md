# WayLand

## Pantalla fisica 55"
    HDMI-A-1
    Active
    1920x1080
    60Hz
    Normal
remota VNC
## Pantalla 
    NOOP-1
    Active
    1920x1080
    60Hz
    Normal

HDMI-A-1:

Es el identificador de una pantalla conectada físicamente a través de un puerto HDMI.
Puedes configurar su resolución, posición, rotación, etc.

NOOP-1:

Es un identificador que suele representar una pantalla virtual o inactiva.
No puedes configurar propiedades como resolución o posición en una pantalla NOOP, ya que no está activa.
    
$ wlr-randr
NOOP-1 "Headless output 1"
  Enabled: yes
  Modes:
    1920x1080 px, 60.000000 Hz (current)
  Position: 0,0
  Transform: normal
  Scale: 1.000000

$ wlr-randr
HDMI-A-1 "Samsung Electric Company SyncMaster H1AK500000 (HDMI-A-1)"
  Physical size: 1110x620 mm
  Enabled: yes
  Modes:
    720x400 px, 70.082001 Hz
    640x480 px, 59.939999 Hz
    640x480 px, 60.000000 Hz
    640x480 px, 66.667000 Hz
    640x480 px, 72.808998 Hz
    640x480 px, 75.000000 Hz
    720x480 px, 59.939999 Hz
    720x480 px, 60.000000 Hz
    720x576 px, 50.000000 Hz
    800x600 px, 60.317001 Hz
    800x600 px, 72.188004 Hz
    800x600 px, 75.000000 Hz
    832x624 px, 74.551003 Hz
    1024x768 px, 60.004002 Hz
    1024x768 px, 70.069000 Hz
    1024x768 px, 75.028999 Hz
    1280x720 px, 50.000000 Hz
    1280x720 px, 59.939999 Hz
    1280x720 px, 60.000000 Hz
    1280x720 px, 60.000000 Hz
    1152x864 px, 75.000000 Hz
    1280x800 px, 59.910000 Hz
    1440x900 px, 59.901001 Hz
    1280x1024 px, 60.020000 Hz
    1280x1024 px, 75.025002 Hz
    1600x900 px, 60.000000 Hz
    1680x1050 px, 59.882999 Hz
    1920x1080 px, 23.976000 Hz
    1920x1080 px, 24.000000 Hz
    1920x1080 px, 25.000000 Hz
    1920x1080 px, 29.969999 Hz
    1920x1080 px, 30.000000 Hz
    1920x1080 px, 50.000000 Hz
    1920x1080 px, 59.939999 Hz
    1920x1080 px, 60.000000 Hz
    1920x1080 px, 60.000000 Hz (current)
    3840x2160 px, 23.976000 Hz
    3840x2160 px, 24.000000 Hz
    3840x2160 px, 25.000000 Hz
    3840x2160 px, 29.969999 Hz
    3840x2160 px, 30.000000 Hz
    4096x2160 px, 23.976000 Hz
    4096x2160 px, 24.000000 Hz
    4096x2160 px, 25.000000 Hz
    4096x2160 px, 29.969999 Hz
    4096x2160 px, 30.000000 Hz
    3840x2160 px, 30.000000 Hz (preferred)
  Position: 0,0
  Transform: normal
  Scale: 1.000000

# Configurar una pantalla
### Cambiar la resolución de HDMI-A-1:
```wlr-randr --output HDMI-A-1 --mode 1920x1080```

### Posicionar HDMI-A-1 a la derecha de otra pantalla:
```wlr-randr --output HDMI-A-1 --pos 1920,0```

### Desactivar HDMI-A-1:
```wlr-randr --output HDMI-A-1 --off```

### Activar HDMI-A-1:
```wlr-randr --output HDMI-A-1 --on```