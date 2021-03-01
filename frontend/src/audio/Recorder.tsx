import {useEffect, useRef, useState} from 'react';
import {SignallingChannel} from "../connections/SignallingChannel";

type BlobEvent = { data: Blob; }

export interface RecordType {
    blob: Blob;
    startOffset: number;
    endOffset: number;
}

interface RecorderProps {
    recorder: any;
    audioCtx: AudioContext;

    sendToPeers(record: RecordType): void;

    loopLength: number;
    permission: boolean;
}

//Todo: Not really synced with the audio player, might have to move logic here into audio as well
const Recorder = (props: RecorderProps) => {
    let chunks: BlobPart[] = [];
    const startOffset = useRef(0);
    const stopOffset = useRef(0);
    const [recordNext, setRecordNext] = useState(false);
    const [recording, setRecording] = useState(false);

    const checkRecord = () => {
        //console.log("Checking if we should start recording at time ", props.audioCtx.currentTime)

        if (props.loopLength - props.audioCtx.currentTime % props.loopLength <= props.loopLength / (10 * 2)) {
            console.log("Checking recordNext")
            if (recordNext) {
                console.log("We should!")
                setRecordNext(false);
                startRecording();
                console.log("We're recording!")
                return false;
            }
        }
    }

    const startRecording = () => {
        if (props.audioCtx.state === 'suspended') {
            console.log("Audio context permission required");
        }
        if (props.recorder !== null && props.recorder.state !== 'recording') {
            console.log("Start recording...");
            props.recorder.start();
            startOffset.current = props.loopLength - props.audioCtx.currentTime % props.loopLength;
            setTimeout(stopRecording, props.loopLength * 1000 + startOffset.current * 1000);
            setRecording(true);
        } else {
            console.log("Recording failed")
            console.log(props.recorder)
        }
    }

    const stopRecording = () => {
        if (props.recorder !== null && props.recorder.state !== 'inactive') {
            console.log("Stop recording");
            setRecording(false);
            props.recorder.stop();
            stopOffset.current = props.audioCtx.currentTime % props.loopLength;
        }
    }

    const saveRecording = () => {
        const clip: RecordType = {
            blob: new Blob(chunks, {'type': 'audio/ogg; codecs=opus'}),
            startOffset: startOffset.current,
            endOffset: stopOffset.current
        };
        console.log(clip)
        props.sendToPeers(clip);
        chunks = [];
    }


    if (props.recorder !== null) {
        props.recorder.onstop = saveRecording;

        props.recorder.ondataavailable = (evt: BlobEvent) => {
            console.log("Saving")
            chunks.push(evt.data);
        }
    }

    useEffect(() => {
        let i1 = setInterval(checkRecord, props.loopLength * 10);
        console.log(props.recorder)
        return () => {
            clearInterval(i1);
        }
    }, [props.loopLength, props.recorder, props.permission, recordNext])


    return (
        <div>
            <label hidden = {!recording}>Recording</label>
            <label hidden = {recording}>Not recording</label>
            <button className={"squircle-button light-blue"} disabled={!props.permission || recordNext}
                    onClick={() => setRecordNext(true)}>Record next loop
            </button>
        </div>
    );
}

export default Recorder;
