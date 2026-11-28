use super::*;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Serialize, Deserialize)]
struct Snapshot {
    identity: String,
    size: u64,
    modified: String,
    hash: String,
    streams: std::collections::BTreeMap<String, String>,
}
fn identity(path: &Path) -> Result<String, String> {
    ordinary(path)?;
    Ok(format!("{:?}", get_file_id(path).map_err(error)?))
}
fn snapshot(path: &Path) -> Result<Snapshot, String> {
    ordinary(path)?;
    let mut file = source_for_copy(path).map_err(error)?;
    let meta = file.metadata().map_err(error)?;
    if !meta.is_file() {
        return Err("일반 파일만 되돌릴 수 있어요.".into());
    }
    let id = identity(path)?;
    let hash = digest_reader(&mut file)?.to_hex().to_string();
    #[cfg(windows)]
    let streams = alternate_streams(path)?
        .into_iter()
        .map(|(k, v)| (k, v.to_hex().to_string()))
        .collect();
    #[cfg(not(windows))]
    let streams = Default::default();
    let result = Snapshot {
        identity: id,
        size: meta.len(),
        modified: stamp(&meta)?,
        hash,
        streams,
    };
    let current = fs::metadata(path).map_err(error)?;
    if identity(path)? != result.identity
        || stamp(&current)? != result.modified
        || current.len() != result.size
    {
        return Err("확인 중 파일이 변경됐어요. 다시 시도해 주세요.".into());
    }
    Ok(result)
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveRecord {
    pub id: String,
    pub name: String,
    pub source_path: String,
    pub destination_path: String,
    pub time: u64,
    #[serde(default)]
    pub root_path: String,
    pub status: String,
    pub can_undo: bool,
    source_parent: String,
    destination_parent: String,
    saved: Snapshot,
}
#[derive(Default)]
pub(super) struct Recovery {
    path: Option<PathBuf>,
    records: Vec<MoveRecord>,
    failure: Option<String>,
    root: String,
}
impl Recovery {
    fn persist(&self) -> Result<(), String> {
        let Some(path) = &self.path else {
            return Ok(());
        };
        let bytes = serde_json::to_vec(&self.records).map_err(error)?;
        let temp = path.with_extension("pending");
        let mut output = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&temp)
            .map_err(error)?;
        use std::io::Write;
        output.write_all(&bytes).map_err(error)?;
        output.sync_all().map_err(error)?;
        drop(output);
        #[cfg(not(windows))]
        fs::rename(&temp, path).map_err(error)?;
        #[cfg(windows)]
        {
            use std::os::windows::ffi::OsStrExt;
            use windows_sys::Win32::Storage::FileSystem::{
                MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
            };
            let from: Vec<u16> = temp.as_os_str().encode_wide().chain(Some(0)).collect();
            let to: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
            if unsafe {
                MoveFileExW(
                    from.as_ptr(),
                    to.as_ptr(),
                    MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
                )
            } == 0
            {
                return Err(error(io::Error::last_os_error()));
            }
        }
        Ok(())
    }
}
impl Workspace {
    pub fn configure_recovery(&mut self, directory: &Path) -> Result<(), String> {
        let result = (|| {
            fs::create_dir_all(directory).map_err(error)?;
            let path = directory.join("moves-v1.json");
            let mut records: Vec<MoveRecord> = match fs::read(&path) {
                Ok(bytes) => serde_json::from_slice(&bytes).map_err(error)?,
                Err(e) if e.kind() == io::ErrorKind::NotFound => Vec::new(),
                Err(e) => return Err(error(e)),
            };
            // Interrupted moves/restores are kept visible, never guessed or replayed.
            for r in &mut records {
                if r.status == "처리 중" || r.status == "처리 준비" {
                    r.can_undo = false;
                    r.status = "중단된 처리 · 양쪽 위치를 확인해 주세요".into();
                }
            }
            self.recovery = Recovery {
                path: Some(path),
                records,
                failure: None,
                root: String::new(),
            };
            Ok(())
        })();
        if let Err(e) = &result {
            self.recovery.failure =
                Some(format!("이동 기록을 열지 못해 파일 이동을 중지했어요. {e}"));
        }
        result
    }
    pub(super) fn recovery_root(&mut self, path: &str) {
        self.recovery.root = path.into();
    }
    pub fn move_history(&self) -> Result<Vec<MoveRecord>, String> {
        if let Some(e) = &self.recovery.failure {
            return Err(e.clone());
        }
        Ok(self.recovery.records.clone())
    }
    pub fn clear_move_history(&mut self) -> Result<(), String> {
        if self.installing {
            return Err("업데이트 중에는 기록을 변경할 수 없어요.".into());
        }
        if let Some(e) = &self.recovery.failure {
            return Err(e.clone());
        }
        let old = std::mem::take(&mut self.recovery.records);
        if let Err(e) = self.recovery.persist() {
            self.recovery.records = old;
            return Err(e);
        }
        Ok(())
    }
    pub fn move_file(&mut self, source_id: &str, target_id: &str) -> Result<Moved, String> {
        if self.installing {
            return Err("업데이트 설치 중에는 이동할 수 없어요.".into());
        }
        if let Some(e) = &self.recovery.failure {
            return Err(e.clone());
        }
        let source = self.checked(source_id, "file", true)?;
        let folder = self.checked(target_id, "directory", false)?;
        let parent = source.parent().ok_or("원본 폴더가 없어요.")?;
        let destination = folder.join(source.file_name().ok_or("파일명이 없어요.")?);
        if source == destination || destination.try_exists().map_err(error)? {
            return Err("같은 위치이거나 같은 이름이 있어요. 덮어쓰지 않았어요.".into());
        }
        let time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(error)?
            .as_millis() as u64;
        let id = format!(
            "{}-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(error)?
                .as_nanos(),
            self.next
        );
        self.next += 1;
        let record = MoveRecord {
            root_path: self.recovery.root.clone(),
            id: id.clone(),
            name: source.file_name().unwrap().to_string_lossy().into(),
            source_path: source.to_string_lossy().into(),
            destination_path: destination.to_string_lossy().into(),
            time,
            status: "처리 준비".into(),
            can_undo: false,
            source_parent: identity(parent)?,
            destination_parent: identity(&folder)?,
            saved: snapshot(&source)?,
        };
        let previous = self.recovery.records.clone();
        self.recovery.records.insert(0, record);
        self.recovery.records.truncate(100);
        // A durable intent must exist before touching the file.
        if let Err(e) = self.recovery.persist() {
            self.recovery.records = previous;
            return Err(format!("기록을 저장하지 못해 이동하지 않았어요. {e}"));
        }
        match self.move_unrecorded(source_id, target_id) {
            Ok(mut moved) => {
                let saved = snapshot(&destination);
                let r = &mut self.recovery.records[0];
                r.status = "이동 완료".into();
                if let Ok(saved) = saved {
                    r.saved = saved;
                    r.can_undo = true;
                } else {
                    r.status = "이동 완료 · 되돌리기 확인 불가".into();
                }
                moved.undo_id = id;
                if let Err(e) = self.recovery.persist() {
                    rerecord_failure(&mut self.recovery, e);
                    moved.status = "이동 완료 · 기록 저장 실패".into();
                }
                Ok(moved)
            }
            Err(e) => {
                self.recovery.records[0].status = format!("처리 실패 · {e}");
                if let Err(save) = self.recovery.persist() {
                    rerecord_failure(&mut self.recovery, save);
                }
                Err(e)
            }
        }
    }
    pub fn undo_move(&mut self, id: &str) -> Result<Moved, String> {
        if self.installing {
            return Err("업데이트 중에는 되돌릴 수 없어요.".into());
        }
        if let Some(e) = &self.recovery.failure {
            return Err(e.clone());
        }
        let index = self
            .recovery
            .records
            .iter()
            .position(|r| r.id == id)
            .ok_or("이동 기록이 없어요.")?;
        let record = self.recovery.records[index].clone();
        if !record.can_undo {
            return Err("이 기록은 되돌릴 수 없어요.".into());
        }
        let source = PathBuf::from(&record.destination_path);
        let original = PathBuf::from(&record.source_path);
        let parent = original.parent().ok_or("원래 폴더가 없어요.")?;
        if identity(parent)? != record.source_parent
            || identity(source.parent().ok_or("현재 폴더가 없어요.")?)? != record.destination_parent
        {
            return Err("폴더가 교체됐어요. 직접 위치를 확인해 주세요.".into());
        }
        if original.try_exists().map_err(error)? {
            return Err("원래 위치에 같은 이름이 있어요. 덮어쓰지 않았어요.".into());
        }
        let current = snapshot(&source)?;
        if current.identity != record.saved.identity
            || current.hash != record.saved.hash
            || current.size != record.saved.size
            || current.modified != record.saved.modified
            || current.streams != record.saved.streams
        {
            return Err("이동 후 파일이 수정되거나 교체됐어요. 되돌리지 않았어요.".into());
        }
        let file = self.track(&source)?;
        let folder = self.track(parent)?;
        self.recovery.records[index].can_undo = false;
        self.recovery.records[index].status = "처리 중".into();
        if let Err(e) = self.recovery.persist() {
            self.recovery.records[index] = record;
            return Err(e);
        }
        // Same exclusive move and cross-volume verification as a forward move.
        match self.move_unrecorded(&file.id, &folder.id) {
            Ok(mut moved) => {
                self.recovery.records[index].status = "되돌리기 완료".into();
                moved.undo_id = id.into();
                if let Err(e) = self.recovery.persist() {
                    rerecord_failure(&mut self.recovery, e);
                }
                Ok(moved)
            }
            Err(e) => {
                self.recovery.records[index].status = format!("되돌리기 중단 · {e}");
                if let Err(save) = self.recovery.persist() {
                    rerecord_failure(&mut self.recovery, save);
                }
                Err(e)
            }
        }
    }
}
fn rerecord_failure(store: &mut Recovery, e: String) {
    store.failure = Some(format!(
        "파일 처리 후 기록을 저장하지 못했어요. 추가 이동을 중지했어요. {e}"
    ));
}

