'use client'

import { useState } from "react";
import Splash from "./splash";
import GetEpub from "./getEpub";

export default function Home() {

  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [epubName, setEpubName] = useState<string>("");

  const showSplashTime = 2000;

  setTimeout(function () {
    setShowSplash(false);
  }, showSplashTime);


  const handleSetEpub = (name: string) => setEpubName(name);

  return (
    <main className="w-screen h-screen">
      {showSplash && <Splash />}

      {!showSplash && epubName.length === 0 && GetEpub({ handleSetEpub })}

      {!showSplash && epubName.length > 0 && <p className="text-3xl font-bold underline">Hello {epubName}</p>}


    </main>
  );
}
