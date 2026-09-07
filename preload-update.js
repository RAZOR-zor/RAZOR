const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
    installUpdate: () => ipcRenderer.send('update:install'),
    checkForUpdate: () => ipcRenderer.send('update:check')
});
