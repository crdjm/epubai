import { open } from '@tauri-apps/api/dialog';
import { listen } from '@tauri-apps/api/event'
// import { useState } from 'react';

interface Props {
    handleSetEpub: (epubName: string) => void;
}

export default function GetEpub(props: Props) {
    const handleSetEpub = props.handleSetEpub;
    // const [message, setMessage] = useState("");

    interface ListenEvent {
        id: number,
        event: string,
        windowLabel: string,
        payload: string[],
    }


    listen('tauri://file-drop', event => {
        // if (busy) return;

        const et = event as ListenEvent;
        const fileName = et.payload[0];

        const extension = (fileName.substring(fileName.lastIndexOf('.') + 1, fileName.length) || fileName).toLowerCase();
        if (extension !== "epub") {
            // setMessage("Sorry, only epub files are allowed.");
            return;
        }

        handleSetEpub(fileName);
    })

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


    </div >
}
