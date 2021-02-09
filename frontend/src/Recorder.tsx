import React from 'react';

declare var MediaRecorder: any;
let mediaRecorder: any = null;
let chunks: BlobPart[] = [];
let recordLength = 4000;

const onSuccess = function (stream: MediaStream) {

    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.onstop = makeAudioURL;

    mediaRecorder.ondataavailable = function (e: any) {
        chunks.push(e.data);
    }
}

const startRecording = function () {
    if (mediaRecorder.state !== 'recording') {
        mediaRecorder.start();

        setTimeout(stopRecording, recordLength);
    }
}

const stopRecording = function () {
    if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

function makeAudioURL() {
    const blob = new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' });
    const audioURL = window.URL.createObjectURL(blob);
    console.log(audioURL);

    chunks = [];
}

function Recorder() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(onSuccess)
        .catch((err) => { console.log('The following error occured: ' + err); });
    return (
        <div>
            <section id="buttons">
                <button disabled={false} onClick={startRecording}>Start Recording</button>
                <button disabled={false} onClick={stopRecording}>Stop Recording</button>
            </section>
        </div>
    );
}


export default Recorder;
