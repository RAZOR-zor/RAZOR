const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('catatanAPI', {
    load: () => ipcRenderer.invoke('catatan:load'),
    save: (text) => ipcRenderer.invoke('catatan:save', text),
    export: (text) => ipcRenderer.invoke('catatan:export', text),
    status: () => ipcRenderer.invoke('catatan:status'),
    setupPin: (pin) => ipcRenderer.invoke('catatan:setup-pin', pin),
    unlock: (pin) => ipcRenderer.invoke('catatan:unlock', pin),
    lock: () => ipcRenderer.invoke('catatan:lock'),
    changePin: (oldPin, newPin) => ipcRenderer.invoke('catatan:change-pin', oldPin, newPin)
});
