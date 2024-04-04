// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
import { invoke } from '@tauri-apps/api/tauri';
import { useEffect, useState } from 'react';

interface Props {
    epubName: string;
}

export default function ImgageList(props: Props) {
    const epubName = props.epubName;

    // const [epub, setEpub] = useState<any>(null);
    const [greeting, setGreeting] = useState('');

    useEffect(() => {

        invoke<string>('greet', { name: 'Next.js' })
            .then(result => setGreeting(result))
            .catch(console.error)
    }, [])

    return <div className="flex flex-col space-y-5 sm:px-12 bg-slate-100 h-full min-h-screen">
        <div className="flex w-full justify-center p-8">
            <h1>{epubName}</h1>
            <h2>{greeting}</h2>

        </div>

    </div >
}