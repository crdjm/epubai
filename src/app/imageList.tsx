import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ChevronLeft } from "lucide-react"
import { ChevronRight } from "lucide-react"
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox"
// import { Textarea } from "@/components/ui/textarea"
import { AutosizeTextarea } from '@/components/ui/autosize-textarea';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

// TODO
// 
// Save epub should update the xhtml files and then create the epub. Only re-parse the files with updated images. May require saving opriginal filename in image list

import { invoke } from '@tauri-apps/api/tauri';
import { save } from '@tauri-apps/api/dialog';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { exists, readBinaryFile, writeTextFile } from "@tauri-apps/api/fs";
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
    getKey: () => string;
    handleSetEpub: (epubName: string) => void;
}


// Gemini API code

function bufToGenerativePart(buf: string, mimeType: string) {
    return {
        inlineData: {
            // data: Buffer.from(buf).toString("base64"),
            data: buf,
            mimeType,
        },
    };
}





enum WhatToShow {
    ShowAll,
    ShowMissingAlt
}

export default function ImgageList(props: Props) {
    const epubName = props.epubName;
    const epubPath = props.epubPath;
    const getKey = props.getKey;
    const handleSetEpub = props.handleSetEpub;

    const [message, setMessage] = useState('');
    const [saveAs, setSaveAs] = useState<String | null>(null);

    const [metadata, setMetadata] = useState<any | null>(null);
    const [spine, setSpine] = useState<any | null>(null);
    const [resources, setResources] = useState<any | null>(null);

    const [imageList, setImageList] = useState<any[]>([]);
    const [fullImageList, setFullImageList] = useState<any[]>([]);

    const saveNeeded =
        !imageList.some(img => img.original_alt.localeCompare(img.alt) !== 0)



    const [show, setShow] = useState(WhatToShow.ShowAll);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentImage, setCurrentImage] = useState<any | null>(null);

    const [newAlt, setNewAlt] = useState<string>("");
    const [currentAlt, setCurrentAlt] = useState<string>("");
    const [newContext, setNewContext] = useState<string>("");
    const [includeContext, setIncludeContext] = useState<boolean>(true);

    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);

    const [key, setKey] = useState<string>("");
    const [model, setModel] = useState<any>(null);

    const [isAlertDialogOpen, setAlertDialogOpen] = useState(false)

    const safetySettings = [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        }
    ];



    const savedImageList = epubPath + ".json";
    const savedMetadata = epubPath + "_metadata.json";


    useEffect(() => {

        const tmpKey = getKey();
        if (tmpKey) {
            setKey(tmpKey);
            const genAI = new GoogleGenerativeAI(tmpKey ? tmpKey : "UNDEFINED");
            setModel(genAI.getGenerativeModel({ model: "gemini-pro-vision", safetySettings }));
            // alert(model);

        } else {
            // Need to display a message?
        }

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
            save_epub_details(); // get_epub_details() in reverse
            setSaveAs(path);

            // const output = (saveAs ? saveAs : epubName.replace(".epub", "_output.epub"));
            // try {
            //     let res = await invoke<string>('create_epub', { name: epubPath, output: output });
            //     setMessage(res);
            // } catch (err) { alert(err) }
        }
    }

    async function save_epub_details() {
        const base = path.basename(epubName);

        try {
            let fullpath = path.join(epubPath, base);
            alert(epubPath);
            let imgs: { [key: string]: boolean } = {};
            let msg = "";
            let index = 0;
            for (const page of spine) {
                const fileName = path.join(epubPath, resources[page][0]);
                const file = await readTextFile(fileName);
                const doc = IDOMParser.parse(file, 'text/xml');
                const images = doc.getElementsByTagName('img');
                let changed = false;
                if (images.length > 0) {

                    // msg += resources[page][0] + " - " + images.length;
                    for (let img = 0; img < images.length; img++) {
                        const el = images.item(img);
                        if (!el) continue;

                        const src = el.getAttribute('src');
                        if (src && !imgs[src]) {
                            imgs[src] = true;
                            const alt = el.getAttribute('alt');
                            if (alt.localeCompare(fullImageList[index].alt) !== 0) {
                                // msg += "  [" + index + "]'" + fullImageList[index].alt + "' <== '" + alt + "'";
                                el.setAttribue('alt', fullImageList[index].alt);

                                fullImageList[index].original_alt = fullImageList[index].alt;
                                changed = true;
                            }

                            index++;

                        }
                    }
                }
                if (changed) {
                    await writeTextFile(fileName, doc.toString());
                }
            }
            // alert(msg);

            setImageList(pre => pre = fullImageList);
            await writeTextFile(savedImageList, JSON.stringify(fullImageList, null, 2));

        } catch (err) { alert(err) }
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


            const saveExists = await exists(savedImageList);
            const metadataExists = await exists(savedMetadata);
            // alert(savedImageList + " " + saveExists);

            let metadataIn = null;
            let fullImageList = [];

            // TODO remove existimg cache files if we re-load the samme epub in case it has changed
            if (0 && saveExists && metadataExists) {
                metadataIn = JSON.parse(await readTextFile(savedMetadata));
                setMetadata(metadataIn.metadata);
                setSpine(metadataIn.spine);
                setResources(metadataIn.resources);
                fullImageList = JSON.parse(await readTextFile(savedImageList));
            } else {

                let res: any = await invoke<string>('get_epub_data', { fullpath: fullpath });
                const [metadata, spine, resources] = res;  // Probably a better way of doing this when I understand rust types more
                setMetadata(metadata);
                setSpine(spine);
                setResources(resources);

                // alert(epubPath);

                // let msg = "";
                // let first = true;
                // let imageDisplay = [];

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

                        // msg += resources[page][0] + " - " + images.length;
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
                                entry.original_alt = entry.alt;
                                // entry.needsAlt = (entry.alt.length === 0 ? "true" : "false");

                                const epubType = images[img].getAttribute('epub:type');
                                if (epubType) {
                                    entry.context = "Cover Image";

                                } else {
                                    try {
                                        const figure = el.closest("figure");
                                        if (figure) {
                                            if (figure.getAttribute('title')) entry.context = figure.getAttribute('title');
                                            else
                                                if (figure.firstChild && figure.firstChild.textContent) entry.context = figure.firstChild.textContent;

                                        }
                                        if (!entry.context || entry.context.length === 0) {
                                            const title = el.closest("section");
                                            if (title) {
                                                const first = title.firstChild;
                                                if (first && first.nodeName === "header") {
                                                    // entry.context = first.nodeName;
                                                    // if (title.firstChild && title.firstChild.textContent) 
                                                    entry.context = title.firstChild.textContent;
                                                } else {
                                                    if (title.getAttribute('aria-label')) entry.context = title.getAttribute('aria-label');
                                                    else
                                                        entry.context = "";
                                                }
                                            }
                                        }
                                    } catch (err) {
                                        entry.context = err;
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

                const saveMeta = {
                    "metadata": metadata,
                    "spine": spine,
                    "resources": resources
                }

                await writeTextFile(savedImageList, JSON.stringify(fullImageList, null, 2));
                await writeTextFile(savedMetadata, JSON.stringify(saveMeta, null, 2));
            }


            setFullImageList(fullImageList);
            setImageList(fullImageList);
            if (fullImageList.length > 0) {
                setCurrentImage(fullImageList[0]);
                setNewContext(fullImageList[0].context);
                setCurrentAlt(fullImageList[0].alt);
                setNewAlt(fullImageList[0].alt);
            }
            setLoading(false);

        } catch (err) {
            alert("Error: " + err);
            setLoading(false);
        }

    }


    function filter_images(show: WhatToShow) {
        const newList = fullImageList.filter((img: any) => (img.alt.length === 0 || img.alt.indexOf(' ') === -1 || show === WhatToShow.ShowAll));
        setShow(show);
        setImageList(newList);
        setCurrentIndex(0);
        setCurrentImage(newList[0]);
        setNewContext(imageList[0].context);
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
        // alert(imageList.some(img => img.original_alt.localeCompare(img.alt) !== 0));
        // return;

        if (imageList.some(img => img.original_alt.localeCompare(img.alt) !== 0)) {
            setAlertDialogOpen(true);
        } else {
            handleSetEpub("");
        }
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
        setNewAlt(imageList[index].alt);
        setCurrentAlt(imageList[index].alt);
        setNewContext(imageList[index].context);

    }

    async function applyNewAlt() {
        if (currentImage) {
            currentImage.alt = newAlt?.trim();
            setCurrentAlt(newAlt);


            const modifiedList = imageList.map((i, index) => {
                if (index === currentIndex) {
                    i.alt = newAlt;
                }
                return i
            });
            setImageList(pre => pre = modifiedList)
            await writeTextFile(savedImageList, JSON.stringify(modifiedList, null, 2));

            // console.log("AFTER APPLYING NEW ALT");
            // console.dir(modifiedList[currentIndex]);

        }
    }
    async function ResetAlt() {
        if (currentImage) {
            currentImage.alt = currentImage.original_alt?.trim();
            setNewAlt(currentImage.original_alt);
            setCurrentAlt(currentImage.original_alt);

            const modifiedList = imageList.map((i, index) => {
                if (index === currentIndex) {
                    i.alt = i.original_alt;
                }
                return i
            });
            setImageList(pre => pre = modifiedList)

            await writeTextFile(savedImageList, JSON.stringify(modifiedList, null, 2));

            // console.log("AFTER RESET");
            // console.dir(modifiedList[currentIndex]);
        }
    }


    async function generateAltText() {
        if (currentImage) {
            try {

                setBusy(true);


                const result = await readBinaryFile(currentImage.image);
                if (result.length > 5000000) {
                    alert("This image is too large for image analysis, can it be reduced in size?");
                    return;
                }

                // alert(result.length + " " + currentImage.src + " [" + includeContext + "] " + currentImage.context);

                const imageBuffer = Buffer.from(result).toString("base64");

                const imageParts = [bufToGenerativePart(imageBuffer, "image/jpeg")];

                let ai_prompt =
                    "write an alt text description.";

                if (includeContext) {
                    const context = document.getElementById('context')?.textContent;
                    ai_prompt = "Within the context of '" + context + "', " + ai_prompt;
                }
                // alert(ai_prompt)
                const gemeniResult = await model.generateContent([ai_prompt, ...imageParts]);

                const response = gemeniResult.response;
                let text = response.text();

                setNewAlt(text.trim());

                setBusy(false);

                // alert(JSON.stringify(response));

            } catch (err) {
                alert(err);
                setBusy(false);
            }

        }
    }

    const colorVariants = {
        blue: 'border rounded border-blue-300 p-1',
        red: 'border rounded border-blue-100 p-1',
        empty: 'text-red-400 italic',
        alt: 'text-slate-700',
    }

    const updatedAlt = {
        original: '',
        changed: 'bg-red-200',
        invisible: 'opacity-10'
    }


    return <div className="flex flex-col px-0 py-0 gap-0  bg-blue-50 min-h-full min-w-full">
        <div className="flex w-full items-center px-2 py-2 gap-2 bg-slate-200">
            {/* <Button onClick={get_epub_details}>Get Metadata</Button> */}
            <Button disabled={saveNeeded} onClick={save_epub}>Save epub</Button>
            <Button onClick={newEpub}>Switch epub</Button>
            <span className="flex-grow"></span>
            <Button onClick={toggleWhatToShow}>{show == WhatToShow.ShowMissingAlt ? "Show All" : "Refine List"}</Button>

            <Button variant="outline" disabled={currentIndex === 0} size="icon" onClick={previousImage}><ChevronLeft className="h-4 w-4" /></Button>
            <span>{currentIndex + 1} / {imageList.length}</span>
            <Button variant="outline" disabled={currentIndex === imageList.length - 1} size="icon" onClick={nextImage}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grow flex flex-col  px-2 py-2 gap-1  bg-blue-50 min-h-full min-w-full">
            <h3 className="animate-text bg-gradient-to-r from-slate-800  to-slate-500 bg-clip-text text-transparent text-2xl font-black">{metadata?.title}</h3>

            <div className='flex p-1 overflow-x-scroll min-h-12 min-w-full gap-2 items-center justify-center bg-blue-100 border rounded-lg border-blue-100'>
                {imageList.map((img, index) => (
                    <div key={index}
                        className={`${colorVariants[currentIndex === index ? 'blue' : 'red']} ${updatedAlt[img.original_alt.localeCompare(img.alt) ? 'changed' : 'original']} `}>

                        <img
                            key={index}
                            onClick={() => setImage(index)}
                            className="max-h-12 max-w-12 bg-slate-50 rounded border border-slate-200 transition duration-100 hover:border-blue-200 hover:border-2 hover:shadow-xl hover:shadow-blue-200"
                            src={convertFileSrc(img.image)} alt={img.alt}>
                        </img>
                    </div>

                ))}
            </div>

            {loading &&
                <div className="flex-grow flex justify-center items-center  h-full relative">
                    <p className="text-2xl font-black">Loading epub</p>
                </div>
            }

            {loading === false && imageList.length === 0 &&
                <div className="flex-grow flex justify-center items-center  h-full relative">
                    <p className="text-2xl font-black">No images found in this epub</p>
                </div>
            }


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
                            <Tippy content={<span>Image alt text in the epub</span>}>
                                <label className="block text-gray-500 md:text-right mb-1 md:mb-0 pr-2" htmlFor="alt">
                                    Current Alt Text
                                </label>
                            </Tippy>
                        </div>
                        <div className="w-9/12">
                            <AutosizeTextarea id="alt" readOnly={false}
                                className={`${colorVariants[currentImage.alt ? 'alt' : 'empty']}  bg-white border-2 border-gray-200 rounded w-full py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-blue-100`}
                                value={currentAlt ? currentAlt : "[Empty]"} />

                            {/* <Input id="alt" readOnly={false}
                                className={`${colorVariants[currentImage.alt ? 'alt' : 'empty']} bg-white border-2 border-gray-200 rounded w-full py-2 px-4 leading-tight focus:outline-none focus:bg-white focus:border-blue-100`}
                                type="text" value={currentImage.alt ? currentImage.alt : "[Empty]"} /> */}
                        </div>
                        <div className='w-1/12'>
                            <Tippy content={<span>Reset the alt text to what it is in the current epub</span>}>


                                <Button disabled={busy}
                                    className={`${updatedAlt[currentAlt.localeCompare(currentImage.original_alt) ? 'original' : 'invisible']} disabled:opacity-0`}
                                    onClick={ResetAlt}>

                                    Reset</Button>
                            </Tippy>
                        </div>

                        {/* <div className="w-1/12" /> */}
                    </div>

                    <div className="flex items-center mb-1 w-full gap-2">
                        <div className="w-2/12">

                            {/* <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild> */}
                            {/* <div className='has-tooltip'> */}
                            <Tippy content={<span>The context of the image to help create an accurate description.<br />Check to include when generating the alt text</span>}>
                                <Label className="block text-gray-500 md:text-right mb-1 md:mb-0 pr-2" htmlFor='context'>
                                    Context
                                    <Checkbox className="ml-4" onClick={() => setIncludeContext(!includeContext)} checked={includeContext} id="include" />

                                    {/* <label
                                                htmlFor="include"
                                                className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >

                                            </label> */}
                                </Label>
                                {/* </div> */}
                                {/* </TooltipTrigger>
                                    <TooltipContent className="p-0 ml-4">
                                        <p className="italic bg-green-50 p-2">The context of the image to help create an accurate description<br />Check to include when generating the alt text</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider> */}
                            </Tippy>
                        </div>
                        <div className="w-9/12">

                            <AutosizeTextarea id="context"
                                onChange={(e) => setNewContext(e.target.value)}
                                className="bg-gray-100  border-2 border-gray-200 rounded w-full py-2 px-2 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-100"
                                // placeholder={currentImage.context}
                                value={newContext} />
                            {/* <Input id="context" className="bg-gray-100  border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-100" type="text" placeholder={currentImage.context} /> */}

                        </div>

                        <Button disabled={busy} className="w-1/12 disabled:opacity-75 disabled:bg-slate-200" onClick={generateAltText}>Generate</Button>

                    </div>
                    <div className="flex items-center mb-1 w-full gap-2">
                        <div className="w-2/12">
                            <label className="block text-gray-500 md:text-right mb-1 md:mb-0 pr-2" htmlFor='newAlt'>
                                New Alt Text
                            </label>
                        </div>
                        <div className="w-9/12">
                            <AutosizeTextarea id="newAlt"
                                onChange={(e) => setNewAlt(e.target.value)}
                                className="bg-gray-100 appearance-none border-2 border-gray-200 rounded w-full py-2 px-2 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-100"
                                // placeholder={currentImage.alt}
                                value={newAlt} />

                            {/* <Input id="newAlt"
                                onChange={(e) => setNewAlt(e.target.value)}
                                className="bg-gray-100 appearance-none border-2 border-gray-200 rounded w-full py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-blue-100"
                                type="text"
                                placeholder={currentImage.alt}
                                value={newAlt} /> */}

                        </div>
                        <Button disabled={busy} className={`${updatedAlt[currentAlt.localeCompare(newAlt) ? 'original' : 'invisible']} w-1/12 disabled:opacity-75 disabled:bg-slate-200`} onClick={applyNewAlt}>Apply</Button>

                    </div>
                </div>
            }

        </div>


        <AlertDialog open={isAlertDialogOpen} onOpenChange={setAlertDialogOpen}>
            {/* <AlertDialogTrigger>Switch Epub</AlertDialogTrigger> */}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle></AlertDialogTitle>
                    <AlertDialogDescription>
                        The existing epub has changes that have not been saved to a new Epub. Are you sure you want to switch to a new epub?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { setAlertDialogOpen(false); handleSetEpub(""); }}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div >
}
