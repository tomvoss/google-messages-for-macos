const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// specific Electron APIs without exposing the entire API
contextBridge.exposeInMainWorld('electronAPI', {
    // Get app version
    getAppVersion: () => {
        return ipcRenderer.invoke('get-app-version');
    },

    // Handle when app is being closed
    onAppClosing: (callback) => {
        ipcRenderer.on('app-closing', () => callback());
    }
});

// Ensure notifications work properly
if (Notification.permission !== 'granted') {
    Notification.requestPermission().catch(err => {
        console.error('Failed to request notification permission:', err);
    });
}

// Listen for online/offline events
window.addEventListener('online', () => {
    ipcRenderer.send('online-status-changed', true);
});

window.addEventListener('offline', () => {
    ipcRenderer.send('online-status-changed', false);
});

window.addEventListener('DOMContentLoaded', () => {
    // Add 24px padding-top to <html> tag
    document.documentElement.style.marginTop = '38px';

    // Create a draggable div for the margin area
    const dragBar = document.createElement('div');
    dragBar.style.position = 'fixed';
    dragBar.style.top = '0';
    dragBar.style.left = '0';
    dragBar.style.width = '100%';
    dragBar.style.height = '38px';
    dragBar.style.webkitAppRegion = 'drag'; // Electron draggable region
    dragBar.style.background = '#f0f0f0'; // Optional: visual feedback
    document.body.appendChild(dragBar);

    // Styles for mw-branded-header and its interactive elements
    const applyHeaderStyles = (header) => {
        if (header.style.appRegion !== 'drag') {
            header.style.appRegion = 'drag';
            header.style.userSelect = 'none';
            // header.style.marginTop = '24px';
            console.log('Styles applied to mw-branded-header');
        }

        const clickableElements = header.querySelectorAll(
            'a, button, input, [onclick], [type="submit"], [type="button"], [role="button"], [style*="cursor: pointer"]'
        );
        if ( clickableElements && clickableElements.length > 0 ) {
            clickableElements.forEach((element) => {
                if (element.style.appRegion !== 'no-drag') {
                    element.style.appRegion = 'no-drag';
                    console.log('No-drag applied to:', element.tagName, element.className || '');
                }
            });
        }
    };

    // Styles for mw-nav-drawer > nav (just padding)
    const applyNavDrawerStyles = (navDrawer) => {
        const navDrawerNav = navDrawer.querySelector('nav');
        if (navDrawerNav && navDrawerNav.style.marginTop !== '38px') {
            navDrawerNav.style.marginTop = '38px';
            navDrawerNav.style.appRegion = 'drag';
            console.log('Padding applied to mw-nav-drawer > nav');
        }

        const clickableElements = navDrawerNav.querySelectorAll(
            'a, button, input, [onclick], [type="submit"], [type="button"], [role="button"], [style*="cursor: pointer"]'
        );
        if ( clickableElements && clickableElements.length > 0 ) {
            clickableElements.forEach((element) => {
                if (element.style.appRegion !== 'no-drag') {
                    element.style.appRegion = 'no-drag';
                    console.log('No-drag applied to:', element.tagName, element.className || '');
                }
            });
        }
    };

    // Styles for cdk-overlay-container
    const applyOverlayStyles = (overlayContainer) => {
        overlayContainer.style.marginTop = '38px';
        console.log('Padding applied to cdk-overlay-container');
    }

    // Header setup: Observer for consistency
    let headerObserver = null;
    const header = document.querySelector('mw-branded-header');
    if (header) {
        applyHeaderStyles(header);
        headerObserver = new MutationObserver(() => applyHeaderStyles(header));
        headerObserver.observe(header, { childList: true, subtree: true });
    } else {
        const docObserverHeader = new MutationObserver(() => {
            const header = document.querySelector('mw-branded-header');
            if (header) {
                applyHeaderStyles(header);
                headerObserver = new MutationObserver(() => applyHeaderStyles(header));
                headerObserver.observe(header, { childList: true, subtree: true });
                docObserverHeader.disconnect();
            }
        });
        docObserverHeader.observe(document.body, { childList: true, subtree: true });
    }

    // Nav drawer setup: Observer for dynamic nav
    let navObserver = null;
    const navDrawer = document.querySelector('mw-nav-drawer');
    if (navDrawer) {
        applyNavDrawerStyles(navDrawer);
        navObserver = new MutationObserver(() => applyNavDrawerStyles(navDrawer));
        navObserver.observe(navDrawer, { childList: true, subtree: true });
    } else {
        const docObserverNav = new MutationObserver(() => {
            const navDrawer = document.querySelector('mw-nav-drawer');
            if (navDrawer) {
                applyNavDrawerStyles(navDrawer);
                navObserver = new MutationObserver(() => applyNavDrawerStyles(navDrawer));
                navObserver.observe(navDrawer, { childList: true, subtree: true });
                docObserverNav.disconnect();
            }
        });
        docObserverNav.observe(document.body, { childList: true, subtree: true });
    }

    // cdk-overlay-container setup: Observer for dynamic overlays
    let overlayObserver = null;
    const overlayContainer = document.querySelector('body > div.cdk-overlay-container');
    if (overlayContainer) {
        applyOverlayStyles(overlayContainer);
        overlayObserver = new MutationObserver(() => applyOverlayStyles(overlayContainer));
        overlayObserver.observe(overlayContainer, { childList: true, subtree: true });
    } else {
        const docObserverOverlay = new MutationObserver(() => {
            const overlayContainer = document.querySelector('body > div.cdk-overlay-container');
            if (overlayContainer) {
                applyOverlayStyles(overlayContainer);
                overlayObserver = new MutationObserver(() => applyOverlayStyles(overlayContainer));
                overlayObserver.observe(overlayContainer, { childList: true, subtree: true });
                docObserverOverlay.disconnect();
            }
        });
        docObserverOverlay.observe(document.body, { childList: true, subtree: true });
    }
});
