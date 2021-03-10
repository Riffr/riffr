import { useEffect, useRef, useState, createRef } from 'react';
import AudioUploader from './AudioUploader';
import { SignallingChannel } from "../connections/SignallingChannel";
import { DecodedRecord } from "./Audio";

declare let MediaRecorder: any;
type BlobEvent = { data: Blob; }

export interface RecordType {
    buffer: ArrayBuffer;
    startOffset: number;
}

interface RecorderProps {
    audioCtx: AudioContext;
    audioOffset: number;
    paused: boolean;

    addToPlaylist(record: DecodedRecord, peerID: string): void;
    sendToPeers(record: RecordType, isBackingTrack: boolean): void;

    loopLength: number;
    changeLoopLength(length: number): void;
    deleteBackingTrack(): void;

    setTimeSignature(val: number): void;
    setDuration(val: number): void;
    setIsRecording(state: boolean): void;
}

const positiveMod = (n: number, m: number) => {
  return ((n % m) + m) % m;
}

//Todo: Not really synced with the audio player, might have to move logic here into audio as well
const Recorder = (props: RecorderProps) => {
    let chunks: BlobPart[] = [];
    const [recorder1, setMediaRecorder1] = useState<any>(null);
    const [recorder2, setMediaRecorder2] = useState<any>(null);

    const startOffset = useRef(0);
    const [permission, setPermission] = useState(false);

    const [muted, setMuted] = useState(true);
    const recording = useRef(false);
    const sig1 = createRef<HTMLInputElement>();
    const tempo = createRef<HTMLInputElement>();
    const duration = createRef<HTMLInputElement>();


    const checkRecord = () => {
        //console.log(props.audioCtx.state, !recording, props.loopLength - positiveMod(props.audioCtx.currentTime - props.audioOffset, props.loopLength))
        if (props.audioCtx.state === "running" && !recording.current &&
            props.loopLength - positiveMod(props.audioCtx.currentTime - props.audioOffset, props.loopLength) <= (1.5)) {
            console.log("Checking muted");
            if (!muted) {
                console.log("We should!");
                startRecording();
                return false;
            }
        }
    };

    const startRecording = () => {
        if (props.audioCtx.state === 'suspended') {
            console.log("Audio context suspended");
        }
        if (!permission) {
            console.log("Trying to record without permission");
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
            recording.current = true;
            setTimeout(() => {
                console.log("Setting recording to false");
                recording.current = false;
            }, props.loopLength * 1000 / 2 + startOffset.current * 1000);

            recorder.start();
            startOffset.current = props.loopLength - positiveMod(props.audioCtx.currentTime - props.audioOffset, props.loopLength);
            console.log("Start offset", startOffset.current)
            setTimeout(() => {
                stopRecording(recorder);
            }, props.loopLength * 1000 + startOffset.current * 1000);

        } else {
            console.log("Starting recording failed");
            console.log(recorder1);
            console.log(recorder2);
        }
    };

    const stopRecording = (recorder: any) => {
        if (recorder !== null && recorder.state !== 'inactive') {
            console.log("Stop recording");
            recorder.stop();
        }
    };

    const saveRecording = async () => {
        if (props.audioCtx.state === "running") {
            const blob = new Blob(chunks, {'type': 'audio/ogg; codecs=opus'});
            const audioBuffer = await blob.arrayBuffer();
            const clip: RecordType = {
                buffer: audioBuffer,
                startOffset: startOffset.current
            };
            console.log(clip);
            props.sendToPeers(clip, false);
            chunks = [];
        }
    };


    if (recorder1 !== null) {
        recorder1.onstop = saveRecording;

        recorder1.ondataavailable = (evt: BlobEvent) => {
            console.log("Saving recorder1");
            chunks.push(evt.data);
        };
    }

    if (recorder2 !== null) {
        recorder2.onstop = saveRecording;

        recorder2.ondataavailable = (evt: BlobEvent) => {
            console.log("Saving recorder2");
            chunks.push(evt.data);
        };
    }

    useEffect(() => {
        const i1 = setInterval(() => checkRecord(), 700);
        return () => {
            clearInterval(i1);
        };
    }, [props.loopLength, props.audioCtx, recorder1, recorder2, permission, muted]);

    const getPermission = async () => {
        const mediaStream: MediaStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });
        setMediaRecorder1(new MediaRecorder(mediaStream));
        setMediaRecorder2(new MediaRecorder(mediaStream));
        setPermission(true);
    };

    const toggleMuted = () => {
        if (!permission) {
            getPermission();
        }
        if (!muted) {
            // Stop recording immediately when pressing 'Mute'
            stopRecording(recorder1);
            stopRecording(recorder2);
        }
        props.setIsRecording(muted);
        setMuted(!muted);
    };

    const getMuteStatus = () => {
        return muted ? "Unmute" : "Mute";
    };

    const getRecordingStatusBoth = () => {
        if (recorder1 === null || recorder2 === null) return false;
        else return recorder1.state === "recording" || recorder2.state === "recording";
    };

    const getMuteTooltip = () => {
        if (muted) return "Unmute";
        else if (getRecordingStatusBoth()) return "Mute";
        else return "Unmuting next cycle";
    };

    const changeSettings = () => {
        if (tempo.current === null || duration.current === null || sig1.current === null) return;
        if (tempo.current?.value !== "") {
            const durationSeconds = duration.current.valueAsNumber * sig1.current.valueAsNumber / tempo.current.valueAsNumber * 60;
            props.changeLoopLength(durationSeconds);
        } else {
            props.changeLoopLength(duration.current.valueAsNumber);
        }
    };

    const backingTrackUpdated = (newDuration: number) => {
        if (tempo.current === null || duration.current === null || sig1.current === null) return;
        if (tempo.current?.value !== "") {
            newDuration = newDuration / 60 * tempo.current.valueAsNumber / sig1.current.valueAsNumber;
        }
        newDuration = Math.round(newDuration * 100) / 100;
        duration.current.valueAsNumber = newDuration;
        console.log(duration.current.valueAsNumber);
    };

    return (
        <div id="coordination">
            <div>
                <button
                    className={"squircle-button light-blue " + (muted ? "muted " : " ") + (getRecordingStatusBoth() ? "recording " : "")}
                    id={"mute"} title={getMuteTooltip()}
                    onClick={toggleMuted}>{getMuteStatus()}
                </button>
            </div>
            <div>
                <label htmlFor={"signature-input"}>Time Sig: </label>
                <input id={"signature-input"} type={"number"} min={1} ref={sig1}
                       onChange={(e) => props.setTimeSignature(e.target.valueAsNumber)} defaultValue={4}/>
                <label htmlFor={"signature-input-2"}> / </label>
                <input id={"signature-input-2"} type={"number"} min={1} defaultValue={4}/>
            </div>
            <div>
                <label htmlFor={"tempo-input"} title={"Set tempo of loop (can be left blank)"}>Tempo: </label>
                <input id={"tempo-input"} type={"number"} min={0} title={"Set tempo of loop (can be left blank)"}
                       ref={tempo} defaultValue={`120`}/>
            </div>
            <div>
                <label htmlFor={"duration-input"}
                       title={"Duration of loop (in seconds, or bars if tempo value filled in)"}>Bars: </label>
                <input id={"duration-input"} type={"number"} min={0} step={1} defaultValue={4}
                       title={"Duration of loop (in seconds, or bars if tempo value filled in)"} ref={duration} onChange={(e) => props.setDuration(e.target.valueAsNumber)}/>
            </div>
            <div>
                <AudioUploader
                    audioCtx={props.audioCtx}
                    paused={props.paused}
                    permission={permission}
                    loopLength={props.loopLength}
                    changeLoopLength={(duration: number) => {
                        backingTrackUpdated(duration);
                        props.changeLoopLength(duration);
                    }}
                    deleteBackingTrack={props.deleteBackingTrack}
                    addToPlaylist={props.addToPlaylist}
                    sendToPeers={props.sendToPeers}
                />
            </div>
            <div>
                <button className={"green circle-button"} style={{width: "30px", padding: "0"}}><i
                    className={"fa fa-check block"} title={"Submit changes"} onClick={changeSettings}/></button>
            </div>
        </div>
    );
};

export default Recorder;