#[cfg(test)]
mod tests {
    use super::*;
    fn setup() -> (tempfile::TempDir, Workspace, Entry, Entry) {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir(dir.path().join("원본")).unwrap();
        fs::create_dir(dir.path().join("대상")).unwrap();
        fs::write(
            dir.path().join("원본/공사_보고서.pdf"),
            b"original contents",
        )
        .unwrap();
        let mut ws = Workspace::default();
        ws.configure_recovery(&dir.path().join("app-data")).unwrap();
        let folder = ws.connect(&dir.path().join("대상")).unwrap();
        let file = ws
            .import_files(&[dir.path().join("원본/공사_보고서.pdf")])
            .unwrap()
            .remove(0);
        (dir, ws, file, folder)
    }
    #[test]
    fn restores_after_restart_and_reconnect() {
        let (dir, mut ws, file, folder) = setup();
        let moved = ws.move_file(&file.id, &folder.id).unwrap();
        drop(ws);
        let mut ws = Workspace::default();
        ws.configure_recovery(&dir.path().join("app-data")).unwrap();
        ws.connect(&dir.path().join("대상")).unwrap();
        let restored = ws.undo_move(&moved.undo_id).unwrap();
        assert_eq!(
            fs::read(&restored.destination_path).unwrap(),
            b"original contents"
        );
        assert!(!Path::new(&moved.destination_path).exists());
        assert!(ws.undo_move(&moved.undo_id).is_err());
    }
    #[test]
    fn undo_never_overwrites_new_original() {
        let (_dir, mut ws, file, folder) = setup();
        let moved = ws.move_file(&file.id, &folder.id).unwrap();
        fs::write(&file.path, b"new file").unwrap();
        assert!(ws.undo_move(&moved.undo_id).is_err());
        assert_eq!(fs::read(&file.path).unwrap(), b"new file");
        assert!(Path::new(&moved.destination_path).exists());
    }
    #[test]
    fn edited_or_replaced_destination_is_not_restored() {
        let (_dir, mut ws, file, folder) = setup();
        let moved = ws.move_file(&file.id, &folder.id).unwrap();
        fs::write(&moved.destination_path, b"edited contents!").unwrap();
        assert!(ws.undo_move(&moved.undo_id).is_err());
        assert!(!Path::new(&file.path).exists());
    }
    #[test]
    fn same_size_edit_with_preserved_timestamp_is_blocked() {
        let (_dir, mut ws, file, folder) = setup();
        let moved = ws.move_file(&file.id, &folder.id).unwrap();
        let modified = fs::metadata(&moved.destination_path)
            .unwrap()
            .modified()
            .unwrap();
        let bytes = fs::read(&moved.destination_path).unwrap();
        fs::write(&moved.destination_path, vec![b'x'; bytes.len()]).unwrap();
        File::options()
            .write(true)
            .open(&moved.destination_path)
            .unwrap()
            .set_times(fs::FileTimes::new().set_modified(modified))
            .unwrap();
        assert!(ws.undo_move(&moved.undo_id).is_err());
        assert!(!Path::new(&file.path).exists());
    }
    #[test]
    fn replaced_original_directory_is_blocked() {
        let (_dir, mut ws, file, folder) = setup();
        let moved = ws.move_file(&file.id, &folder.id).unwrap();
        let parent = Path::new(&file.path).parent().unwrap();
        fs::rename(parent, parent.with_file_name("예전폴더")).unwrap();
        fs::create_dir(parent).unwrap();
        assert!(ws.undo_move(&moved.undo_id).is_err());
        assert!(Path::new(&moved.destination_path).exists());
    }
    #[test]
    fn missing_share_can_be_retried_without_losing_record() {
        let (_dir, mut ws, file, folder) = setup();
        let moved = ws.move_file(&file.id, &folder.id).unwrap();
        let source = Path::new(&file.path);
        let parent = source.parent().unwrap();
        let renamed = parent.with_file_name("일시오프라인");
        fs::rename(parent, &renamed).unwrap();
        assert!(ws.undo_move(&moved.undo_id).is_err());
        assert!(ws.move_history().unwrap()[0].can_undo);
        fs::rename(renamed, parent).unwrap();
        assert!(ws.undo_move(&moved.undo_id).is_ok());
    }
    #[test]
    fn corrupt_history_blocks_moves_without_deleting_evidence() {
        let (dir, _, file, folder) = setup();
        let data = dir.path().join("app-data");
        fs::write(data.join("moves-v1.json"), b"broken").unwrap();
        let mut ws = Workspace::default();
        assert!(ws.configure_recovery(&data).is_err());
        let folder = ws.track(Path::new(&folder.path)).unwrap();
        let file = ws.track(Path::new(&file.path)).unwrap();
        assert!(ws.move_file(&file.id, &folder.id).is_err());
        assert!(Path::new(&file.path).exists());
    }
    #[test]
    fn record_storage_failure_prevents_file_move() {
        let (dir, mut ws, file, folder) = setup();
        fs::remove_dir(dir.path().join("app-data")).unwrap();
        assert!(ws.move_file(&file.id, &folder.id).is_err());
        assert!(Path::new(&file.path).exists());
    }
    #[test]
    fn clearing_records_does_not_touch_files() {
        let (_dir, mut ws, file, folder) = setup();
        let moved = ws.move_file(&file.id, &folder.id).unwrap();
        ws.clear_move_history().unwrap();
        assert!(ws.move_history().unwrap().is_empty());
        assert!(Path::new(&moved.destination_path).exists());
        assert!(ws.undo_move(&moved.undo_id).is_err());
    }
    #[cfg(windows)]
    #[test]
    fn changed_alternate_stream_blocks_undo() {
        let (_dir, mut ws, file, folder) = setup();
        fs::write(format!("{}:metadata", file.path), b"first").unwrap();
        let file = ws.track(Path::new(&file.path)).unwrap();
        let moved = ws.move_file(&file.id, &folder.id).unwrap();
        let modified = fs::metadata(&moved.destination_path)
            .unwrap()
            .modified()
            .unwrap();
        fs::write(format!("{}:metadata", moved.destination_path), b"second").unwrap();
        File::options()
            .write(true)
            .open(&moved.destination_path)
            .unwrap()
            .set_times(fs::FileTimes::new().set_modified(modified))
            .unwrap();
        assert!(ws.undo_move(&moved.undo_id).is_err());
    }
}
