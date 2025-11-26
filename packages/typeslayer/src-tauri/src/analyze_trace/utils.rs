use std::fs;
use std::path::Path;

pub fn is_directory(path: &str) -> bool {
    Path::new(path).is_dir()
}

pub fn path_exists(path: &str) -> bool {
    Path::new(path).exists()
}
