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

    function verifyNewEpub(epubName: string) {
        alert("CHECK: Has epub: " + epubName + " been loaded before? If so, cancel load");

        if (epubName.indexOf("epubai") > -1) {
            handleSetEpubPath(epubName.replace(".epub", ""));
        } else {
            invoke<string>('expand', { name: epubName })
                .then(result => handleSetEpubPath(result))
                .catch(console.error);
        }


        handleSetEpub(epubName);
    }



    listen('tauri://file-drop', event => {
        const et = event as ListenEvent;
        const fileName = et.payload[0];

        const extension = (fileName.substring(fileName.lastIndexOf('.') + 1, fileName.length) || fileName).toLowerCase();
        if (extension !== "epub") {
            // setMessage("Sorry, only epub files are allowed.");
            return;
        }
        verifyNewEpub(fileName);
    })


    useEffect(() => {

        let epubs: [string] | null = null;
        async function processEntries() {
            try {
                const entries = await readDir('epubai', { dir: BaseDirectory.Cache, recursive: true });
                for (const entry of entries) {
                    const anEpub = await exists(path.join(entry.path, 'mimetype'));
                    if (anEpub)
                        if (epubs)
                            // epubs.push(path.basename(entry.path));
                            epubs.push(entry.path + ".epub");
                        else
                            // epubs = [path.basename(entry.path)];
                            epubs = [entry.path + ".epub"];
                }
                setLoadedEpubs(epubs);
            } catch (error) {
                alert(error);
            }
        }

        processEntries();



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
            verifyNewEpub(selected[0]);  // Shouldn't happen as we only allow one epub, but leaving for possible expansion
        } else if (selected === null) {
            // user cancelled the selection
        } else {
            verifyNewEpub(selected);
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
