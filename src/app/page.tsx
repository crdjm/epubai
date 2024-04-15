'use client'

import { useEffect, useState } from "react";
import Splash from "./splash";
import GetEpub from "./getEpub";
import About from "./about";
import ImgageList from "./imageList";


import { fetch } from '@tauri-apps/api/http';
import { getVersion } from '@tauri-apps/api/app';

export default function Home() {

  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showAbout, setShowAbout] = useState<boolean>(true);

  // const [epubName, setEpubName] = useState<string>("/Users/crdjm/Desktop/CERTIFICATION139_std_dcusb_l1_core_default.epub"); // ("/Users/crdjm/Desktop/mobydick.epub");
  const [epubName, setEpubName] = useState<string>(""); // ("/Users/crdjm/Desktop/mobydick.epub");
  const [epubPath, setEpubPath] = useState<string>("");

  const [user, setUser] = useState<string>("");
  const [appVersion, setAppVersion] = useState<string>("");
  const [accessList, setAccessList] = useState<any>(null);

  async function getAccessList() {
    try {
      const response: any = await fetch('https://boulderwall.com/captionit/access.json', {
        method: 'GET',
        timeout: 30,

      });
      setAccessList(response.data);

      const tmpAppVersion = await getVersion();
      setAppVersion(tmpAppVersion);

    } catch (err) { alert(err) }
  }

  useEffect(() => {
    try {


      const showSplashTime = 2000;

      setTimeout(function () {

        getAccessList();

        const key = window.localStorage.getItem("myEmail");
        setUser(key || "");
        if (key) {
          setShowAbout(false);
        }

        setShowSplash(false);
      }, showSplashTime);
    } catch (err) { alert(err) }

  }, [])


  const handleSetEpub = (name: string) => setEpubName(name);
  const handleSetEpubPath = (name: string) => setEpubPath(name);
  const handleSetUser = (name: string) => { window.localStorage.setItem("myEmail", name); setUser(name); }
  const handleSetAbout = (setAbout: boolean) => setShowAbout(setAbout);

  // Need a way to return to the get epub page -- set the epubName to "" ? What if changes needed? Maybe save changes as we go?

  return (
    <main className="w-screen h-screen bg-white bg-gradient-to-b from-gray-100 to-gray-300">
      {showSplash && <Splash />}

      {!showSplash && showAbout && <About handleSetUser={handleSetUser} currentUser={user} appVersion={appVersion} handleSetAbout={handleSetAbout} />}

      {!showSplash && !showAbout && epubName.length === 0 && <GetEpub handleSetEpub={handleSetEpub} handleSetEpubPath={handleSetEpubPath} />}

      {!showSplash && !showAbout && epubName.length > 0 && <ImgageList epubName={epubName} handleSetEpub={handleSetEpub} epubPath={epubPath} />}

    </main>
  );
}
