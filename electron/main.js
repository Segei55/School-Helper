const { app, BrowserWindow, ipcMain, shell, Tray, Menu, safeStorage, net, session } = require('electron');
const path = require('path');
const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const url = require('url');
const OpenAI = require('openai');

// --- LOCAL DEV CONFIG ---
try {
    const dotenv = require('dotenv');
    const envPath = path.join(__dirname, '../.env');
    const envLocalPath = path.join(__dirname, '../.env.local');
    
    if (fs.existsSync(envPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    }
    if (fs.existsSync(envLocalPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    }
} catch (e) {}

// --- КОНФИГУРАЦИЯ GOOGLE CLOUD (Desktop) ---
const API_KEY_FALLBACK = ""; 

// SECURITY: KEY FOR AI
let OPENROUTER_API_KEY = process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || "REPLACE_ME_IN_CI";
let POLZA_API_KEY = process.env.POLZA_API_KEY || "REPLACE_ME_IN_CI_POLZA";

let mainWindow;
let authWindow = null;
let tray = null;
let isQuitting = false;

// Хранение токенов в памяти
let sessionTokens = {
  access_token: null,
  refresh_token: null
};

// Хранение настроек приложения
let appSettings = {
  autoLaunch: false,
  minimizeToTray: true,
  useInternalBrowser: false
};

// Пути к файлам конфигурации
const TOKEN_PATH = path.join(app.getPath('userData'), 'auth_tokens.enc'); 
const SETTINGS_PATH = path.join(app.getPath('userData'), 'app_settings.json');

// Register Custom Protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('schoolhelper', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('schoolhelper');
}

if (process.platform === 'win32') {
  app.setAppUserModelId("Школьный Помощник");
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
    const urlStr = commandLine.find(arg => arg.startsWith('schoolhelper://'));
    if (urlStr) handleDeepLink(urlStr);
  });

  app.on('open-url', (event, urlStr) => {
      event.preventDefault();
      handleDeepLink(urlStr);
  });
}

function safeBase64Decode(str) {
    try {
        let cleanStr = decodeURIComponent(str);
        cleanStr = cleanStr.replace(/ /g, '+');
        cleanStr = cleanStr.replace(/-/g, '+').replace(/_/g, '/');
        while (cleanStr.length % 4) {
            cleanStr += '=';
        }
        return Buffer.from(cleanStr, 'base64').toString('utf-8');
    } catch (e) {
        console.error("Base64 Decode Error:", e);
        return null;
    }
}

function handleDeepLink(urlStr) {
    try {
        const parsedUrl = new URL(urlStr);
        if (parsedUrl.host === 'auth_callback') {
             const base64Data = parsedUrl.searchParams.get('data');
             if (base64Data) {
                 const jsonString = safeBase64Decode(base64Data);
                 if (jsonString) {
                     try {
                         const data = JSON.parse(jsonString);
                         const isPremium = 
                            data.is_premium === true || 
                            data.is_premium === '1' || 
                            data.is_premium === 1 || 
                            data.is_premium === 'true';

                         // Extract refresh_token if available (Authorization Code Flow)
                         const userData = {
                             email: data.email,
                             displayName: data.name || (data.email ? data.email.split('@')[0] : 'User'),
                             photoUrl: data.picture,
                             licenseKey: data.license_key,
                             isPremium: isPremium,
                             validUntil: data.premium_until,
                             accessToken: data.access_token,
                             refreshToken: data.refresh_token || null,
                             role: data.role
                         };

                         if (userData.email && mainWindow) {
                             mainWindow.webContents.send('auth-data', userData);
                             if (mainWindow.isMinimized()) mainWindow.restore();
                             if (!mainWindow.isVisible()) mainWindow.show();
                             mainWindow.focus();
                             
                             if (authWindow && !authWindow.isDestroyed()) {
                                 authWindow.close();
                                 authWindow = null;
                             }
                         }
                     } catch (parseError) {}
                 }
             }
        }
    } catch (e) {}
}

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const data = fs.readFileSync(SETTINGS_PATH);
      appSettings = { ...appSettings, ...JSON.parse(data) };
    }
  } catch (e) {}
  applySettings();
}

function saveSettings(newSettings) {
  try {
    appSettings = { ...appSettings, ...newSettings };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(appSettings));
    applySettings();
  } catch (e) {}
}

