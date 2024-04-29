'use client'

import { useEffect, useState } from "react";
import Splash from "./splash";
import GetEpub from "./getEpub";
import About from "./about";
import ImgageList from "./imageList";
import Cryptr from 'cryptr';

import { fetch } from '@tauri-apps/api/http';
import { getVersion } from '@tauri-apps/api/app';
import { listen } from '@tauri-apps/api/event'
// import { access } from "fs";

// Generate icon : npm run tauri icon
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


  function verifyUser(user: string) {
    let ok = false;
    if (accessList && accessList.users) {
      for (let i = 0; i < accessList.users.length; i++) {
        const check = accessList.users[i].email;
        if (check === user) {
          const newCryptr = new Cryptr("epubai_" + user);
          setCryptr(newCryptr);
          const tmpKey = accessList.users[i].key;
          window.localStorage.setItem("key", tmpKey);
          const newKey = newCryptr.decrypt(tmpKey);
          setKey(newKey);
          ok = true;
        }
      }
    }
    return (ok);
  }

  async function getAccessList() {
    try {
      const response: any = await fetch('https://boulderwall.com/tools/epubai/access.json', {
        method: 'GET',
        timeout: 30,

      });
      setAccessList(response.data);
      // alert(JSON.stringify(response.data, null, 2))

      // console.log("Have the access list for epubai");

      const accessList = response.data;
      const email = window.localStorage.getItem("myEmail");
      setUser(email || "");

      // console.log("Found email: " + email);

      let key = null;
      let tmpKey = null;
      if (email && accessList && accessList.users) {

        // console.log("Have email, etc");
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




    } catch (err) { alert("1. " + err) }
  }

  async function getTheVersion() {
    const tmpAppVersion = await getVersion();
    setAppVersion(tmpAppVersion);
  }

  useEffect(() => {
    const unlisten = listen('about', event => {
      setShowAbout(true);
      // alert("Event received: " + JSON.stringify(event));
    });

    try {

      // console.log("Starting epubai...");

      getTheVersion();

      const showSplashTime = 2000;

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

    return () => {
      unlisten.then(f => f());
    }

  }, [])

  function getKey() {

    if (key) {
      return (key);
    } else {
      let tmpKey = window.localStorage.getItem("key");
      let useCryptr = null;

      if (cryptr) {
        useCryptr = cryptr;
      } else {
        useCryptr = new Cryptr("epubai_" + user);
        setCryptr(useCryptr);
      }
      if (tmpKey) {
        const newKey = useCryptr.decrypt(tmpKey);
        setKey(newKey);
        return (newKey);
      } else {
        return (null);
      }
    }
  }


  const handleSetEpub = (name: string) => setEpubName(name);
  const handleSetEpubPath = (name: string) => setEpubPath(name);
  const handleSetUser = (name: string) => {
    const ok = verifyUser(name);
    if (ok) {
      window.localStorage.setItem("myEmail", name);
      setUser(name);
      setShowAbout(false);
    }
    return ok;
  }

  const handleSetAbout = (setAbout: boolean) => setShowAbout(setAbout);

  // Need a way to return to the get epub page -- set the epubName to "" ? What if changes needed? Maybe save changes as we go?

  return (
    <main className="w-screen h-screen bg-white bg-gradient-to-b from-gray-100 to-gray-300">
      {showSplash && <Splash version={appVersion} />}

      {!showSplash && showAbout && <About handleSetUser={handleSetUser} currentUser={user} appVersion={appVersion} handleSetAbout={handleSetAbout} />}

      {!showSplash && !showAbout && epubName.length === 0 && <GetEpub handleSetEpub={handleSetEpub} handleSetEpubPath={handleSetEpubPath} />}

      {!showSplash && !showAbout && epubName.length > 0 && <ImgageList epubName={epubName} handleSetEpub={handleSetEpub} epubPath={epubPath} getKey={getKey} />}

    </main>
  );
}
