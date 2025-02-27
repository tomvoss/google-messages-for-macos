// Hides the console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let mut builder = tauri::Builder::default();
    builder = builder.setup(|app| app_lib::setup(app));
    builder = builder.on_menu_event(|app, event| app_lib::on_menu_event(app, event));
    builder = builder.on_window_event(|window, event| app_lib::on_window_event(window, event));
    builder
        .build(tauri::generate_context!())
        .expect("failed to build app")
        .run(|app, event| match event {
            tauri::RunEvent::Reopen { .. } => {
                log::info!("Dock click detected");
                app_lib::create_window(app);
            }
            _ => {}
        });
}