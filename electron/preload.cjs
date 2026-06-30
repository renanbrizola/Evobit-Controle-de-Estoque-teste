const { contextBridge, ipcRenderer } = require('electron');

// Com contextIsolation:true e nodeIntegration:false, o renderer NÃO tem acesso
// direto a Node/Electron. Aqui expomos uma superfície mínima e explícita via
// contextBridge — apenas o que a aplicação realmente precisa.
contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    // Emissão fiscal (NF-e/NFC-e) roda no processo main; o renderer só dispara.
    emitFiscal: (sale) => ipcRenderer.invoke('fiscal:emit', sale),
});
