use file_id::{get_file_id, FileId};
use serde::Serialize;
#[cfg(not(windows))]
use std::io::Write;
use std::{
    collections::HashMap,
    fs::{self, File, OpenOptions, ReadDir},
    io::{self, Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

#[derive(Clone, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub path: String,
    pub name: String,
    pub kind: String,
    pub size: u64,
    pub modified: String,
}
struct Tracked {
    entry: Entry,
    path: PathBuf,
    identity: FileId,
}
#[derive(Serialize)]
pub struct Page {
    pub entries: Vec<Entry>,
    pub done: bool,
    pub skipped: usize,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Moved {
    pub source_path: String,
    pub destination_path: String,
    pub name: String,
    pub status: String,
}
#[derive(Default)]
pub struct Workspace {
    next: u64,
    tracked: HashMap<String, Tracked>,
    by_path: HashMap<PathBuf, String>,
    iterators: HashMap<String, ReadDir>,
}
fn error(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn stamp(metadata: &fs::Metadata) -> Result<String, String> {
    Ok(metadata
        .modified()
        .map_err(error)?
        .duration_since(UNIX_EPOCH)
        .map_err(error)?
        .as_nanos()
        .to_string())
}
fn ordinary(path: &Path) -> Result<(), String> {
    let meta = fs::symlink_metadata(path).map_err(error)?;
    if meta.file_type().is_symlink() {
        return Err("바로가기·심볼릭 링크는 직접 처리하지 않아요.".into());
    }
    // Junctions and other reparse points may lead outside the selected tree.
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if meta.file_attributes() & 0x400 != 0 {
            return Err("연결 폴더·재분석 지점은 제외해요.".into());
        }
    }
    if !meta.is_file() && !meta.is_dir() {
        return Err("일반 파일·폴더만 처리할 수 있어요.".into());
    }
    Ok(())
}
impl Workspace {
    fn track(&mut self, path: &Path) -> Result<Entry, String> {
        ordinary(path)?;
        let path = fs::canonicalize(path).map_err(error)?;
        let identity = get_file_id(&path).map_err(error)?;
        let meta = fs::metadata(&path).map_err(error)?;
        let kind = if meta.is_dir() { "directory" } else { "file" };
        // Reuse unchanged entries so a refresh does not invalidate queued files.
        let modified = stamp(&meta)?;
        if let Some(old) = self.by_path.get(&path).and_then(|id| self.tracked.get(id)) {
            if old.identity == identity
                && (kind == "directory"
                    || (old.entry.size == meta.len() && old.entry.modified == modified))
            {
                return Ok(old.entry.clone());
            }
        }
        self.next += 1;
        let entry = Entry {
            id: self.next.to_string(),
            path: path.to_string_lossy().into_owned(),
            name: path
                .file_name()
                .unwrap_or(path.as_os_str())
                .to_string_lossy()
                .into_owned(),
            kind: kind.into(),
            size: meta.len(),
            modified,
        };
        self.by_path.insert(path.clone(), entry.id.clone());
        self.tracked.insert(
            entry.id.clone(),
            Tracked {
                entry: entry.clone(),
                path,
                identity,
            },
        );
        Ok(entry)
    }
    fn checked(&self, id: &str, kind: &str, unchanged: bool) -> Result<PathBuf, String> {
        let tracked = self.tracked.get(id).ok_or("항목을 다시 선택해 주세요.")?;
        ordinary(&tracked.path)?;
        let current = get_file_id(&tracked.path).map_err(error)?;
        if current != tracked.identity || tracked.entry.kind != kind {
            return Err("항목이 바뀌었어요. 다시 선택해 주세요.".into());
        }
        if unchanged {
            let meta = fs::metadata(&tracked.path).map_err(error)?;
            if meta.len() != tracked.entry.size || stamp(&meta)? != tracked.entry.modified {
                return Err("원본이 변경됐어요. 다시 추가해 주세요.".into());
            }
        }
        Ok(tracked.path.clone())
    }
    pub fn connect(&mut self, path: &Path) -> Result<Entry, String> {
        let entry = self.track(path)?;
        if entry.kind != "directory" {
            return Err("폴더를 선택해 주세요.".into());
        }
        self.iterators.clear();
        self.tracked.retain(|id, _| *id == entry.id);
        self.by_path.retain(|_, id| *id == entry.id);
        Ok(entry)
    }
    pub fn import_files(&mut self, paths: &[PathBuf]) -> Result<Vec<Entry>, String> {
        // Validate the complete selection before returning any queue entries.
        paths
            .iter()
            .map(|path| {
                let entry = self.track(path)?;
                if entry.kind != "file" {
                    return Err("폴더 대신 파일을 선택해 주세요.".into());
                }
                Ok(entry)
            })
            .collect()
    }
    pub fn list(&mut self, id: &str, reset: bool) -> Result<Page, String> {
        let path = self.checked(id, "directory", false)?;
        if reset || !self.iterators.contains_key(id) {
            self.iterators
                .insert(id.into(), fs::read_dir(path).map_err(error)?);
        }
        let mut entries = Vec::new();
        let mut done = false;
        let mut skipped = 0;
        // Bound disk work as well as visible entries, including excluded links.
        for _ in 0..100 {
            let next = self.iterators.get_mut(id).unwrap().next();
            match next {
                None => {
                    done = true;
                    break;
                }
                Some(Ok(item)) => match self.track(&item.path()) {
                    Ok(entry) => entries.push(entry),
                    Err(_) => skipped += 1,
                },
                Some(Err(_)) => skipped += 1,
            }
        }
        if done {
            self.iterators.remove(id);
        }
        Ok(Page {
            entries,
            done,
            skipped,
        })
    }
    pub fn openable(&self, id: &str, directory: bool) -> Result<PathBuf, String> {
        let path = self.checked(id, if directory { "directory" } else { "file" }, false)?;
        if !directory {
            let ext = path
                .extension()
                .unwrap_or_default()
                .to_string_lossy()
                .to_lowercase();
            let documents = [
                "doc", "docx", "xls", "xlsx", "ppt", "pptx", "pdf", "hwp", "hwpx", "txt", "csv",
                "rtf", "png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff", "mp3", "wav",
                "mp4", "mov", "zip",
            ];
            if !documents.contains(&ext.as_str()) {
                return Err("이 형식은 폴더 열기로 탐색기에서 직접 열어 주세요.".into());
            }
        }
        Ok(path)
    }
    pub fn move_file(&mut self, source_id: &str, target_id: &str) -> Result<Moved, String> {
        let source = self.checked(source_id, "file", true)?;
        let folder = self.checked(target_id, "directory", false)?;
        let name = source.file_name().ok_or("파일 이름을 확인할 수 없어요.")?;
        let target = folder.join(name);
        if source == target {
            return Err("이미 이 폴더에 있는 파일이에요.".into());
        }
        if fs::symlink_metadata(&target).is_ok() {
            return Err("같은 이름의 파일 또는 폴더가 있어요. 덮어쓰지 않았어요.".into());
        }
        match rename_exclusive(&source, &target) {
            Ok(()) => {}
            Err(e) if is_cross_device(&e) => {
                self.copy_verified(source_id, target_id, &source, &target)?;
            }
            Err(e) => return Err(format!("이동하지 못했어요. 원본 위치를 확인해 주세요. {e}")),
        }
        Ok(Moved {
            source_path: source.to_string_lossy().into_owned(),
            destination_path: target.to_string_lossy().into_owned(),
            name: name.to_string_lossy().into_owned(),
            status: "이동 완료".into(),
        })
    }
    fn copy_verified(
        &self,
        source_id: &str,
        target_id: &str,
        source: &Path,
        target: &Path,
    ) -> Result<(), String> {
        let run = || -> Result<(), String> {
            // Keep the destination directory from being renamed during publication on Windows.
            let _folder_guard =
                directory_guard(target.parent().ok_or("목적지 폴더가 없어요.")?).map_err(error)?;
            #[cfg(windows)]
            copy_exclusive(source, target).map_err(error)?;
            let mut input = source_for_copy(source).map_err(error)?;
            self.checked(source_id, "file", true)?;
            let mut options = OpenOptions::new();
            options.read(true).write(true);
            #[cfg(windows)]
            {
                use std::os::windows::fs::OpenOptionsExt;
                options.share_mode(windows_sys::Win32::Storage::FileSystem::FILE_SHARE_READ);
            }
            #[cfg(not(windows))]
            options.create_new(true);
            let mut output = options.open(target).map_err(error)?;
            let expected_hash;
            #[cfg(windows)]
            {
                // Native copy preserves Windows attributes and alternate data streams.
                expected_hash = digest_reader(&mut input)?;
            }
            #[cfg(not(windows))]
            {
                let mut hash = blake3::Hasher::new();
                let mut buffer = vec![0; 1024 * 1024];
                loop {
                    let count = input.read(&mut buffer).map_err(error)?;
                    if count == 0 {
                        break;
                    }
                    hash.update(&buffer[..count]);
                    output.write_all(&buffer[..count]).map_err(error)?;
                }
                expected_hash = hash.finalize();
            }
            output.sync_all().map_err(error)?;
            let saved_identity = get_file_id(target).map_err(error)?;
            output.seek(SeekFrom::Start(0)).map_err(error)?;
            let saved_hash = digest_reader(&mut output)?;
            if expected_hash != saved_hash {
                return Err("복사 내용이 일치하지 않아요.".into());
            }
            self.checked(source_id, "file", true)?;
            self.checked(target_id, "directory", false)?;
            input.seek(SeekFrom::Start(0)).map_err(error)?;
            if digest_reader(&mut input)? != saved_hash
                || saved_identity != get_file_id(target).map_err(error)?
            {
                return Err("복사 중 파일이 바뀌었어요.".into());
            }
            #[cfg(windows)]
            if alternate_streams(source)? != alternate_streams(target)? {
                return Err("파일의 추가 데이터가 일치하지 않아요. 원본을 유지해요.".into());
            }
            self.checked(source_id, "file", true)?;
            remove_copied_source(&input, source).map_err(error)?;
            Ok(())
        };
        run().map_err(|e| format!("다른 드라이브로 이동 중 중단됐어요. 원본과 목적지를 확인해 주세요. 복사본이 남아 있을 수 있어요. {e}"))
    }
}
fn digest_reader(file: &mut File) -> Result<blake3::Hash, String> {
    let mut hash = blake3::Hasher::new();
    let mut buffer = vec![0; 1024 * 1024];
    loop {
        let n = file.read(&mut buffer).map_err(error)?;
        if n == 0 {
            break;
        }
        hash.update(&buffer[..n]);
    }
    Ok(hash.finalize())
}
#[cfg(windows)]
fn source_for_copy(path: &Path) -> io::Result<File> {
    use std::os::windows::fs::OpenOptionsExt;
    use windows_sys::Win32::Storage::FileSystem::{DELETE, FILE_GENERIC_READ, FILE_SHARE_READ};
    // Deny concurrent writes/deletes; deletion uses this same handle after verification.
    OpenOptions::new()
        .access_mode(FILE_GENERIC_READ | DELETE)
        .share_mode(FILE_SHARE_READ)
        .open(path)
}
#[cfg(not(windows))]
fn source_for_copy(path: &Path) -> io::Result<File> {
    File::open(path)
}
#[cfg(windows)]
fn directory_guard(path: &Path) -> io::Result<Option<File>> {
    use std::os::windows::fs::OpenOptionsExt;
    use windows_sys::Win32::Storage::FileSystem::{
        FILE_FLAG_BACKUP_SEMANTICS, FILE_SHARE_READ, FILE_SHARE_WRITE,
    };
    OpenOptions::new()
        .access_mode(0)
        .share_mode(FILE_SHARE_READ | FILE_SHARE_WRITE)
        .custom_flags(FILE_FLAG_BACKUP_SEMANTICS)
        .open(path)
        .map(Some)
}
#[cfg(not(windows))]
fn directory_guard(_: &Path) -> io::Result<Option<File>> {
    Ok(None)
}
#[cfg(windows)]
fn remove_copied_source(file: &File, _: &Path) -> io::Result<()> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::Storage::FileSystem::{
        FileDispositionInfo, SetFileInformationByHandle, FILE_DISPOSITION_INFO,
    };
    let info = FILE_DISPOSITION_INFO { DeleteFile: 1 };
    let ok = unsafe {
        SetFileInformationByHandle(
            file.as_raw_handle(),
            FileDispositionInfo,
            &info as *const _ as *const _,
            std::mem::size_of_val(&info) as u32,
        )
    };
    if ok == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}
#[cfg(not(windows))]
fn remove_copied_source(_: &File, path: &Path) -> io::Result<()> {
    fs::remove_file(path)
}
#[cfg(windows)]
fn copy_exclusive(source: &Path, target: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::CopyFileW;
    let from: Vec<u16> = source.as_os_str().encode_wide().chain(Some(0)).collect();
    let to: Vec<u16> = target.as_os_str().encode_wide().chain(Some(0)).collect();
    if unsafe { CopyFileW(from.as_ptr(), to.as_ptr(), 1) } == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}
#[cfg(windows)]
fn alternate_streams(
    path: &Path,
) -> Result<std::collections::BTreeMap<String, blake3::Hash>, String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::{
        Foundation::{HANDLE, INVALID_HANDLE_VALUE},
        Storage::FileSystem::{
            FindClose, FindFirstStreamW, FindNextStreamW, FindStreamInfoStandard,
            WIN32_FIND_STREAM_DATA,
        },
    };
    struct Streams(HANDLE);
    impl Drop for Streams {
        fn drop(&mut self) {
            unsafe {
                FindClose(self.0);
            }
        }
    }
    let wide: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    let mut data: WIN32_FIND_STREAM_DATA = unsafe { std::mem::zeroed() };
    let handle = unsafe {
        FindFirstStreamW(
            wide.as_ptr(),
            FindStreamInfoStandard,
            &mut data as *mut _ as *mut _,
            0,
        )
    };
    if handle == INVALID_HANDLE_VALUE {
        let e = io::Error::last_os_error();
        if e.raw_os_error() == Some(38) {
            return Ok(Default::default());
        }
        return Err(error(e));
    }
    let guard = Streams(handle);
    let mut result = std::collections::BTreeMap::new();
    loop {
        let end = data
            .cStreamName
            .iter()
            .position(|c| *c == 0)
            .unwrap_or(data.cStreamName.len());
        let name = String::from_utf16(&data.cStreamName[..end]).map_err(error)?;
        if name != "::$DATA" {
            let mut stream = path.as_os_str().to_os_string();
            stream.push(&name);
            result.insert(
                name,
                digest_reader(&mut File::open(Path::new(&stream)).map_err(error)?)?,
            );
        }
        if unsafe { FindNextStreamW(guard.0, &mut data as *mut _ as *mut _) } == 0 {
            let e = io::Error::last_os_error();
            if e.raw_os_error() != Some(38) {
                return Err(error(e));
            }
            break;
        }
    }
    Ok(result)
}
fn is_cross_device(e: &io::Error) -> bool {
    #[cfg(windows)]
    {
        e.raw_os_error() == Some(17)
    }
    #[cfg(not(windows))]
    {
        e.raw_os_error() == Some(18)
    }
}
#[cfg(windows)]
fn rename_exclusive(source: &Path, target: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{MoveFileExW, MOVEFILE_WRITE_THROUGH};
    let from: Vec<u16> = source.as_os_str().encode_wide().chain(Some(0)).collect();
    let to: Vec<u16> = target.as_os_str().encode_wide().chain(Some(0)).collect();
    // No REPLACE_EXISTING or COPY_ALLOWED: collision fails, cross-volume is verified separately.
    if unsafe { MoveFileExW(from.as_ptr(), to.as_ptr(), MOVEFILE_WRITE_THROUGH) } == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}
