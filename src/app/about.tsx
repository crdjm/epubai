import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface Props {
    handleSetUser: (userName: string) => void;
    handleSetAbout: (setAbout: boolean) => void;
    currentUser: string;
    appVersion: string;
}

export default function About(props: Props) {
    const handleSetUser = props.handleSetUser;
    const handleSetAbout = props.handleSetAbout;
    const currentUser = props.currentUser;
    const appVersion = props.appVersion;

    const [localUser, setLocalUser] = useState<string>(currentUser);

    function changeKey(val: string) {
        handleSetUser(val);
        setLocalUser(val);
    }

    async function handleSubmit(e: any) {
        try {
            if (e.preventDefault) e.preventDefault();

            var formData = new FormData(e.target);
            const form_values = Object.fromEntries(formData);


            // Assume it is a valid email
            handleSetAbout(false);

            //alert(form_values.licenseKey);

            // localWindow.localStorage.setItem("myEmail", gemeniKey);

            // if (!accessList) {
            //     alert("Sorry, can't get access list to verify your email.");
            //     return;
            // }

            // // If the status says stop, don't even both checking. We'll already have a message saying why
            // if (accessList.stop) {
            //     setShowAbout(true);
            //     return;
            // }

            // // setMessage(JSON.stringify(accessList, null, 2));

            // let ok = false;
            // for (let i = 0; i < accessList.users.length; i++) {
            //     const check = accessList.users[i].email;
            //     if (check === gemeniKey) {
            //         ok = true;
            //         break
            //     }
            // }
            // if (!ok) {
            //     setError("Sorry, can't verify your email. Did you register this email with djm@boulderwall.com?");
            //     return;
            // }

            // // setGemeniKey(apiKey);
            // if (ok) {
            //     setError(null);
            //     setShowAbout(false);
            // }
        } catch (error) {
            alert(error);
        }
    }

    return <div className="flex flex-col space-y-5 sm:px-12 bg-slate-100 h-full min-h-screen">
        <div className="flex w-full justify-center p-8">

            <h1 className="mb-4 text-4xl font-extrabold text-gray-900 dark:text-white md:text-5xl lg:text-6xl">
                <span className="drop-shadow-md text-transparent bg-clip-text bg-gradient-to-r to-emerald-600 from-sky-400">Caption</span>IT <span className="ml-2 text-xs">Version {appVersion}</span></h1>
            {/* <p className="text-lg font-normal text-gray-500 lg:text-xl dark:text-gray-400">Here at Flowbite we focus on markets where technology, innovation, and capital can unlock long-term value and drive economic growth.</p> */}

        </div>
        <form className="flex w-full justify-center align-center space-x-2" onSubmit={handleSubmit}>
            {/* <Label htmlFor="licenseKey" className="mt-3">Email</Label> */}
            <Input type="email" id="licenseKey" name="licenseKey" placeholder="Your email address" value={localUser} onChange={e => changeKey(e.currentTarget.value)} />
            <Button type="submit">Apply</Button>
        </form>
        <div className="w-full bg-gray-300 rounded-lg p-4 text-sm text-gray-600 ">
            EpubAI uses AI to generate captions for images. All captions are generated in good faith and for general information purpose only.
            Boulderwall Software does not make any warranties about the completeness, reliability, and accuracy of this information.
            Any action you take upon the information you find using CaptionIT is strictly at your own risk. Boulderwall Software will not be
            liable for any losses and/or damages in connection with the use of our software.
        </div>
        <div className="bg-gray-300 rounded-lg p-4 text-sm text-gray-600 text-right">
            © 2024, Boulderwall Software
        </div>

        {/* {
            error && error.length > 0 && <div className="bg-red-300 rounded-lg p-4 text-sm text-gray-600">
                {error}
            </div>
        }

        {
            message && message.length > 0 && <div className="bg-red-300 rounded-lg p-4 text-sm text-gray-600">
                {message}
            </div>
        } */}

    </div >
}