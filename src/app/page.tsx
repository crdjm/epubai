'use client'

import { useEffect, useState } from "react";
import Splash from "./splash";
import GetEpub from "./getEpub";
import About from "./about";
import ImgageList from "./imageList";
import Cryptr from 'cryptr';

import { fetch } from '@tauri-apps/api/http';
import { getVersion } from '@tauri-apps/api/app';
// import { access } from "fs";

export default function Home() {

  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showAbout, setShowAbout] = useState<boolean>(true);

  // const [epubName, setEpubName] = useState<string>("/Users/crdjm/Desktop/CERTIFICATION139_std_dcusb_l1_core_default.epub"); // ("/Users/crdjm/Desktop/mobydick.epub");
  const [epubName, setEpubName] = useState<string>(""); // ("/Users/crdjm/Desktop/mobydick.epub");
  const [epubPath, setEpubPath] = useState<string>("");

  const [user, setUser] = useState<string>("");
  const [appVersion, setAppVersion] = useState<string>("");
  const [accessList, setAccessList] = useState<any>(null);
  const [key, setKey] = useState<string>("");
  const [cryptr, setCryptr] = useState<any>(null);

  async function getAccessList() {
    try {
      const response: any = await fetch('https://boulderwall.com/tools/epubai/access.json', {
        method: 'GET',
        timeout: 30,

      });
      setAccessList(response.data);
      // alert(JSON.stringify(response.data, null, 2))

      console.log("Have the access list for epubai");

      const accessList = response.data;
      const email = window.localStorage.getItem("myEmail");
      setUser(email || "");

      console.log("Found email: " + email);

      let key = null;
      let tmpKey = null;
      if (email && accessList && accessList.users) {

        console.log("Have email, etc");
        const newCryptr = new Cryptr("epubai_" + email);
        setCryptr(newCryptr);

        for (let i = 0; i < accessList.users.length; i++) {
          const check = accessList.users[i].email;

          if (check === email) {
            console.log("check = " + check + " email = " + email);
            tmpKey = accessList.users[i].key;
            window.localStorage.setItem("key", tmpKey);
            key = newCryptr.decrypt(tmpKey);
            setKey(key);
            console.log("Found key: " + key);
            break
          }
        }
      }


      const tmpAppVersion = await getVersion();
      setAppVersion(tmpAppVersion);

    } catch (err) { alert("1. " + err) }
  }

  useEffect(() => {
    try {

      console.log("Starting epubai...");

      const showSplashTime = 1000;

      getAccessList();

      setTimeout(function () {

        if (!user) {
          const email = window.localStorage.getItem("myEmail");
          // setCryptr(new Cryptr("epubai_" + email));
          setUser(email || "");
          if (email) {
            setShowAbout(false);
          }
        }



        setShowSplash(false);
      }, showSplashTime);
    } catch (err) { alert("2. " + err) }

  }, [])

  function getKey() {

    // let key = null;
    // let tmpKey = null;
    // if (user && accessList && accessList.users) {
    //   for (let i = 0; i < accessList.users.length; i++) {
    //     const check = accessList.users[i].email;

    //     if (check === user) {
    //       tmpKey = accessList.users[i].key;
    //       window.localStorage.setItem("key", tmpKey);
    //       key = cryptr.decrypt(tmpKey);
    //       setKey(key);
    //       break
    //     }
    //   }


    // }

    if (key) {
      return (key);
    } else {
      let tmpKey = window.localStorage.getItem("key");
      if (tmpKey) {
        const newKey = cryptr.decrypt(tmpKey);
        setKey(newKey);
        return (newKey);
      } else {
        return (null);
      }
    }
  }


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

      {!showSplash && !showAbout && epubName.length > 0 && <ImgageList epubName={epubName} handleSetEpub={handleSetEpub} epubPath={epubPath} getKey={getKey} />}

    </main>
  );
}
