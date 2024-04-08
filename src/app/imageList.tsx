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

export default function ImgageList(props: Props) {
    const epubName = props.epubName;

    // const [epub, setEpub] = useState<any>(null);
    const [epubPath, setEpubPath] = useState('');
    const [message, setMessage] = useState('');
    const [saveAs, setSaveAs] = useState<String | null>(null);

    const [metadata, setMetadata] = useState<any | null>(null);
    const [spine, setSpine] = useState<any | null>(null);
    const [resources, setResources] = useState<any | null>(null);

    // const [imageDisplay, setImageDisplay] = useState<any[]>([]);
    const [imageList, setImageList] = useState<any[]>([]);

    const [requireAlt, setRequireAlt] = useState(true);

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
            let imageList: any = [];
            // let imageDisplay = [];

            for (const page of spine) {
                const fileName = path.join(epubPath, resources[page][0]);
                const file = await readTextFile(fileName);
                const doc = new DOMParser().parseFromString(file, 'text/xml')
                const images = doc.getElementsByTagName('img');
                if (images.length > 0) {
                    msg += resources[page][0] + " - " + images.length;
                    for (let img = 0; img < images.length; img++) {
                        // msg += "[" + img + "] " + images[img].getAttribute('src');
                        let t: string = "";
                        if (images[img].getAttribute('src')) {
                            t = path.join(path.dirname(fileName), images[img].getAttribute('src') as string);
                        }
                        const h = images[img].getAttribute('height') || "";
                        const w = images[img].getAttribute('width') || "";
                        const alt = images[img].getAttribute('alt') || "";

                        // if (first) { setImg("t=" + images[img].getAttribute('src') + " fileName = " + fileName); first = false; }
                        // if (first) { setImg(convertFileSrc(t)); first = false; }

                        imageList.push({ "image": t, "width": w, "height": h, "alt": alt, "needsAlt": alt == "", "index": img });
                        // imageDisplay.push(
                        //     <Card className="rounded-lg bg-white p-4 shadow-md transition duration-100 hover:bg-blue-50 hover:shadow-lg hover:shadow-grey-200">
                        //         <CardHeader>
                        //             <CardTitle>{path.basename(t)}</CardTitle>
                        //             {/* <CardDescription>Card Description</CardDescription> */}
                        //         </CardHeader>
                        //         <CardContent>
                        //             <img src={convertFileSrc(t)} width={w} height={h} alt={alt}></img>
                        //         </CardContent>
                        //         <CardFooter>
                        //             <p>alt={alt}</p>
                        //         </CardFooter>
                        //     </Card>
                        // );

                        // <div><img src={convertFileSrc(t)} width={w} height={h} alt={alt}></img> alt={alt}</div>);

                    }
                }
            }

            // setImageDisplay(imageDisplay);
            setImageList(imageList);
            // setMessage(msg);
        } catch (err) { alert(err) }

    }

    function show_all_images() {
        setRequireAlt(!requireAlt);
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


    return <div className="flex flex-col space-y-5 sm:px-12 bg-slate-100 h-full min-h-screen">
        <div className="flex flex-col gap-2 w-full justify-center p-8">
            <Button onClick={get_epub_details}>Get Metadata</Button>
            <Button onClick={show_all_images}>Show all Images</Button>

            {/* <h1>{epubName}</h1> */}
            {/* <h2>{epubPath}</h2> */}
            {/* <h2>{saveAs}</h2> */}
            <h3>{message}</h3>
            <h3>Title: {metadata?.title}</h3>

            {imageList && <div className="flex flex-col gap-2 justify-center">
                {imageList.filter(name => name.needsAlt || requireAlt).map(filtered => (

                    <Card key="{filtered.image}" className="rounded-lg bg-white p-4 shadow-md transition duration-100 hover:bg-blue-50 hover:shadow-lg hover:shadow-grey-200">
                        <CardHeader>
                            <CardTitle>{path.basename(filtered.image)}</CardTitle>
                            {/* <CardDescription>Card Description</CardDescription> */}
                        </CardHeader>
                        <CardContent>
                            <img src={convertFileSrc(filtered.image)} width={filtered.w} height={filtered.h} alt={filtered.alt}></img>
                        </CardContent>
                        <CardFooter>
                            <p>alt={filtered.alt}</p>
                            <form className="flex w-full justify-center align-center space-x-2" onSubmit={handleSubmit}>
                                {/* <Label htmlFor="licenseKey" className="mt-3">Email</Label> */}
                                {/* <Input type="text" id="alt" name="alt" placeholder="alt text" value={gemeniKey} onChange={e => changeKey(e.currentTarget.value)} /> */}
                                <Input type="text" id="alt" name="alt" placeholder="alt text" value={filtered.alt} />
                                <Button type="submit">Apply</Button>
                            </form>
                        </CardFooter>
                    </Card>


                    // <li key="{filteredName.image}">
                    //     {JSON.stringify(filteredName, null, 2)}
                    // </li>
                ))}
            </div>}

            {/* {imageDisplay && <div className="flex flex-col gap-2 justify-center">
                {imageDisplay}
            </div>} */}

            {/* <h3>SPINE: {JSON.stringify(spine, null, 2)}</h3>
            <h3>RESOURCES: {JSON.stringify(resources, null, 2)}</h3> */}
            <Button onClick={save_epub}>Save epub</Button>

        </div>

    </div >
}