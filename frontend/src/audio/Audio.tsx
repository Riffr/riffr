import React, { useState } from 'react';
import Recorder, { RecordType } from './Recorder';
import Clip from './Clip';

declare var MediaRecorder: any;

const Audio = () => {
    let audioContext: AudioContext = new window.AudioContext();
    const [loopLength, setLoopLength] = useState<number>(8);
    const [mediaRecorder, setMediaRecorder] = useState<any>(null);
    const [playlist, setplaylist] = useState<RecordType[]>([]);

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
    }

    const addToPlaylist = (record: RecordType) => {
        setplaylist(playlist.concat(record));
    }

    const changeLoopLength = (length: number) => {
        setLoopLength(length);
    }


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
            />
            <button onClick={init}>Grant permission</button>
        </div>
    );
}


export default Audio;
