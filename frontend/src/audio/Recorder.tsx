import { useEffect, useRef, useState } from 'react';
import AudioUploader from './AudioUploader';
import { SignallingChannel } from "../connections/SignallingChannel";
import { DecodedRecord } from "./Audio";

declare var MediaRecorder: any;
type BlobEvent = { data: Blob; }

export interface RecordType {
    buffer: ArrayBuffer;
    startOffset: number;
    //endOffset: number;
}

interface RecorderProps {
    audioCtx: AudioContext;
    paused: boolean;

    addToPlaylist(record: DecodedRecord, peerID: string): void;
    sendToPeers(record: RecordType, isBackingTrack: boolean): void;

    loopLength: number;
    changeLoop(length: number): void
}

//Todo: Not really synced with the audio player, might have to move logic here into audio as well
const Recorder = (props: RecorderProps) => {
    let chunks: BlobPart[] = [];
    const [recorder1, setMediaRecorder1] = useState<any>(null);
    const [recorder2, setMediaRecorder2] = useState<any>(null);

    const startOffset = useRef(0);
    const stopOffset = useRef(0);
    const [permission, setPermission] = useState(false);

    const [muted, setMuted] = useState(true);
    const [recording, setRecording] = useState(false);

    const checkRecord = () => {
        if (!recording && props.loopLength - (props.audioCtx.currentTime) % props.loopLength <= (props.loopLength / 10)) {
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
        if (recorder1 !== null && recorder1.state !== 'recording') {
            recorder = recorder1;
        } else if (recorder2 !== null && recorder2.state !== 'recording') {
            recorder = recorder2;
        }
        if (recorder) {
            console.log("Start recording...");
            // Set recording to true and then back to false midway through the iteration so that checkRecord isn't triggered again
            setRecording(true);
            setTimeout(() => { console.log("Setting recording to false"); setRecording(false) }, props.loopLength * 1000 / 2 + startOffset.current * 1000)

            recorder.start();
            startOffset.current = props.loopLength - (props.audioCtx.currentTime) % props.loopLength;
            setTimeout(() => { stopRecording(recorder) }, props.loopLength * 1000 + startOffset.current * 1000);

        } else {
            console.log("Starting recording failed");
            console.log(recorder1);
            console.log(recorder2);
        }
    }

    const stopRecording = (recorder: any) => {
        if (recorder !== null && recorder.state !== 'inactive') {
            console.log("Stop recording");
            recorder.stop();
            stopOffset.current = (props.audioCtx.currentTime) % props.loopLength;
        }
    }

    const saveRecording = async () => {
        let blob = new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' });
        let audioBuffer = await blob.arrayBuffer();
        const clip: RecordType = {
            buffer: audioBuffer,
            startOffset: startOffset.current
        }
        console.log(clip)
        props.sendToPeers(clip, false);
        chunks = [];
    }


    if (recorder1 !== null) {
        recorder1.onstop = saveRecording;

        recorder1.ondataavailable = (evt: BlobEvent) => {
            console.log("Saving recorder1")
            chunks.push(evt.data);
        }
    }

    if (recorder2 !== null) {
        recorder2.onstop = saveRecording;

        recorder2.ondataavailable = (evt: BlobEvent) => {
            console.log("Saving recorder2")
            chunks.push(evt.data);
        }
    }

    useEffect(() => {
        let i1 = setInterval(() => checkRecord(), props.loopLength * 100);
        return () => {
            clearInterval(i1);
        }
    }, [props.loopLength, recorder1, recorder2, permission, muted])

    const getPermission = async () => {
        let mediaStream: MediaStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });
        setMediaRecorder1(new MediaRecorder(mediaStream));
        setMediaRecorder2(new MediaRecorder(mediaStream));
        setPermission(true);
    }

    const toggleMuted = () => {
        if (!permission) {
            getPermission();
        }
        setMuted(!muted)
    }

    const getMuteStatus = () => {
        return muted ? "Unmute" : "Mute"
    }
    const getRecordingStatus = () => {
        return (recorder1 !== null && recorder1.state === "recording") ? "Recording" : "Not recording"
    }
    const getRecordingStatus2 = () => {
        return (recorder2 !== null && recorder2.state === "recording") ? "Recording" : "Not recording"
    }

    // TODO stop recording immediately when pressing "Mute"
    // TODO Combine both recording status labels into a single recording icon (on the canvas?)
    return (
        <div>
            <label> {getRecordingStatus()}</label>
            <label> {getRecordingStatus2()}</label>
            <button className={"squircle-button light-blue"}
                onClick={toggleMuted}>{getMuteStatus()}
            </button>
            <AudioUploader
                audioCtx={props.audioCtx}
                paused={props.paused}
                permission={permission}
                loopLength={props.loopLength}
                changeLoop={props.changeLoop}
                addToPlaylist={props.addToPlaylist}
                sendToPeers={props.sendToPeers}
            />
        </div>
    );
}

export default Recorder;
