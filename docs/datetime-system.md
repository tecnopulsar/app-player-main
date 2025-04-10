# Funcionalidades de Ajuste de Fecha y Hora

Esta documentación describe las funcionalidades de ajuste de fecha y hora implementadas en el App Player.

## API de Fecha y Hora

El sistema proporciona una API para controlar la fecha y hora del sistema, lo que permite sincronizar los relojes entre la app controladora y el App Player.

### Endpoints

#### Obtener Fecha y Hora Actual
- **URL**: `/api/system/datetime`
- **Método**: `GET`
- **Descripción**: Obtiene la fecha y hora actual del sistema, junto con la configuración de zona horaria y el estado de NTP
- **Respuesta exitosa**: `200 OK`
  ```json
  {
    "success": true,
    "datetime": {
      "current": "2025-04-10T15:01:35.160Z",
      "localtime": "Thu Apr 10 2025 12:01:35 GMT-0300 (Argentina Standard Time)",
      "timestamp": 1744297295,
      "timezone": "Time zone: America/Argentina/Buenos_Aires (-03, -0300)",
      "ntpStatus": "NTP service: active"
    }
  }
  ```

#### Establecer Fecha y Hora
- **URL**: `/api/system/datetime`
- **Método**: `POST`
- **Descripción**: Establece una nueva fecha y hora para el sistema
- **Cuerpo de la solicitud**:
  ```json
  {
    "datetime": "2023-04-15T14:35:00Z",
    "timezone": "America/Santiago"
  }
  ```
- **Respuesta exitosa**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Fecha y hora actualizadas correctamente",
    "datetime": {
      "current": "2023-04-15T14:35:00.000Z",
      "localtime": "Sat Apr 15 2023 11:35:00 GMT-0300 (Chile Standard Time)",
      "timestamp": 1681565700,
      "timezone": "Time zone: America/Santiago (CLST, -0300)",
      "ntpStatus": "NTP service: active"
    }
  }
  ```

#### Activar o Desactivar NTP
- **URL**: `/api/system/datetime/ntp`
- **Método**: `POST`
- **Descripción**: Activa o desactiva la sincronización automática de fecha y hora mediante NTP
- **Cuerpo de la solicitud**:
  ```json
  {
    "enabled": true
  }
  ```
- **Respuesta exitosa**: `200 OK`
  ```json
  {
    "success": true,
    "message": "NTP activado correctamente",
    "ntpEnabled": true
  }
  ```

#### Sincronizar con NTP
- **URL**: `/api/system/datetime/sync`
- **Método**: `POST`
- **Descripción**: Fuerza una sincronización inmediata con un servidor NTP
- **Respuesta exitosa**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Sincronización con servidor NTP iniciada",
    "timestamp": "2023-04-15T14:40:00.000Z"
  }
  ```

## Interfaz de Usuario

La interfaz de usuario proporciona una forma sencilla de ver y ajustar la fecha y hora del sistema.

### Panel de Fecha y Hora

El panel de fecha y hora se divide en dos secciones principales:

1. **Fecha y Hora Actual**
   - Muestra la fecha y hora actual del sistema en un formato legible
   - Indica la zona horaria configurada
   - Muestra el estado de la sincronización NTP (activa/inactiva)

2. **Ajustar Fecha y Hora**
   - Permite seleccionar una nueva fecha y hora
   - Permite cambiar la zona horaria
   - Permite activar o desactivar la sincronización NTP
   - Proporciona botones para aplicar los cambios o sincronizar inmediatamente

### Funcionalidades

1. **Visualización en Tiempo Real**
   - La fecha y hora actual se actualiza automáticamente cada minuto
   - El botón de actualización permite refrescar manualmente la información

2. **Ajuste Manual**
   - Selector de fecha y hora con formato estándar
   - Lista de zonas horarias comunes
   - Botón para aplicar los cambios inmediatamente

3. **Sincronización NTP**
   - Interruptor para activar/desactivar NTP
   - Botón para forzar la sincronización inmediata
   - Indicador visual del estado de NTP

4. **Notificaciones**
   - Mensajes de éxito al realizar cambios
   - Mensajes de error cuando ocurre algún problema
   - Mensajes de advertencia para acciones incompletas

## Casos de Uso

### Sincronización entre Dispositivos

El ajuste de fecha y hora es crucial para la correcta sincronización entre el App Player y la aplicación controladora. Algunos escenarios donde esto es importante:

1. **Programación de Reproducción**
   - Las programaciones de reproducción dependen de la hora del sistema
   - La sincronización asegura que las reproducciones comiencen a la hora correcta

2. **Registros de Eventos**
   - Los registros de eventos incluyen marcas de tiempo
   - La sincronización permite correlacionar eventos entre dispositivos

3. **Validación de Licencias**
   - Algunas licencias y permisos tienen validación temporal
   - La sincronización evita problemas de validación por desajustes horarios

### Modos de Ajuste

Existen dos modos principales para ajustar la fecha y hora:

1. **Ajuste Manual**
   - Ideal para entornos sin conexión a Internet
   - Útil para sincronizar múltiples dispositivos a una misma hora arbitraria
   - Aplicable en zonas con restricciones de conectividad

2. **Sincronización NTP**
   - Recomendada cuando hay conexión a Internet
   - Mantiene todos los dispositivos sincronizados automáticamente
   - Compensa automáticamente el desfase de relojes

## Recomendaciones

1. **Uso General**
   - Mantener NTP activo siempre que sea posible
   - Verificar periódicamente la sincronización en entornos críticos
   - Configurar la zona horaria correcta para el lugar de operación

2. **Entornos sin Internet**
   - Designar un dispositivo como "maestro" de tiempo
   - Sincronizar todos los demás dispositivos con este maestro
   - Verificar la sincronización manualmente a intervalos regulares

3. **Solución de Problemas**
   - Si hay problemas con la programación, verificar primero la sincronización horaria
   - En caso de desfases persistentes, revisar la configuración del reloj de hardware
   - Documentar los ajustes realizados para referencia futura 