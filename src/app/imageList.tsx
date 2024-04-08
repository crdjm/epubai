import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
import { invoke } from '@tauri-apps/api/tauri';
import { save } from '@tauri-apps/api/dialog';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import path from 'path';

import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

import {
    BaseDirectory,
    readTextFile
} from "@tauri-apps/api/fs";

interface Props {
    epubName: string;
}

export default function ImgageList(props: Props) {
    const epubName = props.epubName;

    // const [epub, setEpub] = useState<any>(null);
    const [epubPath, setEpubPath] = useState('');
    const [message, setMessage] = useState('');
    const [saveAs, setSaveAs] = useState<String | null>(null);

    const [metadata, setMetadata] = useState<any | null>(null);
    const [spine, setSpine] = useState<any | null>(null);
    const [resources, setResources] = useState<any | null>(null);

    const [imgTest, setImg] = useState<String | null>(null);

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


    async function get_epub_details() {
        const base = path.basename(epubName);
        try {
            //  path: epubPath, , name: base, 
            let fullpath = path.join(epubPath, base);
            let res: any = await invoke<string>('get_epub_data', { fullpath: fullpath });
            const [metadata, spine, resources] = res;  // Probably a better way of doing this when I understand rust types more
            // setMetadata(metadata);
            // setSpine(spine);
            // setResources(resources);

            let msg = "";
            let first = true;
            for (const page of spine) {
                const fileName = path.join(epubPath, resources[page][0]);
                const file = await readTextFile(fileName);
                const doc = new DOMParser().parseFromString(file, 'text/xml')
                const images = doc.getElementsByTagName('img');
                if (images.length > 0) {
                    msg += resources[page][0] + " - " + images.length;
                    for (let img = 0; img < images.length; img++) {
                        msg += "[" + img + "] " + images[img].getAttribute('src');
                        let t: string = "";
                        if (images[img].getAttribute('src')) {
                            t = path.join(path.dirname(fileName), images[img].getAttribute('src') as string);
                        }
                        // if (first) { setImg("t=" + images[img].getAttribute('src') + " fileName = " + fileName); first = false; }
                        if (first) { setImg(convertFileSrc(t)); first = false; }

                    }
                }
            }


            setMessage(msg);
        } catch (err) { alert(err) }

    }

    return <div className="flex flex-col space-y-5 sm:px-12 bg-slate-100 h-full min-h-screen">
        <div className="flex flex-col gap-2 w-full justify-center p-8">
            <Button onClick={get_epub_details}>Get Metadata</Button>

            {imgTest ? <span>{imgTest} <img src={imgTest} /></span> : null}

            <h1>{epubName}</h1>
            <h2>{epubPath}</h2>
            <h2>{saveAs}</h2>
            <h3>{message}</h3>
            <h3>METADATA: {JSON.stringify(metadata, null, 2)}</h3>
            <h3>SPINE: {JSON.stringify(spine, null, 2)}</h3>
            <h3>RESOURCES: {JSON.stringify(resources, null, 2)}</h3>
            <Button onClick={save_epub}>Save epub</Button>

        </div>

    </div >
}