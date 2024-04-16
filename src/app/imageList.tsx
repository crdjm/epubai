import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ChevronLeft } from "lucide-react"
import { ChevronRight } from "lucide-react"
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox"


import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import { invoke } from '@tauri-apps/api/tauri';
import { save } from '@tauri-apps/api/dialog';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import path from 'path';

// import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
const IDOMParser = require("advanced-html-parser");
// const s = new XMLSerializer();
// const str = s.serializeToString(doc);
// alert(doc.documentElement.outerHTML);

import {
    BaseDirectory,
    readTextFile
} from "@tauri-apps/api/fs";
import { Label } from '@/components/ui/label';

interface Props {
    epubName: string;
    epubPath: string;
    handleSetEpub: (epubName: string) => void;
}

// TODO add AI API call from test1 logic


enum WhatToShow {
    ShowAll,
    ShowMissingAlt
}

export default function ImgageList(props: Props) {
    const epubName = props.epubName;
    const epubPath = props.epubPath;
    const handleSetEpub = props.handleSetEpub;

    const [message, setMessage] = useState('');
    const [saveAs, setSaveAs] = useState<String | null>(null);

    const [metadata, setMetadata] = useState<any | null>(null);
    // const [spine, setSpine] = useState<any | null>(null);
    // const [resources, setResources] = useState<any | null>(null);

    const [imageList, setImageList] = useState<any[]>([]);
    const [fullImageList, setFullImageList] = useState<any[]>([]);

    const [show, setShow] = useState(WhatToShow.ShowAll);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentImage, setCurrentImage] = useState<any | null>(null);

    const [newAlt, setNewAlt] = useState<string>("");

    useEffect(() => {

        get_epub_details();

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

            // See if imageList.json exists in the epub folder, if so, load that instead of the epun contents
            // It should contain the metadata, and the image list
            // Otherwise, load from the epub
            // Also save the original alt text contnet to allow for showing of the epub needs saving
            // When saving the epub, reset this content

            // Provide an option to show suspect alt text (notably, single word alt text)

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
                // const doc = new DOMParser().parseFromString(file, 'text/xml')
                const doc = IDOMParser.parse(file, 'text/xml');
                const images = doc.getElementsByTagName('img');
                if (images.length > 0) {
                    index++;

                    msg += resources[page][0] + " - " + images.length;
                    for (let img = 0; img < images.length; img++) {
                        const el = images.item(img);
                        if (!el) continue;
                        let entry: any = {};
                        entry.t = "";
                        // let t: string = "";
                        // const src = images[img].getAttribute('src');
                        // entry.src = images[img].getAttribute('src');
                        entry.src = el.getAttribute('src');
                        if (entry.src && !imgs[entry.src]) {
                            imgs[entry.src] = true;
                            entry.image = path.join(path.dirname(fileName), entry.src as string);
                            entry.h = images[img].getAttribute('height') || "";
                            entry.w = images[img].getAttribute('width') || "";
                            entry.alt = images[img].getAttribute('alt') || "";
                            entry.needsAlt = (entry.alt.length === 0 ? "true" : "false");

                            const epubType = images[img].getAttribute('epub:type');
                            if (epubType) {
                                entry.context = "Cover Image";

                            } else {
                                try {
                                    const title = el.closest("section");
                                    if (title) {
                                        if (title.getAttribute('aria-label')) entry.context = title.getAttribute('aria-label');
                                        else
                                            if (title.getChildren().length > 0 && title.getChildren()[0].getTextContent()) entry.context = title.getChildren()[0].getTextContent();
                                    }
                                } catch (err) {
                                    entry.context = "";
                                }
                                // const title = images[img].closest("section");
                            }

                            entry.index = index;

                            // fullImageList.push({ "image": t, "width": w, "height": h, "alt": alt, "needsAlt": (alt.length === 0 ? "true" : "false"), "index": index });
                            fullImageList.push(entry);
                        }

                    }
                }
            }
            setFullImageList(fullImageList);
            setImageList(fullImageList);
            if (fullImageList.length > 0) {
                setCurrentImage(fullImageList[0]);
            }


        } catch (err) { alert("Error: " + err) }

    }


    function filter_images(show: WhatToShow) {
        const newList = fullImageList.filter((img: any) => (img.alt.length === 0 || show === WhatToShow.ShowAll));
        setShow(show);
        setImageList(newList);
        setCurrentIndex(0);
        setCurrentImage(newList[0]);
    }

    function toggleWhatToShow() {

        let newShow = (show === WhatToShow.ShowMissingAlt) ? WhatToShow.ShowAll : WhatToShow.ShowMissingAlt;
        filter_images(newShow);
    }

    // Hpw to update state as a variant of the current state
    // const updateColor = () => {
    //     setCar(previousState => {
    //       return { ...previousState, color: "blue" }
    //     });
    //   }

    // async function handleSubmit(e: any) {
    //     try {
    //         if (e.preventDefault) e.preventDefault();

    //         var formData = new FormData(e.target);
    //         const form_values = Object.fromEntries(formData);
    //     } catch (err) { alert(err) }
    // }


    function newEpub() {
        handleSetEpub("");
    }

    function nextImage() {
        if (currentImage) {

            if (currentIndex < imageList.length - 1) {
                setImage(currentIndex + 1);
            }
        }
    }

    function previousImage() {
        if (currentImage) {

            if (currentIndex > 0) {
                setImage(currentIndex - 1);
            }
        }
    }

    function setImage(index: number) {
        setCurrentImage(imageList[index]);
        setCurrentIndex(index);
        setNewAlt("");

    }

    function applyNewAlt() {
        if (currentImage) {
            currentImage.alt = newAlt;

            const modifiedList = imageList.map((i, index) => {
                if (index === currentIndex) {
                    i.alt = newAlt;
                }
                return i
            });
            setImageList(pre => pre = modifiedList)
        }
    }

    const colorVariants = {
        blue: 'border rounded border-blue-300 p-1 bg-blue-100',
        red: 'bg-slate-50',
        empty: 'text-red-400 italic',
        alt: 'text-slate-700',
    }

    return <div className="flex flex-col px-0 py-0 gap-0  bg-blue-50 min-h-full min-w-full">
        <div className="flex w-full items-center px-2 py-2 gap-2 bg-slate-200">
            {/* <Button onClick={get_epub_details}>Get Metadata</Button> */}
            <Button onClick={save_epub}>Save epub</Button>
            <Button onClick={newEpub}>Load new epub</Button>
            <span className="flex-grow"></span>
            <Button onClick={toggleWhatToShow}>{show == WhatToShow.ShowMissingAlt ? "Show All" : "Refine List"}</Button>

            <Button variant="outline" disabled={currentIndex === 0} size="icon" onClick={previousImage}><ChevronLeft className="h-4 w-4" /></Button>
            <span>{currentIndex + 1} / {imageList.length}</span>
            <Button variant="outline" disabled={currentIndex === imageList.length - 1} size="icon" onClick={nextImage}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grow flex flex-col px-2 py-2 gap-1  bg-blue-50 min-h-full min-w-full">
            <h3 className="mt-0">Title: {metadata?.title}</h3>

            <div className='flex p-1 overflow-x-scroll min-h-12 min-w-full gap-2 items-center justify-center bg-blue-100 border rounded-lg border-blue-100'>
                {imageList.map((img, index) => (
                    <div key={index} className={`${colorVariants[currentIndex === index ? 'blue' : 'red']}`}>

                        <img
                            key={index}
                            onClick={() => setImage(index)}
                            className="max-h-12 max-w-12 bg-slate-50 rounded border border-slate-200 transition duration-100 hover:border-blue-200 hover:border-2 hover:shadow-xl hover:shadow-blue-200"
                            src={convertFileSrc(img.image)} alt={img.alt}>
                        </img>
                    </div>

                ))}
            </div>

            {
                currentImage &&
                <h2 className='text-l text-blue-700'>{path.basename(currentImage.image)}</h2>
            }

            {
                currentImage &&
                <div className="flex-grow flex justify-center items-center  h-full relative">
                    <img className="absolute max-h-full bg-slate-50 rounded-lg border border-slate-200 shadow-xl" src={convertFileSrc(currentImage.image)} alt={currentImage.alt}></img>
                </div>
            }

            {
                currentImage &&
                <div className="none w-full">
                    <div className="flex items-center mb-1 gap-2 w-full">
                        <div className="w-2/12">
                            <label className="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4" htmlFor="alt">
                                Existing Alt Text
                            </label>
                        </div>
                        <div className="w-9/12">
                            <Input id="alt" readOnly={false}
                                className={`${colorVariants[currentImage.alt ? 'alt' : 'empty']} bg-white border-2 border-gray-200 rounded w-full py-2 px-4 leading-tight focus:outline-none focus:bg-white focus:border-blue-100`}
                                type="text" value={currentImage.alt ? currentImage.alt : "[Empty]"} />
                        </div>
                        <div className="w-1/12" />
                    </div>

                    <div className="flex items-center mb-1 w-full gap-2">
                        <div className="w-2/12">

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Label className="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4" htmlFor='context'>
                                            Context
                                            <Checkbox className="ml-4" checked={true} id="include" />

                                            {/* <label
                                                htmlFor="include"
                                                className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >

                                            </label> */}
                                        </Label>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="italic">The context of the image to help create an accurate description</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                        </div>
                        <div className="w-9/12">
                            <Input id="context" className="bg-gray-100  border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-100" type="text" placeholder={currentImage.context} />

                        </div>

                        <Button className="w-1/12" type="submit">Generate</Button>

                    </div>
                    <div className="flex items-center mb-1 w-full gap-2">
                        <div className="w-2/12">
                            <label className="block text-gray-500 font-bold md:text-right mb-1 md:mb-0 pr-4" htmlFor='newAlt'>
                                New Alt Text
                            </label>
                        </div>
                        <div className="w-9/12">
                            <Input id="newAlt"
                                onChange={(e) => setNewAlt(e.target.value)}
                                className="bg-gray-100 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-100"
                                type="text"
                                placeholder={currentImage.alt}
                                value={newAlt} />

                        </div>
                        <Button className="w-1/12" onClick={applyNewAlt}>Apply</Button>

                    </div>
                </div>
            }

        </div>
    </div >
}
