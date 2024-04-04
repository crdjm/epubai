// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;

use std::path::PathBuf;
// use tauri::api::file;
use tauri::api::path::cache_dir;
// use std::io::{stdout, Write};
// use std::fs::File;
use zip_extensions::*;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, expand])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[tauri::command]
fn expand(name: &str) -> String {
    println!("The name param is {}", name);

    // I clearly don't understand RUST file handling, specifically the need to keep cloning things
    // Will reseatch and update in the future

    let name_path = PathBuf::from(name);

    match cache_dir() {
        Some(path) => {
            let base = name_path.file_name().expect("no basename");
            let mut dest = PathBuf::from(path);
            dest.push("epubai");
            let folder = dest.clone();
            fs::create_dir_all(dest.clone()).expect("Failed to create");

            dest.push(base);

            let result = fs::copy(name, dest.clone());

            let archive_file: PathBuf = dest.clone();
            let target_dir: PathBuf = folder;
            zip_extract(&archive_file, &target_dir).expect("Failed to extract");

            println!("The result is {:?} basename {:?} file ", result, base);
        }
        None => {
            println!("The cache dir is None");
        }
    }

    // println!("The result is {:?}", result);
    // println!("The cache dir is {}", cache_dir().expect('TEST').to_str());
    format!("Expand, {}!", name)
}
