// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// use std::any;
use std::collections::HashMap;
use std::fs;
use std::io::Read;

use std::path::Path;
use std::path::PathBuf;
use tauri::api::path::cache_dir;
use zip_extensions::*;

use tauri::{CustomMenuItem, Menu, MenuItem, Submenu};

use std::fs::File;
use std::io::Write;
use zip::write::SimpleFileOptions;
use zip::write::ZipWriter;

// use zip::CompressionMethod;

use epub::doc::EpubDoc;
use walkdir::WalkDir;

// use std::process;

fn main() {
    let about = CustomMenuItem::new("about".to_string(), "About epubAI");
    let submenu = Submenu::new(
        "File",
        Menu::new().add_item(about).add_native_item(MenuItem::Quit),
    );
    let menu = Menu::new()
        .add_native_item(MenuItem::Copy)
        .add_item(CustomMenuItem::new("hide", "Hide"))
        .add_submenu(submenu);

    tauri::Builder::default()
        // .setup(|app| { // npm run tauri dev --  -- -- <args>
        //     match app.get_cli_matches() {
        //         // `matches` here is a Struct with { args, subcommand }.
        //         // `args` is `HashMap<String, ArgData>` where `ArgData` is a struct with { value, occurrences }.
        //         // `subcommand` is `Option<Box<SubcommandMatches>>` where `SubcommandMatches` is a struct with { name, matches }.
        //         Ok(matches) => {
        //             // println!("{:?}", matches.args["source"].value);
        //             // if matches.args["source"].occurrences > 0 {
        //             //     process::exit(0x0100);
        //             // }
        //         }
        //         Err(_) => {}
        //     }
        //     Ok(())
        // })
        .menu(menu)
        .on_menu_event(|event| {
            match event.menu_item_id() {
                "about" => {
                    /*emit event for frontend here*/
                    event.window().emit("about", "CaptionIT").unwrap();
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            expand,
            create_epub,
            get_epub_data,
            // list_epubs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[tauri::command]
fn get_epub_data(
    fullpath: &str,
) -> (
    HashMap<String, Vec<String>>,
    Vec<String>,
    HashMap<String, (PathBuf, String)>,
) {
    let doc = EpubDoc::new(fullpath).unwrap();

    (doc.metadata, doc.spine, doc.resources)
}

#[tauri::command]
fn expand(name: &str) -> String {
    // println!("The name param is {}", name);
    let a = true;
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
            // Use an existing folder, assumiong it is already expanded
            if dest.exists() {
                dest.push(base);

                let target_dir: PathBuf = folder;
                result = target_dir.to_str().unwrap().to_string();
                println!(
                    "Using existing epub folder: The result is {:?} basename {:?} file ",
                    result, base
                );
            } else {
                fs::create_dir_all(dest.clone()).expect("Failed to create");

                dest.push(base);

                let _result = fs::copy(name, dest.clone());

                let archive_file: PathBuf = dest.clone();
                let target_dir: PathBuf = folder;
                result = target_dir.to_str().unwrap().to_string();
                println!(
                    "EXPANDING epub: The result is {:?} basename {:?} file ",
                    result, base
                );
                if a {
                    zip_extract(&archive_file, &target_dir).expect("Failed to extract");
                }
            }
        }
        None => {
            println!("The cache dir is None");
        }
    }

    result
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
    // let options = FileOptions::default();
    // let _ = options.compression_method(CompressionMethod::Stored);

    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

    zip_writer
        .start_file("mimetype", options)
        .expect("mimetype failed");
    // zip_writer.set_options(FileOptions::default().compression_method(CompressionMethod::Stored));

    zip_writer
        .write_all(b"application/epub+zip")
        .expect("mimetype write failed");

    // Set compression method to deflate for other files
    // let options_deflate = FileOptions::default();

    // let _ = options_deflate.compression_method(CompressionMethod::Deflated);
    // let options_deflate = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);
    let options_deflate =
        SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    // Iterate over files in the folder
    let folder = Path::new(name);
    println!("Using content from folder {}", name);

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
            // #[allow(deprecated)]
            // let _ = zip_writer
            //     .add_directory_from_path(name, options_deflate)
            //     .expect("Failed to add directory");
        }
    }

    //     // Finish writing the EPUB file
    zip_writer
        .finish()
        .expect("Failed to finish writing EPUB file");

    println!("EPUB file '{}' created successfully!", output);

    format!("Expand, {}!", name)
}
