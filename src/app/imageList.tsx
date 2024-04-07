import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
import { invoke } from '@tauri-apps/api/tauri';
import { save } from '@tauri-apps/api/dialog';
import path from 'path';


interface Props {
    epubName: string;
}

export default function ImgageList(props: Props) {
    const epubName = props.epubName;

    // const [epub, setEpub] = useState<any>(null);
    const [epubPath, setEpubPath] = useState('');
    const [message, setMessage] = useState('');
    const [saveAs, setSaveAs] = useState<String | null>(null);

    useEffect(() => {

        invoke<string>('expand', { name: epubName })
            .then(result => setEpubPath(result))
            .catch(console.error);



    }, [])


    async function save_epub() {
        const path = await save({
            filters: [
                {
                    name: "Save Epub",
                    extensions: ['epub'],
                },
            ],
            defaultPath: epubName.replace(".epub", "_output.epub"),
            title: "Save Epub",
        });
        if (path) {
            setSaveAs(path);

            const output = (saveAs ? saveAs : epubName.replace(".epub", "_output.epub"));
            try {
                let res = await invoke<string>('create_epub', { name: epubPath, output: output });
                setMessage(res);
            } catch (err) { alert(err) }
        }
    }


    async function get_metadata() {
        const base = path.basename(epubName);
        try {
            let res: any = await invoke<string>('get_metadata', { path: epubPath, name: base, fullpath: path.join(epubPath, base) });

            // setMessage(JSON.stringify(res, null, 2) + "\n");
            setMessage(res.title);
        } catch (err) { alert(err) }

    }

    return <div className="flex flex-col space-y-5 sm:px-12 bg-slate-100 h-full min-h-screen">
        <div className="flex flex-col w-full justify-center p-8">
            <h1>{epubName}</h1>
            <h2>{epubPath}</h2>
            <h2>{saveAs}</h2>
            <h3>{message}</h3>
            <Button onClick={save_epub}>Save epub</Button>

            <Button onClick={get_metadata}>Get Metadata</Button>
        </div>

    </div >
}