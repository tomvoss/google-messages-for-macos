use tauri::Manager;
use tauri::menu::{MenuBuilder, SubmenuBuilder, PredefinedMenuItem, MenuItemBuilder, MenuEvent, AboutMetadata};
use tauri::{App, AppHandle};

const WINDOW_URL: &str = "https://messages.google.com/web";
const WINDOW_TITLE: &str = "Google Messages";
const WINDOW_WIDTH: f64 = 1024.0;
const WINDOW_HEIGHT: f64 = 768.0;

pub fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    if cfg!(debug_assertions) {
        app.handle().plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )?;
    }

    let metadata = AboutMetadata::default();

    let menu = MenuBuilder::new(app.handle())
        // Google Messages Menu (macOS-style app menu)
        .item(&SubmenuBuilder::new(app.handle(), "Google Messages")
            .item(&PredefinedMenuItem::about(app.handle(), None, Some(metadata))?)
            .separator()
            .item(&PredefinedMenuItem::quit(app.handle(), Some("Quit Google Messages"))?)
            .build()?)

        // File Menu
        .item(&SubmenuBuilder::new(app.handle(), "File")
            .item(&MenuItemBuilder::new("New Window").id("new_window").build(app.handle())?)
            .item(&PredefinedMenuItem::close_window(app.handle(), Some("Close Window"))?)
            .build()?)

        // Edit Menu (Fix for Command + C/V/X on macOS)
        .item(&SubmenuBuilder::new(app.handle(), "Edit")
            .item(&PredefinedMenuItem::undo(app.handle(), None)?) 
            .item(&PredefinedMenuItem::redo(app.handle(), None)?) 
            .separator() 
            .item(&PredefinedMenuItem::cut(app.handle(), None)?) 
            .item(&PredefinedMenuItem::copy(app.handle(), None)?) 
            .item(&PredefinedMenuItem::paste(app.handle(), None)?) 
            .item(&PredefinedMenuItem::select_all(app.handle(), None)?) 
            .build()?)

        // View Menu (Fixed Zoom, Reload)
        .item(&SubmenuBuilder::new(app.handle(), "View")
            .item(&MenuItemBuilder::new("Reload This Page")
                .id("view_reload")
                .accelerator("CmdOrCtrl+R")
                .build(app.handle())?)
            .separator()
            .item(&MenuItemBuilder::new("Actual Size")
                .id("view_actual_size")
                .accelerator("CmdOrCtrl+0")
                .build(app.handle())?)
            .item(&MenuItemBuilder::new("Zoom In")
                .id("view_zoom_in")
                .accelerator("CmdOrCtrl+Equal")
                .build(app.handle())?)
            .item(&MenuItemBuilder::new("Zoom Out")
                .id("view_zoom_out")
                .accelerator("CmdOrCtrl+-")
                .build(app.handle())?)
            .build()?)

        // History Menu (Fixed Navigation)
        .item(&SubmenuBuilder::new(app.handle(), "History")
            .item(&MenuItemBuilder::new("Home")
                .id("history_home")
                .accelerator("CmdOrCtrl+H")
                .build(app.handle())?)
            .item(&MenuItemBuilder::new("Back")
                .id("history_back")
                .accelerator("CmdOrCtrl+[")
                .build(app.handle())?)
            .item(&MenuItemBuilder::new("Forward")
                .id("history_forward")
                .accelerator("CmdOrCtrl+]")
                .build(app.handle())?)
            .build()?)

        // Window Menu (Fixed "Bring All to Front")
        .item(&SubmenuBuilder::new(app.handle(), "Window")
            .item(&PredefinedMenuItem::minimize(app.handle(), None)?) 
            .item(&MenuItemBuilder::new("Zoom")
                .id("window_zoom")
                .build(app.handle())?)
            .separator()
            .item(&MenuItemBuilder::new("Bring All to Front")
                .id("window_bring_all_to_front")
                .build(app.handle())?)
            .build()?)

        .build()?;

    app.set_menu(menu)?;

    let main_window = app.get_webview_window("main").ok_or("Failed to get main window")?;
    main_window.navigate(WINDOW_URL.parse().map_err(|_| "Invalid URL")?)?;
    Ok(())
}

pub fn on_menu_event(app: &AppHandle, event: MenuEvent) {
    // match event.id().as_ref() {
    //     "new_window" => create_window(app),
    //     "view_reload" => {
    //         if let Some(win) = app.get_webview_window("main") {
    //             let _ = win.reload();
    //         }
    //     }
    //     "history_back" => {
    //         if let Some(win) = app.get_webview_window("main") {
    //             let _ = win.go_back();
    //         }
    //     }
    //     "history_forward" => {
    //         if let Some(win) = app.get_webview_window("main") {
    //             let _ = win.go_forward();
    //         }
    //     }
    //     _ => {}
    // }
    if let Some(win) = app.get_webview_window("main") {
        match event.id().as_ref() {
            "new_window" => create_window(app),
            "view_reload" => {
                let _ = win.eval("window.location.reload();");
            }
            "view_actual_size" => {
                let _ = win.eval("document.body.style.zoom = 1;");
            }
            "view_zoom_in" => {
                let _ = win.eval("document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) + 0.1).toFixed(2);");
            }
            "view_zoom_out" => {
                let _ = win.eval("document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) - 0.1).toFixed(2);");
            }
            "history_home" => {
                let _ = win.eval(&format!("window.location.href = '{}';", WINDOW_URL));
            }
            "history_back" => {
                let _ = win.eval("history.back();");
            }
            "history_forward" => {
                let _ = win.eval("history.forward();");
            }
            "window_zoom" => {
                let _ = win.set_resizable(true);
            }
            "window_bring_all_to_front" => {
                let _ = win.set_focus();
            }
            _ => {}
        }
    }
}

pub fn on_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    match event {
        tauri::WindowEvent::CloseRequested { api, .. } => {
            log::info!("Hiding window on close request");
            window.hide().unwrap(); // Could still fail, but rare
            api.prevent_close();
        }
        _ => {}
    }
}

pub fn create_window(app: &AppHandle) {
    if let Some(existing_window) = app.get_webview_window("main") {
        log::info!("Showing existing window");
        existing_window.show().unwrap();
        existing_window.set_focus().unwrap();
    } else {
        log::info!("Creating new window");
        let window = tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::External(WINDOW_URL.parse().unwrap()))
            .title(WINDOW_TITLE)
            .inner_size(WINDOW_WIDTH, WINDOW_HEIGHT)
            .resizable(true)
            .build()
            .expect("Failed to create window");
        window.show().unwrap();
    }
}