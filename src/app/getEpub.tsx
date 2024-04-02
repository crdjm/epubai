import { ScriptProps } from "next/script";

export default function GetEpub(props: any) {
    const handleSetEpub = props.handleSetEpub;

    return <div className="flex bg-white items-center justify-center h-screen fg-black">
        <h1 className="mb-4 text-6xl font-extrabold text-blue-400">
            <span className="drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">load</span><span className="shadow-sm shadow-slate-400">epub</span></h1>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => handleSetEpub("fred")}>Get epub</button>
    </div >
}