function applySettings() {
  app.setLoginItemSettings({
    openAtLogin: appSettings.autoLaunch,
    path: app.getPath('exe')
  });
}

function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const buffer = fs.readFileSync(TOKEN_PATH);
      if (safeStorage.isEncryptionAvailable()) {
          try {
             const decrypted = safeStorage.decryptString(buffer);
             sessionTokens = JSON.parse(decrypted);
             return;
          } catch (e) {
             // Fallback or corrupted
          }
      }
    }
    // Legacy migration if needed
    const LEGACY_PATH = path.join(app.getPath('userData'), 'auth_tokens.json');
    if (fs.existsSync(LEGACY_PATH)) {
        const data = fs.readFileSync(LEGACY_PATH);
        sessionTokens = JSON.parse(data);
        saveTokens(sessionTokens); // Re-save encrypted
        fs.unlinkSync(LEGACY_PATH);
    }
  } catch (e) {}
}

function saveTokens(tokens) {
  try {
    sessionTokens = { ...sessionTokens, ...tokens };
    const jsonStr = JSON.stringify(sessionTokens);
    if (safeStorage.isEncryptionAvailable()) {
        const encryptedBuffer = safeStorage.encryptString(jsonStr);
        fs.writeFileSync(TOKEN_PATH, encryptedBuffer);
    }
  } catch (e) {}
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Открыть', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Выход', click: () => { isQuitting = true; app.quit(); } }
  ]);
  tray.setToolTip('Школьный Помощник');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
        if (mainWindow.isVisible()) {
            if (mainWindow.isFocused()) mainWindow.hide(); else mainWindow.focus();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 720, minWidth: 900, minHeight: 600,
    frame: false, backgroundColor: '#202225',
    icon: path.join(__dirname, 'icon.png'), show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, contextIsolation: true, sandbox: false,
      webviewTag: true // Enable webview for the Browser tool
    },
  });

  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '../dist/index.html'),
    protocol: 'file:', slashes: true
  });

  mainWindow.loadURL(startUrl);

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'notifications'];
    if (allowedPermissions.includes(permission)) callback(true); else callback(false);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Check for auth/registration links
    const isAuth = url.includes('accounts.google.com') || 
                   url.includes('oauth') || 
                   url.includes('/auth') || 
                   url.includes('login') || 
                   url.includes('signin') ||
                   url.includes('register') ||
                   url.includes('signup');

    if (isAuth) {
        if (!appSettings.useInternalBrowser) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { 
            action: 'allow', 
            overrideBrowserWindowOptions: { 
                autoHideMenuBar: true,
                modal: false 
            } 
        };
    }

    // Open all external links in the internal browser
    if (url.startsWith('http')) {
        if (!appSettings.useInternalBrowser) {
            shell.openExternal(url);
        } else {
            mainWindow.webContents.send('open-internal-url', url);
        }
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol !== 'file:' && parsedUrl.protocol !== 'schoolhelper:') {
        event.preventDefault();
        if (!appSettings.useInternalBrowser) {
            shell.openExternal(navigationUrl);
        } else {
            mainWindow.webContents.send('open-internal-url', navigationUrl);
        }
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show(); mainWindow.focus();
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    if (process.platform !== 'darwin' && process.argv.length >= 2) {
       const urlStr = process.argv.find(arg => arg.startsWith('schoolhelper://'));
       if (urlStr) handleDeepLink(urlStr);
    }
  });

  app.on('browser-window-focus', () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.focus(); });

  mainWindow.on('close', (event) => {
    if (!isQuitting && appSettings.minimizeToTray) {
      event.preventDefault(); mainWindow.hide();
    }
    return false;
  });

  ipcMain.on('minimize-window', () => mainWindow.minimize());
  ipcMain.on('maximize-window', () => { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); });
  ipcMain.on('close-window', () => { mainWindow.close(); });
}

