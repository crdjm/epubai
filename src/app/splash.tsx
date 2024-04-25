interface Props {
    version: string;
}


export default function Splash(props: Props) {
    const version = props.version;

    return <div className="flex flex-col bg-white items-center justify-center h-screen fg-black">
        <h1 className="mb-4 text-6xl font-extrabold text-blue-400">
            <span className="drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">epub</span><span className="shadow-sm shadow-slate-400">AI</span>
        </h1>
        <h2 className="mt-2 text-lg font-extrabold text-blue-400">Version {version}</h2>

        <h2 className="drop-shadow mt-10 text-4xl font-extrabold text-blue-400">Boulderwall Software</h2>

    </div >
}
