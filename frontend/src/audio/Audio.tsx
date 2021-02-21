import React, { useState } from 'react';
import Recorder, { RecordType } from './Recorder';
import Clip from './Clip';

declare var MediaRecorder: any;

const Audio = () => {
    let audioContext: AudioContext = new window.AudioContext();
    const [loopLength, setLoopLength] = useState<number>(8);
    const [mediaRecorder, setMediaRecorder] = useState<any>(null);
    const [playlist, setplaylist] = useState<RecordType[]>([]);
    const [permission, setPermission] = useState(false);

    const init = () => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(onRecorderSuccess)
            .catch((err) => { console.log('The following error occured: ' + err); });
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    const onRecorderSuccess = (mediaStream: MediaStream) => {
        setMediaRecorder(new MediaRecorder(mediaStream));
        setPermission(true);
    }

    const addToPlaylist = (record: RecordType) => {
        console.log("BROADCAST!")
        setplaylist(prev => [...prev, record]);
    }

    const changeLoopLength = (length: number) => {
        setLoopLength(length);
    }


    console.log(playlist)

    return (
        <div>
            {playlist.map((value, index) =>
                <Clip
                    key={index}
                    audioCtx={audioContext}
                    blob={value.blob}
                    mute={false}
                    loopLength={loopLength}
                    recordStart={value.start}
                    recordEnd={value.end}

                />)}
            <Recorder
                recorder={mediaRecorder}
                audioCtx={audioContext}
                addToPlaylist={addToPlaylist}
                loopLength={loopLength}
                permission={permission}
            />
            <button disabled={permission} onClick={init}>Grant permission</button>
        </div>
    );
}


export default Audio;