// --- AD BLOCKER LOGIC ---
const adDomains = [
  // Google
  "*://*.doubleclick.net/*", "*://*.googlesyndication.com/*", 
  "*://*.google-analytics.com/*", "*://*.adservice.google.com/*",
  "*://*.googleadservices.com/*", "*://*.googletagservices.com/*",
  "*://*.googleusercontent.com/ads/*",
  
  // Yandex
  "*://*.yandex.ru/ads/*", "*://*.an.yandex.ru/*", "*://*.mc.yandex.ru/*",
  "*://*.bs.yandex.ru/*", "*://*.awaps.yandex.net/*", "*://*.yandex.net/ads/*",
  "*://*.yandex.ru/internet/*", "*://*.yandex.ru/clck/*",

  // VK / Mail.ru
  "*://*.vk.com/ads/*", "*://*.my.com/ads/*", "*://*.mail.ru/ads/*",
  "*://*.ad.mail.ru/*", "*://*.rs.mail.ru/*",

  // Common Ad Networks & Trackers
  "*://creative.sizmek.com/*", "*://*.criteo.com/*",
  "*://*.pubmatic.com/*", "*://*.rubiconproject.com/*",
  "*://*.taboola.com/*", "*://*.outbrain.com/*",
  "*://*.adroll.com/*", "*://*.smartadserver.com/*",
  "*://*.adnxs.com/*", "*://*.advertising.com/*",
  "*://*.casalemedia.com/*", "*://*.contextweb.com/*",
  "*://*.openx.net/*", "*://*.zedo.com/*",
  "*://*.adsafeprotected.com/*", "*://*.moatads.com/*",
  "*://*.scorecardresearch.com/*", "*://*.quantserve.com/*",
  "*://*.amazon-adsystem.com/*", "*://*.rlcdn.com/*",
  "*://*.adtech.de/*", "*://*.adtechus.com/*",
  "*://*.yieldmanager.com/*", "*://*.yieldmanager.net/*",
  "*://*.serving-sys.com/*", "*://*.adbrite.com/*",
  "*://*.adform.net/*", "*://*.adition.com/*",
  "*://*.adzerk.net/*", "*://*.bidswitch.net/*",
  "*://*.bluekai.com/*", "*://*.chartbeat.com/*",
  "*://*.demdex.net/*", "*://*.exelator.com/*",
  "*://*.imrworldwide.com/*", "*://*.krxd.net/*",
  "*://*.mathtag.com/*", "*://*.mookie1.com/*",
  "*://*.rfihub.com/*", "*://*.sharethis.com/*",
  "*://*.tynt.com/*", "*://*.addthis.com/*",
  "*://*.youtube.com/pagead/*", "*://*.youtube.com/api/stats/ads*",
  "*://*.youtube.com/ptracking*", "*://*.youtube.com/api/stats/qoe*"
];

let isAdBlockEnabled = false;

ipcMain.on('set-adblock', (event, enabled) => {
  const ses = session.defaultSession; 
  if (enabled && !isAdBlockEnabled) {
    ses.webRequest.onBeforeRequest({ urls: adDomains }, (details, callback) => {
      callback({ cancel: true });
    });
    isAdBlockEnabled = true;
    console.log("AdBlock Enabled");
  } else if (!enabled && isAdBlockEnabled) {
    ses.webRequest.onBeforeRequest(null); // Clear listener
    isAdBlockEnabled = false;
    console.log("AdBlock Disabled");
  }
});

ipcMain.handle('get-app-settings', () => appSettings);
ipcMain.handle('update-app-setting', (event, key, value) => {
  const newSettings = {}; newSettings[key] = value;
  saveSettings(newSettings); return appSettings;
});
ipcMain.handle('get-api-key', () => process.env.API_KEY || API_KEY_FALLBACK);

// UPDATED: Handle object with both tokens
ipcMain.on('set-auth-token', (event, tokens) => {
  if (tokens && typeof tokens === 'object') {
      sessionTokens = { 
          access_token: tokens.access_token || null, 
          refresh_token: tokens.refresh_token || null 
      };
      saveTokens(sessionTokens);
  } else if (tokens === null) {
      // Logout logic
      sessionTokens = { access_token: null, refresh_token: null };
      try { if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH); } catch(e) {}
  }
});