#[cfg(not(windows))]
fn rename_exclusive(source: &Path, target: &Path) -> io::Result<()> {
    // Atomic no-replace publication for regular files on the same filesystem.
    fs::hard_link(source, target)?;
    fs::remove_file(source)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn setup() -> (tempfile::TempDir, Workspace, Entry, Entry) {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir(dir.path().join("대상")).unwrap();
        fs::write(dir.path().join("공사_작업절차서.docx"), b"document").unwrap();
        let mut ws = Workspace::default();
        let target = ws.connect(&dir.path().join("대상")).unwrap();
        let file = ws
            .import_files(&[dir.path().join("공사_작업절차서.docx")])
            .unwrap()
            .remove(0);
        (dir, ws, file, target)
    }
    #[test]
    fn moves_without_rewriting_contents() {
        let (dir, mut ws, file, target) = setup();
        let result = ws.move_file(&file.id, &target.id).unwrap();
        assert!(!Path::new(&file.path).exists());
        assert_eq!(fs::read(result.destination_path).unwrap(), b"document");
        assert!(dir.path().exists());
    }
    #[test]
    fn collision_preserves_both_files() {
        let (_dir, mut ws, file, target) = setup();
        fs::write(Path::new(&target.path).join(&file.name), b"existing").unwrap();
        assert!(ws.move_file(&file.id, &target.id).is_err());
        assert_eq!(fs::read(&file.path).unwrap(), b"document");
        assert_eq!(
            fs::read(Path::new(&target.path).join(&file.name)).unwrap(),
            b"existing"
        );
    }
    #[test]
    fn modified_source_requires_reselection() {
        let (_dir, mut ws, file, target) = setup();
        fs::write(&file.path, b"changed document").unwrap();
        assert!(ws.move_file(&file.id, &target.id).is_err());
        assert!(!Path::new(&target.path).join(&file.name).exists());
    }
    #[test]
    fn replaced_target_requires_reselection() {
        let (_dir, mut ws, file, target) = setup();
        fs::rename(&target.path, format!("{}-old", target.path)).unwrap();
        fs::create_dir(&target.path).unwrap();
        assert!(ws.move_file(&file.id, &target.id).is_err());
        assert!(Path::new(&file.path).exists());
    }
    #[test]
    fn listing_is_bounded_and_continues() {
        let dir = tempfile::tempdir().unwrap();
        for n in 0..205 {
            fs::write(dir.path().join(format!("{n}.txt")), b"").unwrap();
        }
        let mut ws = Workspace::default();
        let root = ws.connect(dir.path()).unwrap();
        let first = ws.list(&root.id, true).unwrap();
        assert_eq!(first.entries.len(), 100);
        assert!(!first.done);
        let second = ws.list(&root.id, false).unwrap();
        assert_eq!(second.entries.len(), 100);
        let last = ws.list(&root.id, false).unwrap();
        assert_eq!(last.entries.len(), 5);
        assert!(last.done);
    }
    #[test]
    fn verified_copy_keeps_source_until_complete() {
        let (_dir, ws, file, target) = setup();
        let destination = Path::new(&target.path).join(&file.name);
        ws.copy_verified(&file.id, &target.id, Path::new(&file.path), &destination)
            .unwrap();
        assert!(!Path::new(&file.path).exists());
        assert_eq!(fs::read(destination).unwrap(), b"document");
    }
    #[cfg(unix)]
    #[test]
    fn symlink_is_not_imported() {
        let (dir, mut ws, file, _) = setup();
        let link = dir.path().join("link");
        std::os::unix::fs::symlink(&file.path, &link).unwrap();
        assert!(ws.import_files(&[link]).is_err());
    }
    #[test]
    fn same_folder_is_rejected() {
        let (dir, mut ws, _file, _) = setup();
        let root = ws.connect(dir.path()).unwrap();
        let file = ws
            .import_files(&[dir.path().join("공사_작업절차서.docx")])
            .unwrap()
            .remove(0);
        assert!(ws.move_file(&file.id, &root.id).is_err());
        assert_eq!(fs::read(&file.path).unwrap(), b"document");
    }
    #[test]
    fn executable_is_not_launched_as_a_document() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("run.cmd"), b"echo test").unwrap();
        let mut ws = Workspace::default();
        let file = ws
            .import_files(&[dir.path().join("run.cmd")])
            .unwrap()
            .remove(0);
        assert!(ws.openable(&file.id, false).is_err());
    }
    #[test]
    fn copy_collision_never_overwrites_or_deletes() {
        let (_dir, ws, file, target) = setup();
        let destination = Path::new(&target.path).join(&file.name);
        fs::write(&destination, b"existing").unwrap();
        assert!(ws
            .copy_verified(&file.id, &target.id, Path::new(&file.path), &destination)
            .is_err());
        assert_eq!(fs::read(&file.path).unwrap(), b"document");
        assert_eq!(fs::read(destination).unwrap(), b"existing");
    }
    #[test]
    fn first_page_does_not_descend_into_subfolders() {
        let dir = tempfile::tempdir().unwrap();
        let deep = dir.path().join("깊은폴더");
        fs::create_dir(&deep).unwrap();
        for n in 0..1000 {
            fs::write(deep.join(format!("{n}.txt")), b"").unwrap();
        }
        let mut ws = Workspace::default();
        let root = ws.connect(dir.path()).unwrap();
        let start = std::time::Instant::now();
        let page = ws.list(&root.id, true).unwrap();
        assert_eq!(page.entries.len(), 1);
        assert_eq!(ws.tracked.len(), 2);
        eprintln!(
            "root listing with 1,000 nested files: {:?}; nested files read: 0",
            start.elapsed()
        );
    }
    #[test]
    fn directory_id_survives_content_changes_during_a_batch() {
        let (dir, mut ws, file, target) = setup();
        // Directory timestamps change as files arrive; queued targets must retain their IDs.
        ws.move_file(&file.id, &target.id).unwrap();
        let after = ws.track(Path::new(&target.path)).unwrap();
        assert_eq!(after.id, target.id);
        let second_path = dir.path().join("second.txt");
        fs::write(&second_path, b"second").unwrap();
        let second = ws.import_files(&[second_path]).unwrap().remove(0);
        ws.move_file(&second.id, &target.id).unwrap();
        assert!(Path::new(&target.path).join("second.txt").exists());
    }
    #[cfg(windows)]
    #[test]
    fn cross_volume_copy_preserves_windows_alternate_streams() {
        let (_dir, mut ws, file, target) = setup();
        fs::write(
            format!("{}:Zone.Identifier", file.path),
            b"[ZoneTransfer]\r\nZoneId=3\r\n",
        )
        .unwrap();
        let file = ws
            .import_files(&[PathBuf::from(&file.path)])
            .unwrap()
            .remove(0);
        let destination = Path::new(&target.path).join(&file.name);
        ws.copy_verified(&file.id, &target.id, Path::new(&file.path), &destination)
            .unwrap();
        assert_eq!(
            fs::read(format!("{}:Zone.Identifier", destination.to_string_lossy())).unwrap(),
            b"[ZoneTransfer]\r\nZoneId=3\r\n"
        );
        assert!(!Path::new(&file.path).exists());
    }
}
