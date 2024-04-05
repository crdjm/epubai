// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;

use std::path::Path;
use std::path::PathBuf;
// use tauri::api::file;
use tauri::api::path::cache_dir;
// use std::io::{stdout, Write};
// use std::fs::File;
use zip_extensions::*;

use std::fs::File;
use std::io::{self, Write};
use zip::write::{FileOptions, ZipWriter};
use zip::CompressionMethod;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, expand, create_epub])
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
    let a = false;

    // I clearly don't understand RUST file handling, specifically the need to keep cloning things
    // Will reseatch and update in the future
    if a {
        let name_path = PathBuf::from(name);

        match cache_dir() {
            Some(path) => {
                let base = name_path.file_name().expect("no basename");
                let stem = name_path.file_stem().expect("no file stem");
                let mut dest = PathBuf::from(path);
                dest.push("epubai");
                dest.push(stem);
                let folder = dest.clone();
                fs::create_dir_all(dest.clone()).expect("Failed to create");

                dest.push(base);

                let _result = fs::copy(name, dest.clone());

                let archive_file: PathBuf = dest.clone();
                let target_dir: PathBuf = folder;
                zip_extract(&archive_file, &target_dir).expect("Failed to extract");

                // println!("The result is {:?} basename {:?} file ", result, base);
            }
            None => {
                println!("The cache dir is None");
            }
        }
    }

    // To ZIP
    // let archive_file: PathBuf = ...
    // let source_dir: PathBuf = ...
    // zip_create_from_directory(&archive_file, &source_dir)?;
    // create_from_directory_with_options(&archive_file, &source_dir, &options)?;   Hopefully options allows control of compression order

    // println!("The result is {:?}", result);
    // println!("The cache dir is {}", cache_dir().expect('TEST').to_str());
    format!("Expand, {}!", name)
}

// use std::fs::{self, File};
// use std::io::{self, Write};
// use std::path::{Path, PathBuf};
// use zip::write::{FileOptions, ZipWriter};
// use zip::CompressionMethod;

#[tauri::command]
fn create_epub(name: &str, output: &str) -> String {
    println!("Creating EPUB from folder {} to {}", name, output);

    // name is the original epub name, we need to map that to the cache folder containing the expanded files...
    // OR pass that back to the UI and back to here

    // Create a new EPUB file
    let epub_file = File::create(output).expect("Failed to create EPUB file");
    let mut zip_writer = ZipWriter::new(epub_file);

    // Add mimetype file (not compressed)
    let mut options = FileOptions::default();
    options.compression_method(CompressionMethod::Stored);
    zip_writer
        .start_file("mimetype", options)
        .expect("mimetype failed");
    zip_writer
        .write_all(b"application/epub+zip")
        .expect("mimetype write failed");

    // Set compression method to deflate for other files
    let mut optionsDeflate = FileOptions::default();
    options.compression_method(CompressionMethod::Deflated);
    // zip_writer.set_options(FileOptions::default().compression_method(CompressionMethod::Deflated));

    // Iterate over files in the folder
    let folder = Path::new(name);
    for entry in fs::read_dir(folder).expect("Failed to read directory") {
        let entry = entry.expect("Failed to read entry");
        let file_path = entry.path();

        println!("The file path is {}", file_path.to_str().unwrap());

        //         // Get relative path for zipping
        //         let relative_path = file_path.strip_prefix(folder).unwrap();

        //         // Skip mimetype file
        //         if relative_path.to_str().unwrap() == "mimetype" {
        //             continue;
        //         }

        //         // Create a zip file entry and add it to the EPUB
        //         zip_writer.start_file(relative_path.to_str().unwrap(), FileOptions::default())?;
        //         let mut file = File::open(&file_path)?;
        //         io::copy(&mut file, &mut zip_writer)?;
    }

    //     // Finish writing the EPUB file
    //     zip_writer.finish()?;

    //     println!("EPUB file '{}' created successfully!", output_filename);

    format!("Expand, {}!", name)
}

// fn main() {
//     let folder_path = "path/to/your/folder";
//     let output_filename = "output.epub";

//     match create_epub_from_folder(folder_path, output_filename) {
//         Ok(_) => println!("EPUB creation successful!"),
//         Err(e) => eprintln!("Error: {}", e),
//     }
// }
