import { open } from '@tauri-apps/api/dialog';
import { listen } from '@tauri-apps/api/event'

export default function GetEpub(props: any) {
    const handleSetEpub = props.handleSetEpub;

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

        handleSetEpub(fileName);

        // if (lastFileName && (lastFileName === fileName)) return;
        // setLastFileName(fileName);

        // const extension = (fileName.substring(fileName.lastIndexOf('.') + 1, fileName.length) || fileName).toLowerCase();
        // if (extension !== "png" && extension !== "jpg" && extension !== "jpeg" && extension !== "heic") {
        //     alert("Sorry, only png, heic, jpg and jpeg files are allowed.");
        //     return;
        // }

        // setImgName(convertFileSrc((fileName)));
        // setRawImgName(fileName);
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

    return <div className="flex bg-white items-center justify-center h-screen fg-black">
        <h1 className="mb-4 text-6xl font-extrabold text-blue-400">
            <span className="drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">load</span><span className="shadow-sm shadow-slate-400">epub</span></h1>

        <button className="flex-none w-48 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 border border-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => getFile()}>Select Epub...</button>

    </div >
}
