// Roadmap Builder desktop shell. The app itself is the same static web app as the browser build; this only
// gives it a window and a native Save dialog (the dialog and file plugins, used by saveFile in app.js).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("Roadmap Builder could not start");
}