ipcMain.handle('google-login', async (event) => {
    const authUrl = "https://school-helper.ru/#/auth?mode=app";
    
    if (!appSettings.useInternalBrowser) {
        shell.openExternal(authUrl);
        return null;
    }

    if (authWindow && !authWindow.isDestroyed()) {
        authWindow.focus();
        return null;
    }
    
    authWindow = new BrowserWindow({
        width: 600,
        height: 700,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    
    authWindow.loadURL(authUrl);
    
    authWindow.on('closed', () => {
        authWindow = null;
    });
    
    return null;
});

// --- AI PROXY (SECURE REQUESTS) ---
ipcMain.on('ai-request', async (event, { messages, model, systemInstruction, apiKey, provider }) => {
    const isPolza = provider === 'polza';
    const finalApiKey = apiKey || (isPolza ? POLZA_API_KEY : OPENROUTER_API_KEY);
    
    if (!finalApiKey || finalApiKey.includes('REPLACE_ME')) {
        event.sender.send('ai-error', `API ключ ${isPolza ? 'Polza.ai' : 'OpenRouter'} не настроен.`);
        return;
    }

    const payload = JSON.stringify({
        model: model,
        messages: [
            { role: 'system', content: systemInstruction },
            ...messages
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2000
    });

    const request = net.request({
        method: 'POST',
        protocol: 'https:',
        hostname: isPolza ? 'polza.ai' : 'openrouter.ai',
        path: '/api/v1/chat/completions',
    });

    request.setHeader('Authorization', `Bearer ${finalApiKey}`);
    request.setHeader('Content-Type', 'application/json');
    if (!isPolza) {
        request.setHeader('HTTP-Referer', 'https://school-helper.ru');
        request.setHeader('X-Title', 'School Helper Desktop');
    }

    request.on('response', (response) => {
        if (response.statusCode === 429) {
            event.sender.send('ai-error', 'Rate Limit Exceeded: Слишком много запросов. Пожалуйста, подождите.');
            return;
        }
        if (response.statusCode !== 200) {
            event.sender.send('ai-error', `Ошибка сервера: ${response.statusCode}`);
            return;
        }
        response.on('data', (chunk) => {
            const lines = chunk.toString('utf8').split('\n');
            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    const data = line.trim().slice(6);
                    if (data === '[DONE]') {
                        event.sender.send('ai-done');
                        return;
                    }
                    try {
                        const json = JSON.parse(data);
                        const content = json.choices[0]?.delta?.content;
                        if (content) event.sender.send('ai-chunk', content);
                    } catch (e) {}
                }
            }
        });
        response.on('end', () => event.sender.send('ai-done'));
        response.on('error', (e) => event.sender.send('ai-error', e.message));
    });
    request.on('error', (error) => event.sender.send('ai-error', error.message));
    request.write(payload);
    request.end();
});

// --- POLZA.AI PROXY (SECURE REQUESTS) ---
ipcMain.handle('polza-chat', async (event, messages, model = 'anthropic/claude-3-5-sonnet') => {
    const finalApiKey = process.env.AI_API_KEY || POLZA_API_KEY;
    if (!finalApiKey || finalApiKey.includes('REPLACE_ME')) {
        throw new Error('API ключ Polza.ai не настроен.');
    }

    const openai = new OpenAI({
        apiKey: finalApiKey,
        baseURL: 'https://polza.ai/api/v1',
    });

    try {
        const response = await openai.chat.completions.create({
            model: model,
            messages: messages,
        });
        return response.choices[0].message;
    } catch (error) {
        if (error.status === 429) {
            throw new Error('Rate Limit Exceeded: Слишком много запросов. Пожалуйста, подождите.');
        }
        throw error;
    }
});


// --- DRIVE OPERATIONS & AUTH REFRESH ---

// 1. Basic Request Wrapper
function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request({ ...options, timeout: 15000 }, (res) => {
      let body = ''; 
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) { 
            try { resolve(JSON.parse(body)); } catch(e) { resolve(body); } 
        } else if (res.statusCode === 401) { 
            const error = new Error('UNAUTHORIZED'); 
            error.code = '401'; 
            reject(error); 
        } else { 
            const error = new Error(`Status: ${res.statusCode}`); 
            error.body = body; 
            error.code = 'API_ERROR'; 
            reject(error); 
        }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', (e) => { reject(e); });
    if (postData) req.write(postData); 
    req.end();
  });
}

