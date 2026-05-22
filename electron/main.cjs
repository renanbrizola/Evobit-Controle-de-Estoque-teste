const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../public/favicon.ico') // Adjust path as needed
  });

  // Remove menu bar for a cleaner look (optional, can be kept)
  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the index.html from the dist folder
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle external links opening in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    // Allow internal window.open (e.g., standalone routes)
    return { 
      action: 'allow',
      overrideBrowserWindowOptions: {
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      }
    };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- Fiscal Module IPC ---
const { ipcMain } = require('electron');
const NFeBuilder = require('./fiscal/NFeBuilder.cjs');
// const XmlSigner = require('./fiscal/XmlSigner.cjs'); // Uncomment when implemented
// const SefazCommunicator = require('./fiscal/SefazCommunicator.cjs'); // Uncomment when implemented

ipcMain.handle('fiscal:emit', async (event, saleData) => {
  try {
    console.log('Received fiscal:emit for sale:', saleData.id);

    // 1. Mock Company Data (Should come from Settings)
    const company = {
      name: 'Empresa Teste Ltda',
      cnpj: '12345678000199',
      ie: '123456789',
      crt: '1',
      uf: 'SP',
      uf_code: '35',
      city_code: '3550308',
      city_name: 'Sao Paulo',
      address: {
        street: 'Rua Teste',
        number: '123',
        neighborhood: 'Centro',
        zip_code: '01001000'
      }
    };

    // 2. Build XML
    const builder = new NFeBuilder(saleData, company, '1', '1');
    const xml = builder.build();
    console.log('Generated XML Preview:', xml.substring(0, 100) + '...');

    // 3. Sign XML (Mock for now)
    // const signer = new XmlSigner('path/to/cert.pfx', 'password');
    // const signedXml = signer.sign(xml);
    const signedXml = xml; // Bypass for architectural test

    // 4. Send to SEFAZ (Mock for now)
    // const sefaz = new SefazCommunicator('path/to/cert.pfx', 'password');
    // const result = await sefaz.send(signedXml);

    // Mock Success Return
    return {
      success: true,
      nfe_number: '1',
      nfe_series: '1',
      nfe_key: '35240212345678000123650010000000011000000015',
      message: 'Autorizado o uso da NF-e'
    };

  } catch (error) {
    console.error('Fiscal Emit Error:', error);
    return { success: false, message: error.message };
  }
});
