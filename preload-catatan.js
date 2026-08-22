const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('catatanAPI', {
    load: () => ipcRenderer.invoke('catatan:load'),
    save: (text) => ipcRenderer.invoke('catatan:save', text),
    export: (text) => ipcRenderer.invoke('catatan:export', text)
});
