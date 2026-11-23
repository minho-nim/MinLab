use crate::filesystem::{Entry, Moved, Page, Workspace};
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri_plugin_opener::OpenerExt;
type Shared = Arc<Mutex<Workspace>>;
async fn work<T: Send + 'static>(
    state: &Shared,
    task: impl FnOnce(&mut Workspace) -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    let shared = state.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut ws = shared
            .lock()
            .map_err(|_| "파일 작업을 다시 시작해 주세요.".to_string())?;
        task(&mut ws)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn connect_root(state: tauri::State<'_, Shared>, path: String) -> Result<Entry, String> {
    work(&state, move |ws| ws.connect(&PathBuf::from(path))).await
}
#[tauri::command]
async fn import_files(
    state: tauri::State<'_, Shared>,
    paths: Vec<PathBuf>,
) -> Result<Vec<Entry>, String> {
    work(&state, move |ws| ws.import_files(&paths)).await
}
#[tauri::command]
async fn list_directory(
    state: tauri::State<'_, Shared>,
    id: String,
    reset: bool,
) -> Result<Page, String> {
    work(&state, move |ws| ws.list(&id, reset)).await
}
#[tauri::command]
async fn move_file(
    state: tauri::State<'_, Shared>,
    source_id: String,
    target_id: String,
) -> Result<Moved, String> {
    work(&state, move |ws| ws.move_file(&source_id, &target_id)).await
}
#[tauri::command]
async fn open_entry(
    app: tauri::AppHandle,
    state: tauri::State<'_, Shared>,
    id: String,
    directory: bool,
) -> Result<(), String> {
    let path = work(&state, move |ws| ws.openable(&id, directory)).await?;
    app.opener()
        .open_path(path.to_string_lossy(), None::<&str>)
        .map_err(|e| format!("기본 프로그램으로 열지 못했어요. {e}"))
}
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Shared::default())
        .invoke_handler(tauri::generate_handler![
            connect_root,
            import_files,
            list_directory,
            move_file,
            open_entry
        ])
        .run(tauri::generate_context!())
        .expect("MinFolder를 시작하지 못했습니다.");
}
