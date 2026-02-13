
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  
  // Auth & Drive
  loginGoogle: () => ipcRenderer.invoke('google-login'),
  
  // Listener for Deep Link Auth Data
  onAuthData: (callback) => ipcRenderer.on('auth-data', (_event, value) => callback(value)),

  // Send token from renderer to main process to persist session across restarts
  setAuthToken: (token) => ipcRenderer.send('set-auth-token', token),
  
  driveExport: (filename, content) => ipcRenderer.invoke('drive-export', filename, content),
  driveImport: (filename) => ipcRenderer.invoke('drive-import', filename),

  // Settings
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  updateAppSetting: (key, value) => ipcRenderer.invoke('update-app-setting', key, value),

  // Secrets
  getApiKey: () => ipcRenderer.invoke('get-api-key'),

  // AI Secure Bridge
  streamAiRequest: (data) => ipcRenderer.send('ai-request', data),
  onAiChunk: (callback) => ipcRenderer.on('ai-chunk', (_event, chunk) => callback(chunk)),
  onAiDone: (callback) => ipcRenderer.on('ai-done', () => callback()),
  onAiError: (callback) => ipcRenderer.on('ai-error', (_event, err) => callback(err)),
  removeAiListeners: () => {
    ipcRenderer.removeAllListeners('ai-chunk');
    ipcRenderer.removeAllListeners('ai-done');
    ipcRenderer.removeAllListeners('ai-error');
  }
});
