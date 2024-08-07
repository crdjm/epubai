import React, { DOMElement, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ChevronLeft } from "lucide-react"
import { ChevronRight } from "lucide-react"
// import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox"
// import { Textarea } from "@/components/ui/textarea"
import { AutosizeTextarea } from '@/components/ui/autosize-textarea';

import { ReactReader } from 'react-reader'
// var CFI = require('epub-cfi-resolver');

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

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import html2canvas from 'html2canvas';

import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";


import { invoke } from '@tauri-apps/api/tauri';
import { save } from '@tauri-apps/api/dialog';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { exists, readBinaryFile, writeTextFile, createDir, copyFile } from "@tauri-apps/api/fs";
import path from 'path';

var crypto = require('crypto');

// import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
// import IDOMParser from "advanced-html-parser";  // This causes type issues, which should be fixed
const IDOMParser = require("advanced-html-parser");
// const s = new XMLSerializer();
// const str = s.serializeToString(doc);
// alert(doc.documentElement.outerHTML);

import {
    BaseDirectory,
    readTextFile
} from "@tauri-apps/api/fs";
import { Label } from '@/components/ui/label';
import { error } from 'console';

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
    const [component, setComponent] = useState<string | null>("images");

    const [metadata, setMetadata] = useState<any | null>(null);
    const [spine, setSpine] = useState<any | null>(null);
    const [resources, setResources] = useState<any | null>(null);
    const [originalEpub, setOriginalEpub] = useState<any | null>(null);

    const [imageList, setImageList] = useState<any[]>([]);
    const [fullImageList, setFullImageList] = useState<any[]>([]);

    const [fullMathList, setFullMathList] = useState<any[]>([]);
    const [currentMathIndex, setCurrentMathIndex] = useState(0);
    const [currentMath, setCurrentMath] = useState<any | null>(null);
    const [hasFallbackImage, setHasFallbackImage] = useState(false);

    const [location, setLocation] = useState<string | 0>(0);



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
    const [textModel, setTextModel] = useState<any>(null);

    const [isAlertDialogOpen, setAlertDialogOpen] = useState(false)

    const extrasFolder = epubPath + "_extras";

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


    const savedImageList = extrasFolder + "/images.json"; //epubPath + ".json";
    const savedMathList = extrasFolder + "/math.json"; //epubPath + "_math.json";
    const savedMetadata = extrasFolder + "/metadata.json";  //epubPath + "_metadata.json";


    useEffect(() => {
        // alert("name= " + epubName + " path=" + epubPath);
        const tmpKey = getKey();
        if (tmpKey) {
            setKey(tmpKey);
            const genAI = new GoogleGenerativeAI(tmpKey ? tmpKey : "UNDEFINED");
            // setModel(genAI.getGenerativeModel({ model: "gemini-pro-vision", safetySettings }));
            setModel(genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings }));
            setTextModel(genAI.getGenerativeModel({ model: "gemini-pro", safetySettings }));
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
            defaultPath: originalEpub.replace(".epub", "_output.epub"),
            title: "Save Epub",
        });
        if (path) {

            await save_epub_details(); // get_epub_details() in reverse
            setSaveAs(path);
            // const output = (saveAs ? saveAs : epubName.replace(".epub", "_output.epub"));

            // alert(epubPath + " " + output);

            try {
                let res = await invoke<string>('create_epub', { name: epubPath, output: path });
                briefMessage("Epub saved");
                // alert(res);
            } catch (err) { alert(err) }
        }
    }

    function briefMessage(msg: string) {
        setMessage(msg);
        setTimeout(() => {
            setMessage("");
        }, 2000)
    }

    async function save_epub_details() {
        const base = path.basename(epubName);

        try {
            let fullpath = path.join(epubPath, base);
            // alert(epubPath);
            let imgs: { [key: string]: boolean } = {};
            let msg = "";
            let index = 0;
            for (const page of spine) {
                const fileName = path.join(epubPath, resources[page][0]);
                const file = await readTextFile(fileName);
                const doc = IDOMParser.parse(file, { "mimeType": 'text/xml' });
                const images = doc.documentElement.getElementsByTagName('img');
                let changed = false;
                if (images.length > 0) {

                    // msg += resources[page][0] + " - " + images.length;
                    for (let img = 0; img < images.length; img++) {
                        const el = images[img];
                        if (!el) continue;

                        const src = el.getAttribute('src');
                        if (src && !imgs[src]) {
                            imgs[src] = true;
                            const alt = el.getAttribute('alt');
                            if (alt.localeCompare(fullImageList[index].alt) !== 0) {
                                // msg += "  [" + index + "]'" + fullImageList[index].alt + "' <== '" + alt + "'";
                                el.setAttribute('alt', fullImageList[index].alt);

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
            setFullMathList(pre => pre = fullMathList);
            await writeTextFile(savedMathList, JSON.stringify(fullMathList, null, 2));

        } catch (err) { alert(err) }
    }

    function makeid(length: number) {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
            counter += 1;
        }
        return result;
    }

    async function get_epub_details() {
        // alert(epubPath);
        // const baseId = makeid(5);


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

            // Ensure we have a place to store info about he epub
            const extrasExists = await exists(extrasFolder);
            if (!extrasExists) {
                await createDir(extrasFolder, { recursive: true });
            }

            const saveExists = await exists(savedImageList);
            const mathExists = await exists(savedMathList);
            const metadataExists = await exists(savedMetadata);
            // alert(savedImageList + " " + saveExists);

            let metadataIn = null;
            let fullImageList = [];
            let fullMathList = [];

            // TODO remove existimg cache files if we re-load the same epub in case it has changed
            if (1 && saveExists && metadataExists && mathExists) {
                metadataIn = JSON.parse(await readTextFile(savedMetadata));
                setMetadata(metadataIn.metadata);
                setSpine(metadataIn.spine);
                setResources(metadataIn.resources);
                setOriginalEpub(metadataIn.originalEpub);
                // setMessage(metadataIn.originalEpub);
                fullImageList = JSON.parse(await readTextFile(savedImageList));
                fullMathList = JSON.parse(await readTextFile(savedMathList));
            } else {

                let res: any = await invoke<string>('get_epub_data', { fullpath: fullpath });

                const original = path.join(extrasFolder, base);
                const originalExists = await exists(original);
                if (!originalExists) {
                    await copyFile(fullpath, original);
                }

                // Create a copy of the original epub under the extras folder (if it doesn't exist). Ensure it doesn't get added to any saved epubs
                // At this point the epub is expanded. As we read each file, if we need to add an id, do so, and re-save the html
                // If any ids have been added, we should re-save the epub with the new ids

                const [metadata, spine, resources] = res;  // Probably a better way of doing this when I understand rust types more
                setMetadata(metadata);
                setSpine(spine);
                setResources(resources);

                let epubChanged = false;
                // let idIndex = 1;  // Used to add unique ids to images

                let imgs: { [key: string]: boolean } = {};

                let index = 0;
                let mathIndex = 0;

                // let spineIndex = 0;
                for (const page of spine) {
                    const fileName = path.join(epubPath, resources[page][0]);
                    const file = await readTextFile(fileName);
                    // const doc = new DOMParser().parseFromString(file, 'text/xml')
                    const doc = IDOMParser.parse(file, 'text/xml');
                    const baseId = "file" + page;
                    let changed = false;
                    // spineIndex += 2;

                    // Extract image details
                    const images = doc.documentElement.getElementsByTagName('img');
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
                            entry.cfi = path.basename(resources[page][0]);
                            // entry.html = fileName;

                            // Need to update epub to add id's when missing
                            if (el.getAttribute("id")) entry.cfi = entry.cfi + "#" + el.getAttribute("id");// "/" + CFI.generate(images[img]); // fileName; // Allow us to locate the image in context (IFRAME)
                            else { // add an id, and set changed=true;
                                const id = "epubai_" + baseId + "_" + img;
                                entry.cfi = entry.cfi + "#" + id;
                                el.setAttribute("id", id);
                                // idIndex++;
                                changed = true;
                            }

                            // else {
                            //     const closeDiv = el.closest("[id]");
                            //     if (closeDiv && closeDiv.getAttribute("id")) {
                            //         entry.cfi = entry.cfi + "#" + closeDiv.getAttribute("id");
                            //         alert("Closest div: " + entry.cfi);
                            //     }
                            // }
                            // else entry.cfi = "";

                            // entry.cfi = "Spine " + spineIndex + "/" + CFI.generate(images[img]);

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
                                                    else {
                                                        // Look for figcaption as a child of figure, if present, use that
                                                        entry.context = "";
                                                    }
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

                    const maths = doc.documentElement.getElementsByTagNameNS('*', 'math');
                    if (maths.length > 0) {

                        mathIndex++;

                        for (let math = 0; math < maths.length; math++) {
                            const el = maths.item(math);
                            if (!el) continue;
                            let entry: any = {};
                            entry.mathml = maths[math].outerHTML;
                            const mathml = (entry.mathml).replace(/ id="[^"]*"/g, "");
                            entry.index = mathIndex;
                            // Allow us to ignore duplicate math fragments, and update them all at the same time
                            entry.hash = crypto.createHash('md5').update(mathml).digest('hex');
                            entry.alt = maths[math].getAttribute('alttext') || "";
                            entry.current_alt = entry.alt;
                            // entry.filename = resources[page][0];
                            fullMathList.push(entry);

                        }

                    }

                    if (changed) {
                        await writeTextFile(fileName, doc.toString());
                        epubChanged = true;
                    }
                }

                setOriginalEpub(epubName);

                const saveMeta = {
                    "originalEpub": epubName,
                    "metadata": metadata,
                    "spine": spine,
                    "resources": resources
                }

                if (epubChanged) {
                    // alert("Epub has changed, saving..." + epubPath + " to " + fullpath);
                    try {
                        let res = await invoke<string>('create_epub', { name: epubPath, output: fullpath });
                        // briefMessage("Epub saved");
                        // alert(res);
                    } catch (err) { alert(err) }
                }

                await writeTextFile(savedImageList, JSON.stringify(fullImageList, null, 2));
                await writeTextFile(savedMathList, JSON.stringify(fullMathList, null, 2));
                await writeTextFile(savedMetadata, JSON.stringify(saveMeta, null, 2));
            }


            setFullImageList(fullImageList);
            setImageList(fullImageList);
            setFullMathList(fullMathList);

            if (fullImageList.length > 0) {
                setCurrentImage(fullImageList[0]);
                setNewContext(fullImageList[0].context);
                setCurrentAlt(fullImageList[0].alt);
                setNewAlt(fullImageList[0].alt);
            }

            if (fullMathList.length > 0) {
                setCurrentMathIndex(0);
                setCurrentMath(fullMathList[0]);
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

    function nextMath() {
        if (currentMathIndex < fullMathList.length - 1) {
            setMath(currentMathIndex + 1);
        }
    }

    function previousMath() {

        if (currentMathIndex > 0) {
            setMath(currentMathIndex - 1);
        }
    }



    async function setImage(index: number) {
        setCurrentImage(imageList[index]);
        setCurrentIndex(index);
        setNewAlt(imageList[index].alt);
        setCurrentAlt(imageList[index].alt);
        setNewContext(imageList[index].context);

        // setLocation(imageList[index].cfi);
        if (imageList[index].cfi) {
            // setLocation("epubcfi(/6/4!/4/46/2[id-5145052549037660536]/1:0)");
            // setLocation("epubcfi(/6/4!/4/46/1)");
            // alert("CFI: " + imageList[index].cfi);
            setLocation(imageList[index].cfi);
        }
        // setLocation("epubcfi(/6/2!/4/10[background]/6/1:499)");
        // alert("CFI: " + imageList[index].cfi);
        // const html: string = await readTextFile(imageList[index].html);

        // const webview = new WebviewWindow('theUniqueLabel', {
        //     url: imageList[index].html,
        // })

        // setHtmlContent(html);
        // alert("Set image to " + imageList[index].html + "\n" + html.length);
    }
    function setMath(index: number) {

        setCurrentMathIndex(index);
        setCurrentMath(fullMathList[index]);

        setNewAlt(fullMathList[index].alt);
        setCurrentAlt(fullMathList[index].alt);

        const altImage: HTMLImageElement = document.querySelector('#mathmlAlt') as HTMLImageElement;
        altImage.src = "";
        altImage.width = 0;

        setHasFallbackImage(false);


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

    async function verifyAlt() {
        if (currentImage) {
            try {

                setBusy(true);
                briefMessage("Verifying alt text...");

                const result = await readBinaryFile(currentImage.image);
                if (result.length > 5000000) {
                    alert("This image is too large for image analysis, can it be reduced in size?");
                    return;
                }

                // alert(result.length + " " + currentImage.src + " [" + includeContext + "] " + currentImage.context);

                const imageBuffer = Buffer.from(result).toString("base64");

                const imageParts = [bufToGenerativePart(imageBuffer, "image/jpeg")];

                let ai_prompt =
                    "For the image, does this text make good alt text? '" + currentImage.alt + "'";

                // alert(ai_prompt)
                const gemeniResult = await model.generateContent([ai_prompt, ...imageParts]);

                const response = gemeniResult.response;
                let text = response.text();
                alert(text);

                setBusy(false);

            } catch (err) {
                alert("Error: " + err);
                setBusy(false);
            }
        }
    }

    async function generateAltText() {
        if (currentImage) {
            try {

                setBusy(true);
                briefMessage("Generating alt text...");

                const result = await readBinaryFile(currentImage.image);
                if (result.length > 5000000) {
                    alert("This image is too large for image analysis, can it be reduced in size?");
                    return;
                }

                // alert(result.length + " " + currentImage.src + " [" + includeContext + "] " + currentImage.context);

                const imageBuffer = Buffer.from(result).toString("base64");

                const imageParts = [bufToGenerativePart(imageBuffer, "image/jpeg")];

                let ai_prompt =
                    "write a short, descriptive alt text for this image.";


                if (includeContext) {
                    const context = document.getElementById('context')?.textContent;
                    ai_prompt = "Within the context of '" + context + "', " + ai_prompt;
                }
                // alert(ai_prompt)
                const gemeniResult = await model.generateContent([ai_prompt, ...imageParts]);

                const response = gemeniResult.response;

                // alert(JSON.stringify(response));
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

    async function generateMathAlt() {

        try {

            setBusy(true);
            briefMessage("Generating mathalt text...");

            const canvas: HTMLImageElement = document.querySelector('#mathml') as HTMLImageElement;
            const altImage: HTMLImageElement = document.querySelector('#mathmlAlt') as HTMLImageElement;
            if (canvas) {
                // Need to understand the scaling better?
                html2canvas(canvas, { x: -1, y: 21, width: canvas.width, height: canvas.height, scale: 1 }).then(canvas => {
                    // const image = canvas.toDataURL("image/jpeg");
                    var dataURL = canvas.toDataURL();
                    // const xxx = dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
                    // alert(xxx);
                    altImage.width = canvas.width;
                    altImage.height = canvas.height;
                    altImage.src = dataURL;
                    setHasFallbackImage(true);
                });



            }
            // return;

            let ai_prompt =
                "Generate alt text for this mathml: " + currentMath.mathml;

            const result = await textModel.generateContent(ai_prompt);
            const text = result.response.text();
            // console.log(result.response.text());
            // alert(ai_prompt);


            // const gemeniResult = await model.generateContent([ai_prompt, ...imageParts]);

            // const response = gemeniResult.response;
            // let text = response.text();

            setNewAlt(text.trim());

            setBusy(false);

            // alert(JSON.stringify(response));

        } catch (err) {
            alert(err);
            setBusy(false);
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


    function epublocation(location: string) {
        // alert("EPUB SET LOCATION: " + location);
        // setLocation("xhtml/" + location);
        setLocation(location);

    }
    // function iframeLoaded() {
    //     let html = document.getElementById('html');
    //     alert(html);
    //     if (html) {
    //         html.innerHTML = "<h1>Hello</h1>";
    //     }
    //     // let myIframe = document.getElementById('html') as HTMLIFrameElement
    //     // if (myIframe && myIframe.contentWindow) myIframe.contentWindow.scrollTo(10, 1000);
    // }

    const base = path.basename(epubName);
    let fullpath = path.join(epubPath, base);

    return <div className="flex flex-col px-0 py-0 gap-0  bg-blue-50 min-h-full min-w-full">
        <div className="flex w-full items-center px-2 py-2 gap-2 bg-slate-200">
            {/* <Button onClick={get_epub_details}>Get Metadata</Button> */}
            <Button disabled={saveNeeded} onClick={save_epub}>Save epub</Button>
            <Tippy content={<span>Switch to another epub</span>}>
                <Button onClick={newEpub}>Switch epub</Button>
            </Tippy>
            <Select defaultValue='images' onValueChange={(value) => setComponent(value)}>
                <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="images">Images</SelectItem>
                    <SelectItem value="math">Math</SelectItem>
                    <SelectItem value="tables">Tables</SelectItem>
                </SelectContent>
            </Select>

            <div className="flex-grow text-red-400">{message}</div>

            {(component === "images" ?
                <>
                    <Tippy content={<span>Only show images with missing, or single word alt text</span>}>
                        <Button onClick={toggleWhatToShow}>{show == WhatToShow.ShowMissingAlt ? "Show All" : "Refine List"}</Button>
                    </Tippy>
                    <Button variant="outline" disabled={currentIndex === 0} size="icon" onClick={previousImage}><ChevronLeft className="h-4 w-4" /></Button>
                    <span>{currentIndex + 1} / {imageList.length}</span>
                    <Button variant="outline" disabled={currentIndex === imageList.length - 1} size="icon" onClick={nextImage}><ChevronRight className="h-4 w-4" /></Button>
                </> : <></>)}

            {(component === "math" ?
                <>
                    <Button variant="outline" disabled={currentMathIndex === 0} size="icon" onClick={previousMath}><ChevronLeft className="h-4 w-4" /></Button>
                    <span>{currentMathIndex + 1} / {fullMathList.length}</span>
                    <Button variant="outline" disabled={currentMathIndex === fullMathList.length - 1} size="icon" onClick={nextMath}><ChevronRight className="h-4 w-4" /></Button>
                </> : <></>)}




        </div>
        {/* <div>{originalEpub}</div> */}
        <div className="grow flex flex-col  px-2 py-2 gap-1  bg-blue-50 min-h-full min-w-full">
            <h3 className="animate-text bg-gradient-to-r from-slate-800  to-slate-500 bg-clip-text text-transparent text-2xl font-black">{metadata?.title}</h3>

            <div className='flex p-1 overflow-x-scroll min-h-12 min-w-full gap-2 items-center justify-center bg-blue-100 border rounded-lg border-blue-100'>

                {component === "images" && imageList.map((img, index) => (
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

            {(loading ?
                <div className="flex-grow flex justify-center items-center  h-full relative">
                    <p className="text-2xl font-black">Loading epub</p>
                </div>
                : null)}

            {(component === "images" ?
                (loading === false && imageList.length === 0 &&
                    <div className="flex-grow flex justify-center items-center  h-full relative">
                        <p className="text-2xl font-black">No images found in this epub</p>
                    </div>
                )
                : null)}


            {
                component === "images" && currentImage &&
                <>
                    {/* <h2 className='text-l text-blue-700'>{path.basename(currentImage.image)}</h2> */}

                    <div className="flex flex-1 h-full">
                        {/* <div className="flex-grow flex justify-center items-center  h-full relative m-2"> */}
                        {/* <img className="absolute max-h-full bg-slate-50 rounded-lg border border-slate-200 shadow-xl" src={convertFileSrc(currentImage.image)} alt={currentImage.alt}></img> */}

                        {/* </div> */}

                        <div className="w-full flex-grow">
                            {/* <iframe id="html" className="none w-full h-full" src={convertFileSrc(currentImage.html)} title="HTML"></iframe> */}

                            <ReactReader
                                // url={convertFileSrc("/Users/crdjm/Desktop/WiseInk/9781634895712.epub")}
                                url={convertFileSrc(fullpath)}
                                // url={convertFileSrc("/Users/crdjm/Library/Caches/epubai/pg14838-images/pg14838-images.epub")}
                                // url="/mobydick.epub"
                                // url="/pg14838-images.epub"
                                location={location}
                                epubOptions={{
                                    allowPopups: true, // Adds `allow-popups` to sandbox-attribute
                                    allowScriptedContent: true, // Adds `allow-scripts` to sandbox-attribute
                                }}
                                locationChanged={(epubcfi: string) => epublocation(epubcfi)}
                                getRendition={(rendition) => {
                                    const spine_get = rendition.book.spine.get.bind(rendition.book.spine);
                                    rendition.book.spine.get = function (target: string) {
                                        // console.log("target = " + target);

                                        let t = spine_get(target);
                                        // console.group(t);
                                        if (t == null) {
                                            const s = rendition.book.spine as any;
                                            // console.log(s);

                                            const p = s.spineItems[0].href;
                                            if (p.indexOf("/") > 0) {
                                                target = p.substring(0, p.lastIndexOf("/")) + "/" + target;
                                                // target = "xhtml/" + target;
                                                t = spine_get(target);
                                            }
                                        }
                                        while ((t == null) && target && target.startsWith("../")) {
                                            target = target.substring(3);
                                            t = spine_get(target);
                                        }
                                        return t;
                                    }
                                }}

                            />
                        </div>
                    </div>

                    {/* <div className="overflow-y-auto overflow-x-hidden flex-grow max-w-fit h-14" dangerouslySetInnerHTML={{ __html: htmlContent }}></div> */}


                    {/* IFRAME */}
                    {/* <span>{convertFileSrc(currentImage.html)}</span> */}

                    {/* <iframe id="html" onLoad={() => iframeLoaded()} className="none w-full" src={convertFileSrc(currentImage.html)} title="HTML"></iframe> */}

                    {/* <object id="html" onLoad={() => iframeLoaded()} className="none w-full">HARRY</object> */}

                    <div className="none w-full">
                        <div className="flex items-center mb-1 gap-2 w-full">
                            <img className="max-h-40 max-w-40 bg-slate-50 rounded-lg border border-slate-200 shadow-xl" src={convertFileSrc(currentImage.image)} alt={currentImage.alt}></img>

                            <div className="flex-col mb-1 gap-2 w-full">

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

                                    {currentAlt.localeCompare(currentImage.original_alt) !== 0 &&
                                        <div className='w-1/12'>

                                            <Tippy content={<span>Reset the alt text to what it is in the current epub</span>}>


                                                <Button disabled={busy}
                                                    className={`${updatedAlt[currentAlt.localeCompare(currentImage.original_alt) ? 'original' : 'invisible']} max-w-full disabled:opacity-0`}
                                                    onClick={ResetAlt}>

                                                    Reset</Button>
                                            </Tippy>
                                        </div>
                                    }

                                    {currentAlt.localeCompare(currentImage.original_alt) === 0 &&
                                        <div className='w-1/12'>

                                            <Tippy content={<span>Evaluate the current alt text to see if it is suitable for the image</span>}>


                                                <Button disabled={busy}
                                                    className={`${updatedAlt[currentAlt.localeCompare(currentImage.original_alt) ? 'invisible' : 'original']} max-w-full disabled:opacity-0`}
                                                    onClick={verifyAlt}>

                                                    Verify</Button>
                                            </Tippy>

                                        </div>
                                    }
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
                        </div>
                    </div>
                </>
            }


            {(component === "math" ?
                (loading === false && fullMathList.length === 0 &&
                    <div className="flex-grow flex justify-center items-center  h-full relative">
                        <p className="text-2xl font-black">No math found in this epub</p>
                    </div>
                )
                : null)}

            {component === "math" && fullMathList.length > 0 &&
                <>

                    <div className="flex-grow flex flex-col justify-center items-center  h-full relative m-2">
                        <div className="text-5xl p-4  max-h-full bg-slate-50 rounded-lg border border-slate-200 shadow-xl">
                            <div id="mathml" dangerouslySetInnerHTML={{ __html: fullMathList[currentMathIndex].mathml }} />

                        </div>
                        {/* {hasFallbackImage && */}
                        <div className="mt-5 flex text-5xl p-4 just-center items-center max-h-full bg-slate-50 rounded-lg border border-slate-200 shadow-xl">
                            <div className="text-sm">Fallback image</div><img className="ml-5 border" id="mathmlAlt" />

                        </div>
                        {/* } */}
                        {/* <img className="absolute max-h-full bg-slate-50 rounded-lg border border-slate-200 shadow-xl" src={convertFileSrc(currentImage.image)} alt={currentImage.alt}></img> */}
                    </div>

                    <div className="none w-full">

                        <div className="flex items-center mb-1 gap-2 w-full">
                            <div className="w-2/12">
                                <Tippy content={<span>Math alt text in the epub</span>}>
                                    <label className="block text-gray-500 md:text-right mb-1 md:mb-0 pr-2" htmlFor="alt">
                                        Current Alt Text
                                    </label>
                                </Tippy>
                            </div>
                            <div className="w-9/12">
                                <AutosizeTextarea id="alt" readOnly={false}
                                    className={`${colorVariants[currentMath.alt ? 'alt' : 'empty']}  bg-white border-2 border-gray-200 rounded w-full py-2 px-2 leading-tight focus:outline-none focus:bg-white focus:border-blue-100`}
                                    value={currentAlt ? currentAlt : "[Empty]"} />

                                {/* <Input id="alt" readOnly={false}
                                className={`${colorVariants[currentImage.alt ? 'alt' : 'empty']} bg-white border-2 border-gray-200 rounded w-full py-2 px-4 leading-tight focus:outline-none focus:bg-white focus:border-blue-100`}
                                type="text" value={currentImage.alt ? currentImage.alt : "[Empty]"} /> */}
                            </div>

                            {currentAlt.localeCompare(currentMath.original_alt) !== 0 &&
                                <>
                                    {/* <div className='w-1/12'>

                                        <Tippy content={<span>Reset the alt text to what it is in the current epub</span>}>


                                            <Button disabled={busy}
                                                className={`${updatedAlt[currentAlt.localeCompare(currentMath.original_alt) ? 'original' : 'invisible']} max-w-full disabled:opacity-0`}
                                                onClick={ResetAlt}>

                                                Reset</Button>

                                        </Tippy>
                                    </div> */}

                                    <div className='w-1/12'>
                                        <Tippy content={<span>Generate alt text for this math</span>}>


                                            <Button disabled={busy}
                                                className={`${updatedAlt[currentAlt.localeCompare(currentMath.original_alt) ? 'original' : 'invisible']} max-w-full disabled:opacity-0`}
                                                onClick={generateMathAlt}>

                                                Generate</Button>
                                        </Tippy>
                                    </div>
                                </>
                            }

                            {currentAlt.localeCompare(currentMath.original_alt) === 0 &&
                                <div className='w-1/12'>

                                    <Tippy content={<span>Evaluate the current alt text to see if it is suitable for the image</span>}>


                                        <Button disabled={busy}
                                            className={`${updatedAlt[currentAlt.localeCompare(currentMath.original_alt) ? 'invisible' : 'original']} max-w-full disabled:opacity-0`}
                                            onClick={verifyAlt}>

                                            Verify</Button>
                                    </Tippy>

                                </div>
                            }
                            {/* <div className="w-1/12" /> */}
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
                                    value={newAlt} />



                            </div>
                            <Button disabled={busy} className={`${updatedAlt[currentAlt.localeCompare(newAlt) ? 'original' : 'invisible']} w-1/12 disabled:opacity-75 disabled:bg-slate-200`} onClick={applyNewAlt}>Apply</Button>

                        </div>



                    </div>


                    {/* <div>{fullMathList[currentMathIndex].filename}</div> */}
                </>



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
