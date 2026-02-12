import { join } from "node:path";

import {
  BrowserWindow,
  Menu,
  MenuItem,
  app,
  ipcMain,
  nativeImage,
} from "electron";

import windowIconAsset from "../../assets/desktop/icon.png?asset";

import { config } from "./config";
import { updateTrayMenu } from "./tray";

// global reference to main window
export let mainWindow: BrowserWindow;

// currently in-use build
export const BUILD_URL = new URL(
  app.commandLine.hasSwitch("force-server")
    ? app.commandLine.getSwitchValue("force-server")
    : /*MAIN_WINDOW_VITE_DEV_SERVER_URL ??*/ "https://beta.revolt.chat",
);

// internal window state
let shouldQuit = false;

// load the window icon
const windowIcon = nativeImage.createFromDataURL(windowIconAsset);

// windowIcon.setTemplateImage(true);

/**
 * Create the main application window
 */
export function createMainWindow() {
  // create the window
  mainWindow = new BrowserWindow({
    minWidth: 300,
    minHeight: 300,
    width: 1280,
    height: 720,
    backgroundColor: "#000A0E",
    frame: !config.customFrame,
    icon: windowIcon,
    webPreferences: {
      // relative to `.vite/build`
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  // hide the options
  mainWindow.setMenu(null);

  // maximise the window if it was maximised before
  if (config.windowState.isMaximised) {
    mainWindow.maximize();
  }

  // load the entrypoint
  mainWindow.loadURL(BUILD_URL.toString());

  // minimise window to tray
  mainWindow.on("close", (event) => {
    if (!shouldQuit && config.minimiseToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // update tray menu when window is shown/hidden
  mainWindow.on("show", updateTrayMenu);
  mainWindow.on("hide", updateTrayMenu);

  // keep track of window state
  function generateState() {
    config.windowState = {
      isMaximised: mainWindow.isMaximized(),
    };
  }

  mainWindow.on("maximize", generateState);
  mainWindow.on("unmaximize", generateState);

  // rebind zoom controls to be more sensible
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.control && input.key === "=") {
      // zoom in (+)
      event.preventDefault();
      mainWindow.webContents.setZoomLevel(
        mainWindow.webContents.getZoomLevel() + 1,
      );
    } else if (input.control && input.key === "-") {
      // zoom out (-)
      event.preventDefault();
      mainWindow.webContents.setZoomLevel(
        mainWindow.webContents.getZoomLevel() - 1,
      );
    }
  });

  // send the config
mainWindow.webContents.once('did-finish-load', () => {
  mainWindow.webContents.insertCSS(`
    /* Font overrides with 16px */
    body, p, div, button, input, textarea, select, h1, h2, h3, h4, h5, h6, label {
      font-family: "Ac437 PhoenixVGA 9x16" !important;
      font-size: 16px !important;
    }
    [class*="icon"], [class*="Icon"], svg {
      font-family: inherit !important;
    }

    /* Base theme colors - #000A0E background */
    body, .app, main, [class*="container"], [class*="panel"], [class*="sidebar"] {
      background-color: #000A0E !important;
      color: #818C98 !important;
      border: none !important;
    }

    /* Content areas - lighter than background */
    [class*="message"], [class*="content"], [class*="chat"] {
      background-color: #050C0F !important;
      color: #818C98 !important;
      border: none !important;
    }

    /* Major UI elements with #111A1F borders */
    [class*="chat"], [class*="server"], [class*="user"], [class*="sidebar"],
    [class*="panel"], [class*="channel"], [class*="member"],
    [class*="message-input"], [class*="compose"], [class*="textbox"],
    [class*="input-area"], [class*="chat-input"], [class*="send"] {
      border: 1px solid #111A1F !important;
    }

    /* Popup cards with brighter background */
    [class*="popup"], [class*="dropdown"], [class*="modal"], [class*="tooltip"],
    [class*="context"], [class*="menu"], [class*="profile"], [class*="card"] {
      background-color: #060D10 !important;
      border: 1px solid #111A1F !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
    }

    /* Small interactive elements with accent color */
    button[class*="small"], [class*="button"][class*="compact"],
    input[type="submit"], input[type="button"] {
      background: linear-gradient(135deg, #78B892 0%, #6BA683 100%) !important;
      color: #000A0E !important;
      border: 1px solid #5A9470 !important;
      box-shadow: 0 2px 4px rgba(120, 184, 146, 0.2) !important;
    }

    /* Large buttons with very subtle shading */
    button, [class*="button"]:not([class*="small"]):not([class*="compact"]),
    [role="button"]:not([class*="small"]) {
      background: linear-gradient(135deg, #050C0F 0%, #03080A 100%) !important;
      color: #818C98 !important;
      border: 1px solid hsla(210, 10%, 90%, 0.08) !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2) !important;
    }

    button:hover, [class*="button"]:hover, [role="button"]:hover {
      background: linear-gradient(135deg, #060D10 0%, #050C0F 100%) !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
    }

    /* Input fields with subtle accent */
    input, textarea, select {
      background: linear-gradient(135deg, #03080A 0%, #04090C 100%) !important;
      color: #818C98 !important;
      border: 1px solid hsla(210, 10%, 90%, 0.12) !important;
      border-bottom: 2px solid #78B892 !important;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
    }

    input:focus, textarea:focus, select:focus {
      outline: none !important;
      border-bottom: 2px solid #8AC8A3 !important;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 0 8px rgba(120, 184, 146, 0.3) !important;
    }

    /* Fix discover button area */
    [class*="discover"], [class*="server"][class*="discover"] {
      background-color: #000A0E !important;
    }

    /* Hide voice popups */
    .voice-popup-hidden {
      display: none !important;
    }
  `);

  // MutationObserver for voice popups
  mainWindow.webContents.executeJavaScript(`
    const observer = new MutationObserver(() => {
      const selectors = [
        '[class*="voice"]',
        '[class*="call"]',
        '[class*="pointer-events_all"]',
        '.w_360px.h_120px',
        '[style*="360px"]',
        '[style*="120px"]'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          if (el.offsetWidth === 360 && el.offsetHeight === 120) {
            el.classList.add('voice-popup-hidden');
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  `);
  config.sync();
});

  // configure spellchecker context menu
  mainWindow.webContents.on("context-menu", (_, params) => {
    const menu = new Menu();

    // add all suggestions
    for (const suggestion of params.dictionarySuggestions) {
      menu.append(
        new MenuItem({
          label: suggestion,
          click: () => mainWindow.webContents.replaceMisspelling(suggestion),
        }),
      );
    }

    // allow users to add the misspelled word to the dictionary
    if (params.misspelledWord) {
      menu.append(
        new MenuItem({
          label: "Add to dictionary",
          click: () =>
            mainWindow.webContents.session.addWordToSpellCheckerDictionary(
              params.misspelledWord,
            ),
        }),
      );
    }

    // add an option to toggle spellchecker
    menu.append(
      new MenuItem({
        label: "Toggle spellcheck",
        click() {
          config.spellchecker = !config.spellchecker;
        },
      }),
    );

    // show menu if we've generated enough entries
    if (menu.items.length > 0) {
      menu.popup();
    }
  });

  // push world events to the window
  ipcMain.on("minimise", () => mainWindow.minimize());
  ipcMain.on("maximise", () =>
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(),
  );
  ipcMain.on("close", () => mainWindow.close());

  // mainWindow.webContents.openDevTools();

  // let i = 0;
  // setInterval(() => setBadgeCount((++i % 30) + 1), 1000);
}

/**
 * Quit the entire app
 */
export function quitApp() {
  shouldQuit = true;
  mainWindow.close();
}

// Ensure global app quit works properly
app.on("before-quit", () => {
  shouldQuit = true;
});