// 2. Token Refresh Logic
async function refreshAccessToken() {
    if (!sessionTokens.refresh_token) return null;
    
    console.log("Attempting to refresh token...");
    try {
        const payload = JSON.stringify({ refresh_token: sessionTokens.refresh_token });
        const result = await request({
            hostname: 'school-helper.ru',
            path: '/api.php?action=refresh_token_proxy',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, payload);

        if (result && result.success && result.access_token) {
            console.log("Token refreshed successfully.");
            saveTokens({ access_token: result.access_token });
            return result.access_token;
        } else {
            console.error("Token refresh failed:", result);
            return null;
        }
    } catch (e) {
        console.error("Refresh token request error:", e);
        return null;
    }
}

// 3. Authorized Request with Auto-Refresh
async function authorizedRequest(options, postData = null, isRetry = false) {
    if (!sessionTokens.access_token) throw new Error("NO_TOKEN");
    
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = `Bearer ${sessionTokens.access_token}`;
    
    try {
        return await request(options, postData);
    } catch (e) {
        // Intercept 401
        if ((e.message === 'UNAUTHORIZED' || e.code === '401') && !isRetry && sessionTokens.refresh_token) {
            const newAccessToken = await refreshAccessToken();
            if (newAccessToken) {
                // Retry request with new token
                options.headers['Authorization'] = `Bearer ${newAccessToken}`;
                return await authorizedRequest(options, postData, true);
            }
        }
        throw e;
    }
}

async function findFile(filename) {
    const query = encodeURIComponent(`name = '${filename}' and trashed = false`);
    const result = await authorizedRequest({
        hostname: 'www.googleapis.com', path: `/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name)`, method: 'GET'
    });
    return (result.files && result.files.length > 0) ? result.files[0] : null;
}

ipcMain.handle('drive-export', async (event, filename, content) => {
    if (!sessionTokens.access_token) throw new Error("NO_TOKEN");
    try {
        const existingFile = await findFile(filename);
        if (existingFile) {
            await authorizedRequest({
                hostname: 'www.googleapis.com', path: `/upload/drive/v3/files/${existingFile.id}?uploadType=media`,
                method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(content) }
            }, content);
        } else {
            const metadata = { name: filename, mimeType: 'application/json' };
            const boundary = '-------schoolhelperdesktop';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";
            const multipartBody = delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/json\r\n\r\n' + content + close_delim;
            await authorizedRequest({
                hostname: 'www.googleapis.com', path: '/upload/drive/v3/files?uploadType=multipart',
                method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary, 'Content-Length': Buffer.byteLength(multipartBody) }
            }, multipartBody);
        }
        return true;
    } catch (e) {
        if (e.message === 'UNAUTHORIZED' || e.code === '401' || e.message === 'NO_TOKEN') {
            throw new Error("UNAUTHORIZED");
        }
        console.error("Drive Export Error:", e);
        return false;
    }
});

ipcMain.handle('drive-import', async (event, filename) => {
    if (!sessionTokens.access_token) throw new Error("NO_TOKEN");
    try {
        const existingFile = await findFile(filename);
        if (!existingFile) return null;
        const content = await authorizedRequest({
            hostname: 'www.googleapis.com', path: `/drive/v3/files/${existingFile.id}?alt=media`, method: 'GET'
        });
        return typeof content === 'object' ? JSON.stringify(content) : content;
    } catch (e) {
        if (e.message === 'UNAUTHORIZED' || e.code === '401' || e.message === 'NO_TOKEN') {
             throw new Error("UNAUTHORIZED");
        }
        console.error("Drive Import Error:", e);
        return null; 
    }
});

app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
        contents.setWindowOpenHandler(({ url }) => {
            // Check for auth/registration links
            const isAuth = url.includes('accounts.google.com') || 
                           url.includes('oauth') || 
                           url.includes('/auth') || 
                           url.includes('login') || 
                           url.includes('signin') ||
                           url.includes('register') ||
                           url.includes('signup');

            if (isAuth) {
                if (!appSettings.useInternalBrowser) {
                    shell.openExternal(url);
                    return { action: 'deny' };
                }
                return { 
                    action: 'allow', 
                    overrideBrowserWindowOptions: { 
                        autoHideMenuBar: true,
                        modal: false 
                    } 
                };
            }

            if (mainWindow) {
                if (!appSettings.useInternalBrowser) {
                    shell.openExternal(url);
                } else {
                    mainWindow.webContents.send('open-internal-url', url);
                }
            }
            return { action: 'deny' };
        });
    }
});

app.whenReady().then(() => { loadTokens(); loadSettings(); createTray(); createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });