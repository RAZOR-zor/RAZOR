const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    close: () => ipcRenderer.send('win:close'),
    injectScript: (profileId) => ipcRenderer.send('win:inject-script', profileId),
    injectSoalScript: (fileName) => ipcRenderer.send('win:inject-soal-script', fileName),
    setSoalAutoInject: (enabled, contentsId, fileName) => ipcRenderer.send('win:set-soal-auto-inject', enabled, contentsId, fileName),
    deleteProfileFile: (profileId) => ipcRenderer.send('win:delete-profile-file', profileId),
    refreshPage: () => ipcRenderer.send('win:refresh-page'),
    setActiveTab: id => ipcRenderer.send('win:set-active-tab', id),
    openCatatan: () => ipcRenderer.send('win:open-catatan'),
    getSettings: () => ipcRenderer.invoke('settings:get'),
    chooseJournalDir: () => ipcRenderer.invoke('settings:choose-journal-dir'),
    setJournalDir: (dir) => ipcRenderer.invoke('settings:set-journal-dir', dir),
    setMode: (mode) => ipcRenderer.invoke('settings:set-mode', mode),
    getScriptFiles: () => ipcRenderer.invoke('scripts:list')
});
