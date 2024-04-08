// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// use std::any;
use std::collections::HashMap;
use std::fs;
use std::io::Read;

use std::path::Path;
use std::path::PathBuf;
use tauri::api::path::cache_dir;
use xml_dom::level2::Document;
use zip_extensions::*;

use std::fs::File;
use std::io::Write;
use zip::write::{FileOptions, ZipWriter};
use zip::CompressionMethod;

use epub::doc::EpubDoc;
use walkdir::WalkDir;

use xml_dom::parser::read_xml;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            expand,
            create_epub,
            get_epub_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

// path: &str,
// name: &str,

#[tauri::command]
fn get_epub_data(
    path: &str,
    fullpath: &str,
) -> (
    HashMap<String, Vec<String>>,
    Vec<String>,
    HashMap<String, (PathBuf, String)>,
) {
    let doc = EpubDoc::new(fullpath).unwrap();
    // let title = doc.mdata("title").unwrap();
    // let mut book     = HashMap::new();

    // book.insert("metadata".to_string(), doc.metadata);
    // book.insert("spine".to_string(), doc.spine);

    // doc.metadata
    // println!("The name param is {}", doc.spine[0]);

    // Loop over spine, and for each xhtml file, scan for images.
    // Create list of images, where they are used and any current alt text

    let dest = PathBuf::from(path);
    for i in 0..doc.spine.len() {
        let id = &doc.spine[i];
        let locate = &doc.resources[id];
        let f = locate.0.to_str().unwrap();

        let mut file = dest.clone();
        file.push(f);
        let data = fs::read_to_string(file.to_str().unwrap()).unwrap();

        let dom = read_xml(&data).unwrap();
        let images = dom.get_elements_by_tag_name("img").iter();

        println!("{} {} {} {}", i, id, f, data.len());
    }

    // for (key, value) in &doc.resources {
    //     println!("{} / {}", key, value.0.to_str().unwrap());
    //     // let mut file = dest.clone();
    //     // file.push(value.0.to_str().unwrap());
    //     // let data = fs::read_to_string(file.to_str().unwrap()).unwrap();
    // }

    (doc.metadata, doc.spine, doc.resources)
    // format!("epub path: {}, title = {}", fullpath, title)
}

#[tauri::command]
fn expand(name: &str) -> String {
    println!("The name param is {}", name);
    let a = false;
    let mut result = String::new();

    // I clearly don't understand RUST file handling, specifically the need to keep cloning things
    // Will reseatch and update in the future
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
            result = target_dir.to_str().unwrap().to_string();
            println!("The result is {:?} basename {:?} file ", result, base);
            if a {
                zip_extract(&archive_file, &target_dir).expect("Failed to extract");
            }
            // println!("The result is {:?} basename {:?} file ", result, base);
        }
        None => {
            println!("The cache dir is None");
        }
    }

    result

    // To ZIP
    // let archive_file: PathBuf = ...
    // let source_dir: PathBuf = ...
    // zip_create_from_directory(&archive_file, &source_dir)?;
    // create_from_directory_with_options(&archive_file, &source_dir, &options)?;   Hopefully options allows control of compression order

    // println!("The result is {:?}", result);
    // println!("The cache dir is {}", cache_dir().expect('TEST').to_str());
    // format!("Expand, {}!", name)
}

#[tauri::command]
fn create_epub(name: &str, output: &str) -> String {
    println!("Creating EPUB from folder {} to {}", name, output);

    let walkdir = WalkDir::new(name);
    let it = walkdir.into_iter();

    // Create a new EPUB file
    // let epub_file1 = File::create(output).expect("Failed to create EPUB file");
    let epub_file = File::create(output).expect("Failed to create EPUB file");

    // let _ = zip_dir(&mut it.filter_map(|e| e.ok()), name, epub_file1);

    // name is the original epub name, we need to map that to the cache folder containing the expanded files...
    // OR pass that back to the UI and back to here

    let mut zip_writer = ZipWriter::new(epub_file);

    // Add mimetype file (not compressed)
    let options = FileOptions::default();
    let _ = options.compression_method(CompressionMethod::Stored);
    zip_writer
        .start_file("mimetype", options)
        .expect("mimetype failed");
    zip_writer
        .write_all(b"application/epub+zip")
        .expect("mimetype write failed");

    // Set compression method to deflate for other files
    let options_deflate = FileOptions::default();
    let _ = options_deflate.compression_method(CompressionMethod::Deflated);
    // zip_writer.set_options(FileOptions::default().compression_method(CompressionMethod::Deflated));

    // Iterate over files in the folder
    let folder = Path::new(name);
    let mut buffer = Vec::new();
    for entry in it {
        // for entry in fs::read_dir(folder).expect("Failed to read directory") {
        let entry = entry.expect("Failed to read entry");
        let file_path = entry.path();

        // println!("The file path is {}", file_path.to_str().unwrap());

        // Get relative path for zipping
        let name = file_path.strip_prefix(folder).unwrap();

        // Skip mimetype file
        if name.to_str().unwrap() == "mimetype" {
            continue;
        }

        if name.to_str().unwrap().to_lowercase().contains(".epub") {
            continue;
        }

        if file_path.is_file() {
            // Create a zip file entry and add it to the EPUB
            // zip_writer.start_file(relative_path.to_str().unwrap(), FileOptions::default())?;
            let _ = zip_writer.start_file(name.to_str().unwrap(), options_deflate);
            let mut file = File::open(&file_path).expect("Failed to open file");

            file.read_to_end(&mut buffer).expect("Failed to read file");
            zip_writer.write_all(&buffer).expect("Failed to write file");
            buffer.clear();
        } else if !name.as_os_str().is_empty() {
            // println!("adding dir {file_path:?} as {name:?} ...");
            #[allow(deprecated)]
            let _ = zip_writer
                .add_directory_from_path(name, options_deflate)
                .expect("Failed to add directory");
        }
    }

    //     // Finish writing the EPUB file
    zip_writer
        .finish()
        .expect("Failed to finish writing EPUB file");

    //     println!("EPUB file '{}' created successfully!", output_filename);

    format!("Expand, {}!", name)
}
