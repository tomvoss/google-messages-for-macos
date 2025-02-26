// main.js - Electron main process
import { app, BrowserWindow, screen, ipcMain, Notification, shell } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';

// ESM __dirname equivalent
const __filename = fileURLToPath( import.meta.url );
const __dirname = dirname( __filename );

// Application constants
const APP_NAME = 'Google Messages for macOS';
const APP_URL = 'https://messages.google.com/web/';
const STATE_FILE = join( app.getPath( 'userData' ), 'window-state.json' );

// Global references to prevent garbage collection
let mainWindow = null;

// Default window dimensions
const DEFAULT_WINDOW_STATE = {
    width: 1024,
    height: 768,
    x: undefined,
    y: undefined,
    isMaximized: false
};

/**
 * Load saved window state from disk
 * @returns {Promise<Object>} The window state
 */
const loadWindowState = async () => {
    try {
        const data = await fs.readFile( STATE_FILE, 'utf8' );
        return { ...DEFAULT_WINDOW_STATE, ...JSON.parse( data ) };
    } catch ( error ) {
        console.log( 'No saved window state found, using defaults' );
        return DEFAULT_WINDOW_STATE;
    }
};

/**
 * Save window state to disk immediately
 * @param {BrowserWindow} window The window to save state for
 * @returns {Promise<void>}
 */
const saveWindowState = async ( window ) => {
    if ( ! window || window.isDestroyed() ) {
        return;
    }

    try {
        // Get current state
        const bounds = window.getNormalBounds();
        const state = {
            width: bounds.width,
            height: bounds.height,
            x: bounds.x,
            y: bounds.y,
            isMaximized: window.isMaximized()
        };

        // Save to disk
        await fs.writeFile( STATE_FILE, JSON.stringify( state, null, 2 ) );
    } catch ( error ) {
        console.error( 'Failed to save window state:', error );
    }
};

/**
 * Ensure window position is visible on available displays
 * @param {Object} state - Window state with x, y, width, height
 * @returns {Object} - Adjusted window state
 */
const ensureVisibleOnScreen = ( state ) => {
    // Get all displays
    const displays = screen.getAllDisplays();

    if ( ! state.x && ! state.y ) {
        // No position saved, return as is to use default centering
        return state;
    }

    // Check if window is visible on any display
    let visible = false;

    for ( const display of displays ) {
        const { bounds } = display;
        // Check if at least part of the window is visible on this display
        if (
            state.x < bounds.x + bounds.width &&
            state.x + state.width > bounds.x &&
            state.y < bounds.y + bounds.height &&
            state.y + state.height > bounds.y
        ) {
            visible = true;
            break;
        }
    }

    // If not visible on any display, reset position
    if ( ! visible && displays.length > 0 ) {
        // Use primary display or first available
        const primaryDisplay = screen.getPrimaryDisplay() || displays[0];
        const { bounds } = primaryDisplay;

        // Center window on the primary display
        state.x = bounds.x + Math.round( ( bounds.width - state.width ) / 2 );
        state.y = bounds.y + Math.round( ( bounds.height - state.height ) / 2 );
    }

    return state;
};

/**
 * Create the main application window
 */
const createMainWindow = async () => {
    // Load previous state
    let windowState = await loadWindowState();

    // Ensure the window will be visible on screen
    windowState = ensureVisibleOnScreen( windowState );

    // Create the browser window
    mainWindow = new BrowserWindow( {
        width: windowState.width,
        height: windowState.height,
        x: windowState.x,
        y: windowState.y,
        minWidth: 400,
        minHeight: 300,
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 19, y: 11 },
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: join( __dirname, 'preload.js' )
        }
    });

    // Set permission handler for notifications
    mainWindow.webContents.session.setPermissionRequestHandler( ( webContents, permission, callback ) => {
        const googleMessagesUrl = 'messages.google.com';
        const currentUrl = webContents.getURL();
        const urlObj = new URL( currentUrl );
        const isGoogleMessages = urlObj.hostname === googleMessagesUrl || urlObj.hostname.endsWith( '.' + googleMessagesUrl );

        // List of permissions to automatically approve for Google Messages
        const approvedPermissions = [
            'notifications',
            'media',           // For camera/microphone
            'mediaKeySystem',  // For media playback
            'geolocation',     // If needed for location sharing
            'clipboard-read',  // For clipboard operations
            'clipboard-write'  // For clipboard operations
        ];

        if ( isGoogleMessages && approvedPermissions.includes( permission ) ) {
            return callback( true );
        }

        // Deny all other permission requests
        callback( false );
    });

    // Load the PWA
    await mainWindow.loadURL( APP_URL );

    // Enable opening links in browser
    mainWindow.webContents.setWindowOpenHandler( ({ url }) => {
        // Open external links in browser, internal links in app
        if ( url.startsWith( 'https://messages.google.com' ) ) {
            return { action: 'allow' };
        }

        // Open all other links in default browser
        shell.openExternal( url );
        return { action: 'deny' };
    });

    // Restore maximized state if needed
    if ( windowState.isMaximized ) {
        mainWindow.maximize();
    }

    // Set up state tracking with lower throttling time
    let stateChangeTimeout;
    const throttledStateChange = () => {
        if ( stateChangeTimeout ) {
            clearTimeout( stateChangeTimeout );
        }
        stateChangeTimeout = setTimeout( () => {
            saveWindowState( mainWindow );
        }, 100 ); // Reduced to 100ms to be more responsive
    };

    // Track window changes
    mainWindow.on( 'resize', throttledStateChange );
    mainWindow.on( 'move', throttledStateChange );
    mainWindow.on( 'maximize', throttledStateChange );
    mainWindow.on( 'unmaximize', throttledStateChange );

    // Handle macOS close button: hide instead of quit
    mainWindow.on( 'close', async ( event ) => {
        if ( process.platform === 'darwin' && ! app.isQuitting ) {
            event.preventDefault();

            // Notify renderer that app is closing
            if ( mainWindow.webContents ) {
                mainWindow.webContents.send( 'app-closing' );
            }

            // Save immediately before hiding to ensure state is preserved
            await saveWindowState( mainWindow );
            mainWindow.hide();
            return false;
        }

        // For non-macOS or actual quit, save state before closing
        await saveWindowState( mainWindow );
        mainWindow = null;
        return true;
    });
};

// Set up IPC handlers
const setupIPC = () => {
    // Handle sending notifications
    ipcMain.on( 'send-notification', ( _, { title, body } ) => {
        new Notification({ title, body }).show();
    });

    // Handle app version requests
    ipcMain.handle( 'get-app-version', () => app.getVersion() );

    // Handle online status changes
    ipcMain.on( 'online-status-changed', ( _, isOnline ) => {
        if ( mainWindow && ! mainWindow.isDestroyed() ) {
            mainWindow.webContents.send( 'online-status-update', isOnline );
        }
    });
};

// Application initialization
app.whenReady().then( async () => {
    setupIPC();
    await createMainWindow();

    // macOS: re-create window when dock icon is clicked
    app.on( 'activate', () => {
        if ( ! mainWindow ) {
            createMainWindow();
        } else {
            mainWindow.show();
        }
    });
});

// Handle all windows being closed
app.on( 'window-all-closed', () => {
    // On macOS, applications stay active until explicitly quit
    if ( process.platform !== 'darwin' ) {
        app.quit();
    }
});

// Handle app quitting
app.on( 'before-quit', () => {
    // Set flag to allow actual quitting
    app.isQuitting = true;
});
