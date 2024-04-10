import { open } from '@tauri-apps/api/dialog';
import { listen } from '@tauri-apps/api/event'

import { invoke } from '@tauri-apps/api/tauri';
import { useEffect, useState } from 'react';

import { exists, readDir, BaseDirectory } from '@tauri-apps/api/fs';
import path from 'path';

interface Props {
    handleSetEpub: (epubName: string) => void;
}

export default function GetEpub(props: Props) {
    const handleSetEpub = props.handleSetEpub;
    const [loadedEpubs, setLoadedEpubs] = useState<[String] | null>(null);

    interface ListenEvent {
        id: number,
        event: string,
        windowLabel: string,
        payload: string[],
    }


    listen('tauri://file-drop', event => {
        const et = event as ListenEvent;
        const fileName = et.payload[0];

        const extension = (fileName.substring(fileName.lastIndexOf('.') + 1, fileName.length) || fileName).toLowerCase();
        if (extension !== "epub") {
            // setMessage("Sorry, only epub files are allowed.");
            return;
        }
        handleSetEpub(fileName);
    })


    useEffect(() => {

        let epubs: [String] | null = null;
        async function processEntries() {
            try {
                const entries = await readDir('epubai', { dir: BaseDirectory.Cache, recursive: true });
                for (const entry of entries) {
                    const anEpub = await exists(path.join(entry.path, 'mimetype'));
                    if (anEpub)
                        if (epubs)
                            epubs.push(path.basename(entry.path));
                        else
                            epubs = [path.basename(entry.path)];
                }
                setLoadedEpubs(epubs);
            } catch (error) {
                alert(error);
            }
        }

        processEntries();

        // invoke<string>('list_epubs', {})
        //     .then(result => setLoadedEpubs(result))
        //     .catch(error => { alert(error) });



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
            handleSetEpub(selected[0]);  // Shouldn't happen as we only allow one epub, but leaving for possible expansion
        } else if (selected === null) {
            // user cancelled the selection
        } else {
            handleSetEpub(selected);
        }
    }

    return <div className="flex flex-col bg-white items-center justify-center h-screen fg-black">
        <p className="text-blue-500 p-4">Drop an epub anywhere on this window, or use the button below to select one</p>
        <button className="flex-none w-48 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 border border-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => getFile()}>Select Epub...</button>

        <p>LOADED = {JSON.stringify(loadedEpubs)}</p>
    </div >
}
