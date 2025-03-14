
const heartbeatInterval = 25000; // 60 segundos

const sendHeartbeat = async (adminSocket) => {
  try {
    // Recuperar el estado de VLC
    const statusXml = await vlcRequest('status');
    // Parsear el XML completo
    const parsedXml = await parseStringPromise(statusXml);
    // Envía todo el contenido del XML parseado
    const vlcStatusInfo = parsedXml.root;

    // Emitir el heartbeat con el estado de reproducción incluido
    adminSocket.emit('heartbeat', {
      id: device.id,
      status: true,
      playlistState: vlcStatusInfo, // Estado de reproducción actual
    });

    console.log('Emit heartbeat and status of playlist');
  } catch (err) {
    console.error(
      `Error al capturar/enviar heartbeat and status: ${err.message}`
    );
  }
};

const realTimeState = () => {
  const adminSocket = io(device.urlServer);

  adminSocket.on('connect', () => {
    console.log('Connected to admin server');
    adminSocket.emit('AUTHENTICATE', device);
  });

  adminSocket.on('AUTH_SUCCESS', ({ id, name }) => {
    device.id = id;
    device.name = name;

    // Emitir heartbeat y snapshot periódicamente
    let lastHeartbeatTime = Date.now();
    setInterval(() => {
      // Verificar si el socket está conectado
      if (adminSocket.connected) {
        const now = Date.now();
        console.log(`Time since last heartbeat: ${now - lastHeartbeatTime}ms`);
        lastHeartbeatTime = now;
        sendHeartbeat(adminSocket);
      } else {
        console.log('Socket no conectado. No se enviará heartbeat.');
      }
    }, heartbeatInterval);
  });

  adminSocket.on('disconnect', () => {
    console.log('Disconnected from admin server');

    // Detener el envío de heartbeats cuando se desconecte
    if (intervalId) {
      clearInterval(intervalId);
      console.log('Heartbeat interval cleared.');
    }
  });
};

//----------------------------------------------------------------

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, directorioVideos),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// Watcher para directorios
const debouncedHandleDirAdd = debounce((dirPath) => {
  console.log(`Directorio añadido: ${dirPath}`);
}, 500);

const debouncedHandleDirRemove = debounce((dirPath) => {
  console.log(`Directorio eliminado: ${dirPath}`);
}, 500);

const watcher = chokidar.watch(directorioVideos, {
  persistent: true,
  ignoreInitial: true,
  ignored: /(^|[\/\\])\../,
  depth: 99,
});

watcher.on('addDir', debouncedHandleDirAdd);
watcher.on('unlinkDir', debouncedHandleDirRemove);
watcher.on('error', (error) => console.log(`Watcher error: ${error}`));

// Rutas
// Variables globales
let previewPlaylistDirPath = null;
let currentPlaylistDirPath = null;
let playlistDirPath = null;
let playlistDirName = null;
let playlistPath = null;
let playlistName = null;
let IndexCountFilesInDirPlaylist = 0;
let countPlaylistItems = null;
let activePlaylistName = null;
let newFileMP4Path = null;
let newFileMP4Name = null;

const loadInitialPlaylist = async () => {
  try {
    const dirsInDirectorioVideos = await fs.promises.readdir(directorioVideos);

    if (dirsInDirectorioVideos.length === 0) {
      console.log(
        'No hay directorios en el directorio de videos. Usando la playlist por defecto.'
      );
      playlistPath =
        '/home/tecno/Public/VideosDefecto/playlistDefecto/playlistDefecto.m3u';

      if (!fs.existsSync(playlistPath)) {
        console.error('La playlist por defecto no existe.');
        return;
      }
    } else {
      console.log('Carpeta de inicio');
      // ---------------------------------------------------------------------
      const latestDirInDirectorioVideos = dirsInDirectorioVideos
        .map((dir) => {
          const dirPath = path.join(directorioVideos, dir);
          const stats = fs.statSync(dirPath);

          // Si no es un directorio, eliminarlo y continuar
          if (!stats.isDirectory()) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`Archivo eliminado: ${dirPath}`);
            return null; // Filtrar este elemento
          }

          return {
            name: dir,
            time: stats.mtime.getTime(),
          };
        })
        .filter(Boolean) // Elimina los elementos nulos
        .sort((a, b) => b.time - a.time)[0]?.name;

      if (latestDirInDirectorioVideos) {
        const playlistDirFilesAll = await fs.promises.readdir(
          path.join(directorioVideos, latestDirInDirectorioVideos)
        );
        // Resto del código...
        const playlistM3uName = playlistDirFilesAll.find((file) =>
          file.endsWith('.m3u')
        );
        console.log(playlistDirFilesAll, playlistM3uName);
        if (!playlistM3uName) {
          console.error(
            `No se encontró un archivo .m3u en ${latestDirInDirectorioVideos}`
          );
          return;
        }
        playlistDirPath = path.join(
          directorioVideos,
          latestDirInDirectorioVideos
        );
        playlistPath = path.join(playlistDirPath, playlistM3uName);

        previewPlaylistDirPath = currentPlaylistDirPath;
        currentPlaylistDirPath = playlistDirPath;
        console.log('Playlist cargada en Else: ', playlistPath);
      } else {
        console.log(
          'No se encontraron directorios válidos en directorioVideos.'
        );
      }
    }

    console.log('Playlist cargada: ', playlistPath);
    await sendPlaylistRequest(playlistPath);
  } catch (err) {
    console.error(`Error al cargar la playlist inicial: ${err.message}`);
  }
};

