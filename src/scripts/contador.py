import time
from gpiozero import LED, Button

from gpiozero import Device
from gpiozero.pins.native import NativeFactory

# Restablecer la configuración del pin GPIO
Device.pin_factory = NativeFactory()  # Esto reinicia el pin y lo libera


# Configurar el LED en el GPIO 16
led = LED(16)

# Configurar el pulsador en el GPIO 12
button = Button(12)

# Variable para controlar si el botón debe ser ignorado
ignore_button = False

# Función para cambiar el estado del LED
def toggle_led():
    if led.is_lit:  # Si el LED está encendido
        led.off()   # Apagar el LED
    else:          # Si el LED está apagado
        led.on()    # Encender el LED

# Asignar la función toggle_led al evento de pulsación del botón
button.when_pressed = toggle_led

def start_timer():
    print("Iniciando contador de 5 segundos...")
    led.on()  # Encender el LED
    time.sleep(10)  # Esperar 10 segundos
    led.off()  # Apagar el LED
    print("¡Tiempo cumplido!")

    # Limpiar las pulsaciones no procesadas
    while button.is_pressed:  # Esperar a que el botón no esté presionado
        pass

if __name__ == "__main__":
    start_timer()