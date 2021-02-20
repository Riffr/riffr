import { useRef } from 'react';

type BlobEvent = { data: Blob; }

export interface RecordType {
    blob: Blob;
    start: number;
    end: number;
}

interface RecorderProps {
    recorder: any;
    audioCtx: AudioContext;
    addToPlaylist(record: RecordType): void;
    loopLength: number;
}

const Recorder = (props: RecorderProps) => {
    let chunks: BlobPart[] = [];
    const startTime = useRef(0);
    const stopTime = useRef(0);

    const startRecording = () => {
        if (props.audioCtx.state === 'suspended') {
            console.log("Audio context permission required");
        }
        if (props.recorder !== null && props.recorder.state !== 'recording') {
            console.log("Start recording...");
            startTime.current = props.audioCtx.currentTime;
            props.recorder.start();
        }
    }

    const stopRecording = () => {
        if (props.recorder !== null && props.recorder.state !== 'inactive') {
            console.log("Stop recording");
            props.recorder.stop();
            stopTime.current = props.audioCtx.currentTime;
        }
    }

    const saveRecording = () => {
        const clip: RecordType = {
            blob: new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' }),
            start: startTime.current % props.loopLength,
            end: stopTime.current % props.loopLength
        };
        // console.log(clip);
        props.addToPlaylist(clip);
        chunks = [];
    }


    if (props.recorder !== null) {
        props.recorder.onstop = saveRecording;

        props.recorder.ondataavailable = (evt: BlobEvent) => {
            chunks.push(evt.data);
        }
    }

    // Not accurate
    setInterval(stopRecording, props.loopLength * 1000);

    return (
        <div>
            <button onClick={startRecording}>Start Recording</button>
            <button onClick={stopRecording}>Stop Recording</button>
        </div>
    );
}


export default Recorder;
