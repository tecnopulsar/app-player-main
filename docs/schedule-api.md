# API de Agenda de Reproducción

Esta documentación describe las funcionalidades de la API de agenda de reproducción para el App Player.

## Endpoints

### Gestión de Programaciones

#### Crear una Programación
- **URL**: `/api/schedules`
- **Método**: `POST`
- **Descripción**: Crea una nueva programación de reproducción
- **Cuerpo de la solicitud**:
  ```json
  {
    "name": "Programación de la mañana",
    "description": "Reproducción de música para la mañana",
    "playlist": "playlist_manana.m3u",
    "startTime": "2023-04-10T08:00:00Z",
    "endTime": "2023-04-10T12:00:00Z",
    "daysOfWeek": [1, 2, 3, 4, 5],
    "isActive": true
  }
  ```
- **Respuesta exitosa**: `201 Created`
  ```json
  {
    "id": 1,
    "name": "Programación de la mañana",
    "description": "Reproducción de música para la mañana",
    "playlist": "playlist_manana.m3u",
    "startTime": "2023-04-10T08:00:00Z",
    "endTime": "2023-04-10T12:00:00Z",
    "daysOfWeek": [1, 2, 3, 4, 5],
    "isActive": true,
    "createdAt": "2023-04-10T10:00:00Z",
    "updatedAt": "2023-04-10T10:00:00Z"
  }
  ```

#### Obtener Todas las Programaciones
- **URL**: `/api/schedules`
- **Método**: `GET`
- **Descripción**: Obtiene todas las programaciones
- **Parámetros de consulta**:
  - `limit`: Número máximo de resultados (por defecto: 100)
  - `offset`: Número de resultados a omitir (por defecto: 0)
  - `isActive`: Filtrar por estado activo/inactivo
- **Respuesta exitosa**: `200 OK`
  ```json
  [
    {
      "id": 1,
      "name": "Programación de la mañana",
      "description": "Reproducción de música para la mañana",
      "playlist": "playlist_manana.m3u",
      "startTime": "2023-04-10T08:00:00Z",
      "endTime": "2023-04-10T12:00:00Z",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "isActive": true,
      "createdAt": "2023-04-10T10:00:00Z",
      "updatedAt": "2023-04-10T10:00:00Z"
    }
  ]
  ```

#### Obtener una Programación por ID
- **URL**: `/api/schedules/:id`
- **Método**: `GET`
- **Descripción**: Obtiene una programación específica por su ID
- **Respuesta exitosa**: `200 OK`
  ```json
  {
    "id": 1,
    "name": "Programación de la mañana",
    "description": "Reproducción de música para la mañana",
    "playlist": "playlist_manana.m3u",
    "startTime": "2023-04-10T08:00:00Z",
    "endTime": "2023-04-10T12:00:00Z",
    "daysOfWeek": [1, 2, 3, 4, 5],
    "isActive": true,
    "createdAt": "2023-04-10T10:00:00Z",
    "updatedAt": "2023-04-10T10:00:00Z",
    "executions": []
  }
  ```

#### Actualizar una Programación
- **URL**: `/api/schedules/:id`
- **Método**: `PUT`
- **Descripción**: Actualiza una programación existente
- **Cuerpo de la solicitud**:
  ```json
  {
    "name": "Programación de la mañana actualizada",
    "isActive": false
  }
  ```
- **Respuesta exitosa**: `200 OK`
  ```json
  {
    "id": 1,
    "name": "Programación de la mañana actualizada",
    "description": "Reproducción de música para la mañana",
    "playlist": "playlist_manana.m3u",
    "startTime": "2023-04-10T08:00:00Z",
    "endTime": "2023-04-10T12:00:00Z",
    "daysOfWeek": [1, 2, 3, 4, 5],
    "isActive": false,
    "createdAt": "2023-04-10T10:00:00Z",
    "updatedAt": "2023-04-10T10:30:00Z"
  }
  ```

#### Eliminar una Programación
- **URL**: `/api/schedules/:id`
- **Método**: `DELETE`
- **Descripción**: Elimina una programación existente
- **Respuesta exitosa**: `204 No Content`

### Ejecución de Programaciones

#### Obtener Programaciones Activas
- **URL**: `/api/schedules/active`
- **Método**: `GET`
- **Descripción**: Obtiene las programaciones activas para la fecha actual
- **Respuesta exitosa**: `200 OK`
  ```json
  [
    {
      "id": 1,
      "name": "Programación de la mañana",
      "description": "Reproducción de música para la mañana",
      "playlist": "playlist_manana.m3u",
      "startTime": "2023-04-10T08:00:00Z",
      "endTime": "2023-04-10T12:00:00Z",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "isActive": true,
      "createdAt": "2023-04-10T10:00:00Z",
      "updatedAt": "2023-04-10T10:00:00Z"
    }
  ]
  ```

#### Ejecutar una Programación
- **URL**: `/api/schedules/:id/execute`
- **Método**: `POST`
- **Descripción**: Ejecuta una programación específica
- **Respuesta exitosa**: `200 OK`
  ```json
  {
    "id": 1,
    "scheduleId": 1,
    "startTime": "2023-04-10T10:35:00Z",
    "endTime": null,
    "status": "running",
    "playlist": "playlist_manana.m3u",
    "createdAt": "2023-04-10T10:35:00Z",
    "updatedAt": "2023-04-10T10:35:00Z"
  }
  ```

#### Obtener Ejecuciones Recientes
- **URL**: `/api/schedules/executions/recent`
- **Método**: `GET`
- **Descripción**: Obtiene las ejecuciones recientes
- **Parámetros de consulta**:
  - `limit`: Número máximo de resultados (por defecto: 10)
- **Respuesta exitosa**: `200 OK`
  ```json
  [
    {
      "id": 1,
      "scheduleId": 1,
      "startTime": "2023-04-10T10:35:00Z",
      "endTime": "2023-04-10T10:40:00Z",
      "status": "completed",
      "playlist": "playlist_manana.m3u",
      "createdAt": "2023-04-10T10:35:00Z",
      "updatedAt": "2023-04-10T10:40:00Z",
      "schedule": {
        "id": 1,
        "name": "Programación de la mañana",
        "description": "Reproducción de música para la mañana",
        "playlist": "playlist_manana.m3u",
        "startTime": "2023-04-10T08:00:00Z",
        "endTime": "2023-04-10T12:00:00Z",
        "daysOfWeek": [1, 2, 3, 4, 5],
        "isActive": true,
        "createdAt": "2023-04-10T10:00:00Z",
        "updatedAt": "2023-04-10T10:00:00Z"
      }
    }
  ]
  ```

## Códigos de Error

- `400 Bad Request`: Error en los datos de la solicitud
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error interno del servidor

## Notas

- Las fechas deben estar en formato ISO 8601
- Los días de la semana se representan como números del 0 al 6 (0 = domingo, 1 = lunes, etc.)
- El estado de una programación puede ser `active` o `inactive`
- El estado de una ejecución puede ser `pending`, `running`, `completed` o `failed` 