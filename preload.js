const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
    minimize: () => ipcRenderer.send('win:minimize'),
    maximize: () => ipcRenderer.send('win:maximize'),
    close: () => ipcRenderer.send('win:close'),
    injectScript: (profileId) => ipcRenderer.send('win:inject-script', profileId),
    tandaTangan: (username, password) => ipcRenderer.send('win:tanda-tangan', username, password),
    getCredentials: (profileName) => ipcRenderer.invoke('catatan:get-credentials', profileName),
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
    getScriptFiles: () => ipcRenderer.invoke('scripts:list'),
    downloadUpdate: () => ipcRenderer.send('update:download'),
    installUpdate: () => ipcRenderer.send('update:install'),
    checkForUpdate: () => ipcRenderer.send('update:check'),
    onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, data) => cb(data)),
    onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (_, data) => cb(data)),
    onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', () => cb()),
    onUpdateNotAvailable: (cb) => ipcRenderer.on('update-not-available', () => cb()),
    onUpdateError: (cb) => ipcRenderer.on('update-error', (_, msg) => cb(msg))
});
