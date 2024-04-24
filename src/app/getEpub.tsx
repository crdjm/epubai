import { open } from '@tauri-apps/api/dialog';
import { listen } from '@tauri-apps/api/event'

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

import { exists, readDir, BaseDirectory } from '@tauri-apps/api/fs';
import path from 'path';

interface Props {
    handleSetEpub: (epubName: string) => void;
    handleSetEpubPath: (epubPath: string) => void;
}

export default function GetEpub(props: Props) {
    const handleSetEpub = props.handleSetEpub;
    const handleSetEpubPath = props.handleSetEpubPath;

    const [loadedEpubs, setLoadedEpubs] = useState<[string] | null>(null);

    interface ListenEvent {
        id: number,
        event: string,
        windowLabel: string,
        payload: string[],
    }

    function verifyNewEpub(epubName: string): boolean {
        let found = -1;
        if (loadedEpubs) {
            const newName = path.basename(epubName);
            for (let i = 0; i < loadedEpubs.length; i++) {
                const oldName = path.basename(loadedEpubs[i]);
                if (newName.localeCompare(oldName) === 0) {
                    found = i;
                    break;
                }
            }
            if (found > -1) {
                // alert("Already have " + epubName + " loaded. Please remove it first to verify you want to load a new version.");
                return false;
            }
        }
        return true;
    }

    async function loadNewEpub(epubName: string) {

        if (epubName.indexOf("epubai") > -1) {
            handleSetEpubPath(epubName.replace(".epub", ""));
        } else {
            try {

                const result = await invoke<string>('expand', { name: epubName });
                handleSetEpubPath(result);
                // .then(result => handleSetEpubPath(result))
                // .catch(console.error);
            } catch (error) {
                alert("Error: " + error);
            }
        }


        handleSetEpub(epubName);
    }


    function listenForDrop() {
        // console.log("LISTENER ADDED");
        const unlisten = listen('tauri://file-drop', async (event) => {
            const et = event as ListenEvent;
            const fileName = et.payload[0];
            // alert(fileName);
            const extension = (fileName.substring(fileName.lastIndexOf('.') + 1, fileName.length) || fileName).toLowerCase();
            if (extension !== "epub") {
                // setMessage("Sorry, only epub files are allowed.");
                return;
            }

            // Unclear why verifyNewEpub doesn't work on the dropped file? Needs further investigation
            // Suspect it is my understanding of the React useEffect hook
            if (verifyNewEpub(fileName)) loadNewEpub(fileName);

        })

        return unlisten;
    }



    useEffect(() => {

        const unlisten = listenForDrop();

        let epubs: [string] | null = null;
        async function processEntries() {
            try {
                const entries = await readDir('epubai', { dir: BaseDirectory.Cache, recursive: false });
                // alert(BaseDirectory.Cache + " " + JSON.stringify(entries));
                for (const entry of entries) {
                    if (entry.path.indexOf(".DS_Store") > -1) continue;
                    try {
                        const anEpub = await exists(path.join(entry.path, 'mimetype'));
                        if (anEpub)
                            if (epubs)
                                // epubs.push(path.basename(entry.path));
                                epubs.push(entry.path + ".epub");
                            else
                                // epubs = [path.basename(entry.path)];
                                epubs = [entry.path + ".epub"];
                    } catch (err) { // Ignore any errors here due to unforseen files
                    }
                }
                setLoadedEpubs(epubs);
            } catch (error) {
                alert(error);
            }
        }

        processEntries();

        return () => {
            unlisten.then(f => f());
        }

    }, [])



    async function getFile() {
        const selected = await open({
            multiple: false,
            filters: [{
                name: 'Epub',
                extensions: ['epub'],
            }]
        });
        if (Array.isArray(selected)) {
            if (verifyNewEpub(selected[0])) loadNewEpub(selected[0]);  // Shouldn't happen as we only allow one epub, but leaving for possible expansion
        } else if (selected === null) {
            // user cancelled the selection
        } else {
            if (verifyNewEpub(selected)) loadNewEpub(selected);
        }
    }

    function removeEpub(epubName: string) {
        alert("Not implemented yet: remove epub " + epubName);
        // Needs to update loadedEpubs, and delete the disk content
    }
    function loadEpub(epubName: string) {
        handleSetEpub(epubName);
        // We have to have seen this before, so we can load it, but should proabbly verify it exists
        handleSetEpubPath(epubName.replace(".epub", ""));
    }



    return <div className="flex flex-col bg-white items-center justify-center h-screen fg-black gap-2">
        <p className="text-blue-500 p-4">Drop an epub anywhere on this window, or use the button below to select one</p>
        <button className="flex-none bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 border border-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => getFile()}>Select Epub...</button>
        {loadedEpubs && <><div className='mt-5 justify-left'>Previously loaded epubs:</div>
            <div className="flex flex-col gap-y-2 w-full px-10 overflow-y-auto">
                {loadedEpubs.map((epub, index) => (
                    <div className="flex flex-row p-2 gap-1 w-full bg-slate-50 rounded-md border border-slate-100" key={index}>
                        <div className="flex-grow mt-2">{path.basename(epub)}</div>
                        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 border border-blue-700 rounded" onClick={() => loadEpub(epub)}>Load</button>
                        <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 border border-red-700 rounded" onClick={() => removeEpub(epub)}>Remove</button>
                    </div>
                ))}

            </div >
        </>
        }
    </div >
}
