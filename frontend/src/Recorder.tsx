import React, { useState } from 'react';
import Clip from './Clip';

declare var MediaRecorder: any;
let mediaRecorder: any = null;
let audioContext = new window.AudioContext();

type BlobEvent = { data: Blob; }

type clipType = {
    blob: Blob;
    start: number;
    end: number;
}

const Recorder = () => {
    let chunks: BlobPart[] = [];
    let recordStartTime: number = 0;
    let recordEndTime: number = 0;
    const [playlist, setplaylist] = useState<clipType[]>([]);


    const onSuccess = function (stream: MediaStream) {
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.onstop = saveRecording;

        mediaRecorder.ondataavailable = function (evt: BlobEvent) {
            chunks.push(evt.data);
        }
    }

    const init = function () {
        console.log(audioContext.state);
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        // console.log(playlist);
    }

    const startRecording = function () {
        if (mediaRecorder.state !== 'recording') {
            recordStartTime = audioContext.currentTime;
            mediaRecorder.start();

            //TODO: time limit on recording?
        }
    }

    const stopRecording = function () {
        if (mediaRecorder.state !== 'inactive') {
            recordEndTime = audioContext.currentTime;
            mediaRecorder.stop();
        }
    }

    function saveRecording() {
        const blobTime: clipType = { blob: new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' }), start: recordStartTime, end: recordEndTime };
        setplaylist(playlist.concat(blobTime));

        chunks = [];
    }


    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(onSuccess)
        .catch((err) => { console.log('The following error occured: ' + err); });

    return (
        <div>
            <section id="buttons">
                <div>
                    {playlist.map((value, index) => <Clip key={index} audioCtx={audioContext} blob={value.blob} play={true} />)}
                </div>
                <button onClick={init}>Grant permission</button>
                <button disabled={false} onClick={startRecording}>Start Recording</button>
                <button disabled={false} onClick={stopRecording}>Stop Recording</button>
            </section>
        </div>
    );
}


export default Recorder;
