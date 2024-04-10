import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"



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

enum WhatToShow {
    ShowAll,
    ShowMissingAlt
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

    const [imageList, setImageList] = useState<any[]>([]);

    const [show, setShow] = useState(WhatToShow.ShowMissingAlt);


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
            setMetadata(metadata);
            // setSpine(spine);
            // setResources(resources);


            let msg = "";
            // let first = true;
            // let imageDisplay = [];
            let fullImageList = [];
            let imgs: { [key: string]: boolean } = {};

            let index = 0;
            for (const page of spine) {
                const fileName = path.join(epubPath, resources[page][0]);
                const file = await readTextFile(fileName);
                const doc = new DOMParser().parseFromString(file, 'text/xml')
                const images = doc.getElementsByTagName('img');
                if (images.length > 0) {
                    index++;

                    msg += resources[page][0] + " - " + images.length;
                    for (let img = 0; img < images.length; img++) {
                        // msg += "[" + img + "] " + images[img].getAttribute('src');
                        let t: string = "";
                        const src = images[img].getAttribute('src');
                        if (src && !imgs[src]) {
                            imgs[src] = true;
                            t = path.join(path.dirname(fileName), src as string);
                            const h = images[img].getAttribute('height') || "";
                            const w = images[img].getAttribute('width') || "";
                            const alt = images[img].getAttribute('alt') || "";

                            fullImageList.push({ "image": t, "width": w, "height": h, "alt": alt, "needsAlt": (alt.length === 0 ? "true" : "false"), "index": index });
                        }

                    }
                }
            }
            setImageList(fullImageList);

            // setMessage(JSON.stringify(fullImageList));

        } catch (err) { alert(err) }

    }

    function show_all_images() {
        let newShow = (show === WhatToShow.ShowMissingAlt) ? WhatToShow.ShowAll : WhatToShow.ShowMissingAlt;
        setShow(newShow);

    }


    // const updateColor = () => {
    //     setCar(previousState => {
    //       return { ...previousState, color: "blue" }
    //     });
    //   }

    async function handleSubmit(e: any) {
        try {
            if (e.preventDefault) e.preventDefault();

            var formData = new FormData(e.target);
            const form_values = Object.fromEntries(formData);
        } catch (err) { alert(err) }
    }




    return <div className="flex flex-col  px-12 py-4 gap-2">
        <span><Button onClick={get_epub_details}>Get Metadata</Button>
            <Button onClick={show_all_images}>{show == WhatToShow.ShowMissingAlt ? "Show All" : "Show Missing Alt"}</Button>
            <Button onClick={save_epub}>Save epub</Button>
        </span>
        <h3>Title: {metadata?.title}</h3>

        <div className='p-2 grow flex flex-col gap-2'>

            {imageList.filter((img: any) => (img.alt.length === 0 || show === WhatToShow.ShowAll)).map(filtered => (

                <Card key={filtered.image} className="max-w-full rounded-lg bg-white p-1 shadow-md transition duration-100 hover:bg-blue-50 hover:shadow-lg hover:shadow-grey-200">
                    <CardHeader>
                        <CardTitle>{path.basename(filtered.image)}</CardTitle>
                        {/* <CardDescription>{needsAlt} = {JSON.stringify(filtered.needsAlt)}</CardDescription> */}
                    </CardHeader>
                    <CardContent className="w-full flex flex-col items-center gap-2">
                        <img src={convertFileSrc(filtered.image)} width={filtered.width} height={filtered.height} alt={filtered.alt}></img>
                        <div>Current alt text:<br></br>{filtered.alt}</div>

                    </CardContent>
                    <CardFooter>

                        <div className="flex flex-col w-full space-x-2">


                            <form className="flex space-x-2" onSubmit={handleSubmit}>

                                {/* <Label htmlFor="licenseKey" className="mt-3">Email</Label> */}
                                {/* <Input type="text" id="alt" name="alt" placeholder="alt text" value={gemeniKey} onChange={e => changeKey(e.currentTarget.value)} /> */}
                                <Input type="text" id="alt" name="alt" placeholder="alt text" value={filtered.alt} />
                                <Button type="submit">Apply</Button>
                            </form>
                        </div>
                    </CardFooter>

                </Card>

            ))}

        </div>


    </div >
}