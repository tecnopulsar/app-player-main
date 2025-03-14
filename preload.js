import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // startTimer: () => ipcRenderer.send('start-timer'),
  // onTimerCompleted: (callback) => ipcRenderer.on('timer-completed', (event, message) => callback(message))
});