app.post('/receive', upload.single('file'), async (req, res) => {
  const file = req.file;
  const playlistNameFromRequest =
    req.body.playlistName || `playlist_${Date.now()}`;
  countPlaylistItems = parseInt(req.body.countPlaylistItems, 10) || 1;

  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  if (IndexCountFilesInDirPlaylist === 0 || !activePlaylistName) {
    activePlaylistName = playlistNameFromRequest.endsWith('.m3u')
      ? playlistNameFromRequest
      : `${playlistNameFromRequest}.m3u`;
  }

  playlistDirName = activePlaylistName.replace('.m3u', '');
  playlistDirPath = path.join(directorioVideos, playlistDirName);

  if (IndexCountFilesInDirPlaylist === 0) {
    previewPlaylistDirPath = currentPlaylistDirPath;
    currentPlaylistDirPath = playlistDirPath;
  }

  try {
    if (!fs.existsSync(playlistDirPath)) {
      fs.mkdirSync(playlistDirPath, { recursive: true });
    }

    const newFileMP4Path = path.join(playlistDirPath, file.originalname);
    fs.renameSync(file.path, newFileMP4Path);

    const newPlaylistM3uPath = path.join(playlistDirPath, activePlaylistName);
    if (!fs.existsSync(newPlaylistM3uPath)) {
      fs.writeFileSync(newPlaylistM3uPath, `#EXTM3U\n${newFileMP4Path}\n`);
    } else {
      fs.appendFileSync(newPlaylistM3uPath, `${newFileMP4Path}\n`);
    }

    console.log(
      'Datos del request device-playlist\n',
      'Rutas: ',
      'old: ',
      previewPlaylistDirPath,
      '- new: ',
      currentPlaylistDirPath,
      'Activeplaylist: ',
      activePlaylistName,
      '\n',
      'newFileMP4Path: ',
      newFileMP4Path,
      '\n',
      'newPlaylistM3uPath: ',
      newPlaylistM3uPath,
      '\n'
    );

    IndexCountFilesInDirPlaylist++;

    console.log(
      'Indice de carga, (total) a (loop):',
      file.originalname,
      '//',
      '(',
      countPlaylistItems,
      ')',
      ' loop: ',
      IndexCountFilesInDirPlaylist,
      '\n'
    );

    if (IndexCountFilesInDirPlaylist === countPlaylistItems) {
      console.log('Ejecutar playlist: ', newPlaylistM3uPath, '\n');
      await sendPlaylistRequest(newPlaylistM3uPath);

      fs.readdir(directorioVideos, (err, dirs) => {
        if (err) {
          console.error(`Error al leer el directorio: ${err.message}`);
          return;
        }
        console.log(
          'Directorios: ',
          dirs,
          '\n',
          ' no borrar: ',
          playlistDirName
        );
        dirs.forEach((dir) => {
          const dirPath = path.join(directorioVideos, dir);
          if (fs.statSync(dirPath).isDirectory() && dir !== playlistDirName) {
            console.log(`Borrar: ${dirPath}`);
            fs.rmSync(dirPath, { recursive: true, force: true });
          }
        });
      });

      IndexCountFilesInDirPlaylist = 0;
      activePlaylistName = null;

      res.send('Playlist procesada correctamente');
    } else {
      res.send('Archivo procesado correctamente');
    }
  } catch (err) {
    console.error(`Error al procesar el archivo: ${err}`);
    res.status(500).send(`Error al procesar el archivo: ${err.message}`);
  }
});

