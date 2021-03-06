import { useEffect, useRef, useState } from 'react';
import AudioUpload from './AudioUpload';
import { SignallingChannel } from "../connections/SignallingChannel";
import {DecodedRecord} from "./Audio";

type BlobEvent = { data: Blob; }

export interface RecordType {
    buffer: ArrayBuffer;
    startOffset: number;
    //endOffset: number;
}

interface RecorderProps {
    recorder1: any;
    recorder2: any;
    audioCtx: AudioContext;

    addToPlaylist(record: DecodedRecord, peerID: string): void;
    sendToPeers(record: RecordType): void;

    loopLength: number;
    changeLoop(length: number): void
    permission: boolean;
    sessionOffset: number
}

//Todo: Not really synced with the audio player, might have to move logic here into audio as well
const Recorder = (props: RecorderProps) => {
    let chunks: BlobPart[] = [];
    const startOffset = useRef(0);
    const stopOffset = useRef(0);
    const [muted, setMuted] = useState(true);
    const [recording, setRecording] = useState(false);

    // To get audio context currentTime in this session, use (props.audioCtx.currentTime - props.sessionOffset)

    const checkRecord = (sessionOffset: number) => {
        // console.log("Checking if we should start recording at time ", props.audioCtx.currentTime - sessionOffset);
        if (!recording && props.loopLength - (props.audioCtx.currentTime - sessionOffset) % props.loopLength <= (props.loopLength / 10)) {
            console.log("Checking muted")
            if (!muted) {
                console.log("We should!")
                startRecording();
                console.log("We're recording! ")
                return false;
            }
        }
    }

    const startRecording = () => {
        if (props.audioCtx.state === 'suspended') {
            console.log("Audio context permission required");
        }
        let recorder: any;
        if (props.recorder1 !== null && props.recorder1.state !== 'recording') {
            recorder = props.recorder1;
        } else if (props.recorder2 !== null && props.recorder2.state !== 'recording') {
            recorder = props.recorder2;
        }
        if (recorder) {
            console.log("Start recording...");
            // Set recording to true and then back to false midway through the iteration so that checkRecord isn't triggered again
            setRecording(true);
            setTimeout(() => { console.log("Setting recording to false"); setRecording(false) }, props.loopLength * 1000 / 2 + startOffset.current * 1000)

            recorder.start();
            startOffset.current = props.loopLength - (props.audioCtx.currentTime - props.sessionOffset) % props.loopLength;
            setTimeout(() => { stopRecording(recorder) }, props.loopLength * 1000 + startOffset.current * 1000);

        } else {
            console.log("Starting recording failed");
            console.log(props.recorder1);
            console.log(props.recorder2);
        }
    }

    const stopRecording = (recorder: any) => {
        if (recorder !== null && recorder.state !== 'inactive') {
            console.log("Stop recording");
            recorder.stop();
            stopOffset.current = (props.audioCtx.currentTime - props.sessionOffset) % props.loopLength;
        }
    }

    const saveRecording = async () => {
        let blob = new Blob(chunks, {'type': 'audio/ogg; codecs=opus'});
        let audioBuffer = await blob.arrayBuffer();
        const clip: RecordType = {
            buffer: audioBuffer,
            startOffset: startOffset.current
        }
        console.log(clip)
        props.sendToPeers(clip);
        chunks = [];
    }


    if (props.recorder1 !== null) {
        props.recorder1.onstop = saveRecording;

        props.recorder1.ondataavailable = (evt: BlobEvent) => {
            console.log("Saving recorder1")
            chunks.push(evt.data);
        }
    }

    if (props.recorder2 !== null) {
        props.recorder2.onstop = saveRecording;

        props.recorder2.ondataavailable = (evt: BlobEvent) => {
            console.log("Saving recorder2")
            chunks.push(evt.data);
        }
    }

    useEffect(() => {
        let i1 = setInterval(() => checkRecord(props.sessionOffset), props.loopLength * 100);
        return () => {
            clearInterval(i1);
        }
    }, [props.sessionOffset, props.loopLength, props.recorder1, props.recorder2, props.permission, muted])


    const getMuteStatus = () => {
        return muted ? "Unmute" : "Mute"
    }
    const getRecordingStatus = () => {
        return (props.recorder1 !== null && props.recorder1.state === "recording") ? "Recording" : "Not recording"
    }
    const getRecordingStatus2 = () => {
        return (props.recorder2 !== null && props.recorder2.state === "recording") ? "Recording" : "Not recording"
    }

    // TODO stop recording immediately when pressing "Mute"
    // TODO Combine both recording status labels into a single recording icon (on the canvas?)
    return (
        <div>
            <label> {getRecordingStatus()}</label>
            <label> {getRecordingStatus2()}</label>
            <button className={"squircle-button light-blue"} disabled={!props.permission}
                onClick={() => setMuted(!muted)}>{getMuteStatus()}
            </button>
            <AudioUpload
                audioCtx={props.audioCtx}
                permission={props.permission}
                loopLength={props.loopLength}
                changeLoop={props.changeLoop}
                addToPlaylist={props.addToPlaylist}
                sendToPeers={props.sendToPeers}
            />
        </div>
    );
}

export default Recorder;