const sendPlaylistRequest = async (playlistPath) => {
  console.log('playlist a ejecutar: ', playlistPath);
  try {
    const response = await axios.post('http://localhost:3000/playlist', {
      playlistPath,
    });
    console.log('Respuesta del servidor:', response.data);
  } catch (error) {
    console.error('Error al enviar la solicitud:', error.message);
    if (error.response) {
      console.error('Código de estado:', error.response.status);
      console.error('Datos de error:', error.response.data);
    }
  }
};


app.post('/playlist', async (req, res) => {
  const { playlistPath } = req.body;
  const fullPath = `${playlistPath}`;
  try {
    await vlcRequest('pl_empty');
    await vlcRequest(`in_play&input=file://${fullPath}`);
    res.send('Playlist changed');
  } catch (error) {
    console.error(`Error changing playlist: ${error.message}`);
    res.status(500).send('Error changing playlist');
  }
});

app.get('/snapshot', async (req, res) => {
  try {
    // Capturar el snapshot
    await vlcRequest('snapshot');

    // Obtener la captura de pantalla más reciente
    const recentScreenshot = getMostRecentScreenshot();

    if (!recentScreenshot) {
      return res
        .status(404)
        .send('No se encontró un archivo de captura de pantalla.');
    }

    // Renombrar el archivo de captura de pantalla más reciente a "snapshot.png"
    const newScreenshotPath = renameScreenshot(recentScreenshot);

    // Enviar el archivo snapshot al servidor
    await uploadScreenshot(newScreenshotPath);

    // Responder con el nombre del archivo
    res.json({ fileName: 'snapshot.png' });

    console.log(`Recupero del snapshot del device: ${device.name}`);
  } catch (err) {
    console.error(`Error al capturar el snapshot: ${err.message}`);
    res.status(500).send(`Error al capturar el snapshot: ${err.message}`);
  }
});

app.post('/osd_message', (req, res) => {
  const { message } = req.body;
  const osdImagePath = path.join(
    process.cwd(),
    'Public',
    'OSD',
    'osd_image.png'
  );

  // Comando para crear la imagen OSD
  const convertCommand = `convert -background black -fill white -gravity center -size 384x216 caption:"${message}" ${osdImagePath}`;

  try {
    // Ejecutar el comando de creación de imagen OSD
    exec(convertCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al crear la imagen OSD: ${error.message}`);
        return res.status(500).json({ error: 'Error al crear la imagen OSD' });
      }

      // Ejecutar feh para mostrar la imagen OSD
      const displayProcess = exec(
        `feh -x ${osdImagePath}`,
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Error al mostrar la imagen OSD: ${error.message}`);
          } else {
            console.log('Imagen OSD se cerrada después de 30 segundos');
          }
        }
      );

      // Después de 30 segundos, matar todos los procesos feh
      setTimeout(() => {
        exec('pkill feh', (error) => {
          if (error) {
            console.error(`Error al cerrar feh: ${error.message}`);
          } else {
            console.log('Imagen OSD cerrada después de 30 segundos');
          }
        });
      }, 30000);

      // Enviar respuesta al cliente
      res.status(200).json({ message: 'Imagen OSD mostrada con éxito' });
    });
  } catch (error) {
    console.error(`Error general: ${error.message}`);
    res.status(500).json({ error: 'Error en la ejecución de comandos' });
  }
});

/**
 * Obtiene el archivo de captura de pantalla más reciente en el directorio.
 */
const getMostRecentScreenshot = () => {
  const files = fs.readdirSync(BASE_SCREENSHOT_PATH);

  return files
    .filter((file) => file.endsWith('.png'))
    .map((file) => ({
      file,
      time: fs.statSync(path.join(BASE_SCREENSHOT_PATH, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time)[0]?.file;
};

/**
 * Renombra la captura de pantalla más reciente a "snapshot.png".
 */
const renameScreenshot = (snapshotFileName) => {
  const oldPath = path.join(BASE_SCREENSHOT_PATH, snapshotFileName);
  const newPath = path.join(BASE_SCREENSHOT_PATH, 'snapshot.png');
  fs.renameSync(oldPath, newPath);
  return newPath;
};

/**
 * Sube la captura de pantalla al servidor.
 */
const uploadScreenshot = async (screenshotPath) => {
  const form = new FormData();
  form.append('file', fs.createReadStream(screenshotPath), 'snapshot.png');
  form.append('snapshotName', 'snapshot.png');
  form.append('deviceId', device.id);

  const headers = form.getHeaders();
  await axios.post(`http://192.168.1.3:3001/snapshot`, form, {
    headers,
  });
};