import React, {useCallback, useEffect, useRef, useState} from 'react';
import Recorder, {RecordType} from './Recorder';
import Clip from './Clip';

// import { SignalPayload } from "@riffr/backend/modules/Mesh";
import {Mesh, MeshedPeer} from "../connections/Mesh";
import {SignallingChannel} from "../connections/SignallingChannel";
import Canvas from "../Canvas";

import {Mesh as M} from '@riffr/backend';
import {start} from "repl";

export interface DecodedRecord {
    buffer: AudioBuffer;
    startOffset: number;
    endOffset: number;
}

declare var MediaRecorder: any;

let AudioContext: any = window.AudioContext // Default
    || (window as any).webkitAudioContext // Safari
let audioContext: AudioContext = new AudioContext();

if (audioContext.state === "running") {
    audioContext.suspend();
}

const Audio = (props: { signal: SignallingChannel }) => {
    const [loopLength, setLoopLength] = useState<number>(4);
    const [mediaRecorder1, setMediaRecorder1] = useState<any>(null);
    const [mediaRecorder2, setMediaRecorder2] = useState<any>(null);

    const [sounds, setSounds] = useState<Map<string, DecodedRecord[]>>(new Map());
    const [previousSounds, setPreviousSounds] = useState<Map<string, DecodedRecord>>(new Map());
    const [permission, setPermission] = useState(false);
    const [time, setTime] = useState(0);
    const [mesh, setMesh] = useState<Mesh | undefined>(undefined);
    const [canvasWidth, setCanvasWidth] = useState(1000);
    const [canvasHeight, setCanvasHeight] = useState(600);
    let barCount = useRef(1);
    let sessionOffset = useRef(0);

    const init = () => {
        navigator.mediaDevices.getUserMedia({audio: true, video: false})
            .then(onRecorderSuccess)
            .catch((err) => {
                console.log('The following error occurred: ' + err);
            });
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    const initMesh = useCallback(() => {
        let m = new Mesh();
        console.log(`Initializing mesh with id: ${m.id}`);

        m.on("error", (_, e: Error) => {
            console.log(`Error: ${JSON.stringify(e)}`);
        });

        m.on("signal", (payload: M.SignalPayload) => {
            props.signal.signal(payload);
        });

        props.signal.on("signal", (_, payload: M.MeshPayload) => {
            m.dispatch(payload);
        });

        m.on("connection", (peer: MeshedPeer, state: RTCIceConnectionState) => {
            if (state == "connected") {
                console.log(`Mesh: ${peer.meshId} connected via WebRTC :)`);
            }
        });

        m.on("channelOpen", (_, channel: RTCDataChannel) => {
            console.log(`connected with ${channel.label} and ready to send data!`);
            m.send("data", `Hello World from ${m.id}`);
        });

        m.on("channelData", (peer, channel, data) => {
            console.log(`[AUDIO] Received ${data} from channel ${channel.label}`);
            if (channel.label == "audio") {
                console.log(data);
                decodeReceivedData(data, peer.meshId!);
            }
        });

        setMesh(m);
        return () => props.signal.removeAllListeners("signal");
    }, [props.signal]);


    const onRecorderSuccess = (mediaStream: MediaStream) => {
        setMediaRecorder1(new MediaRecorder(mediaStream));
        setMediaRecorder2(new MediaRecorder(mediaStream));
        setPermission(true);
    }

    const sendToPeers = useCallback(async (record: RecordType) => {
        console.log("Sending data to mesh with offset ", record.startOffset)

        if (mesh != undefined) {
            const floatArray: Float64Array = new Float64Array([record.startOffset]);
            const audioBuffer: ArrayBuffer = await record.blob.arrayBuffer();

            // Use uint8 because audio data comes in whole bytes
            const combinedArray = new Uint8Array(floatArray.byteLength + audioBuffer.byteLength);
            combinedArray.set(new Uint8Array(floatArray.buffer));
            combinedArray.set(new Uint8Array(audioBuffer), floatArray.byteLength);
            console.log("Sending audio")

            mesh.send("audio", combinedArray.buffer);
        } else {
            console.log("Error: Mesh uninitialised")
        }

    }, [mesh]);

    const decodeReceivedData =  async (data: Uint8Array, peerID: string) => {
        let startOffset: number = new DataView(data).getFloat64(0, true);

        let audioArrayBuffer = data.slice(8);  // startOffset (float) takes up first 8 bytes
        console.log("Received sound from ", peerID, " with start offset ", startOffset);
        let buffer: AudioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
        if (!(peerID in sounds)) {
            sounds.set(peerID, [])
        }
        let decodedRecord: DecodedRecord = {
            buffer: buffer,
            startOffset: startOffset,
            endOffset: 0 //Not currently using this
        }
        sounds.get(peerID)!.push(decodedRecord)
    }

    const changeLoopLength = (length: number) => {
        // TODO: Remove all the recorded sound
        if (length !== loopLength) {
            setLoopLength(length);
            sessionOffset.current = audioContext.currentTime;
            setTime(0);
            barCount.current = 1;
        }
    }

    const playSound = (record: DecodedRecord, volume: number = 1) => {
        let sourceNode = audioContext.createBufferSource();
        let gainNode = audioContext.createGain();
        sourceNode.buffer = record.buffer;
        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        gainNode.gain.value = volume;
        console.log(sessionOffset.current + loopLength * barCount.current);
        sourceNode.start(sessionOffset.current + loopLength * barCount.current, record.startOffset, loopLength);
    }

    const onHalfSectionStart = () => {
        // Bit ugly but lets us read state easily

        // Find and play the correct tracks from other peers
        console.log("Playing sounds")
        sounds.forEach((soundList, peerID) => {
            if (soundList != undefined) {
                let sound;
                if (soundList.length) {
                    sound = soundList.shift()  // Returns and removes the first item in the list
                } else {
                    sound = previousSounds.get(peerID)
                }
                if (sound != undefined) {
                    // Keep the previous sound around so that we can still play it next iteration if needed
                    previousSounds.set(peerID, sound);

                    playSound(sound);
                }
            }
        });
        barCount.current += 1
    }

    /* Canvas resizing code */
    const handleResize = () => {
        let w = document.getElementById("canvas")?.offsetWidth || 1;
        let h = document.getElementById("canvas")?.offsetHeight || 1;
        console.log(`Width: ${w}, height: ${h}`);
        setCanvasHeight(canvasWidth * h / w);
    }

    window.addEventListener("resize", handleResize);

    const update = () => {
        setTime(audioContext.currentTime - sessionOffset.current);
    }

    useEffect(() => {
        let i1 = setInterval(onHalfSectionStart, loopLength * 1000);
        let i2 = setInterval(update, 100);
        handleResize();
        return () => {
            clearInterval(i1);
            clearInterval(i2);
        }
    }, [loopLength])

    useEffect(() => {
        let cleanup = initMesh();
        //TODO: Should we clear up the mesh once we leave the room?
    }, [])

    return (
        <div style={{position: "relative", gridRow: "1 /span 2", gridColumn: "2"}}>
            <Canvas id={"canvas"} width={canvasWidth} height={canvasHeight} time={time} sounds={sounds} loopLength={loopLength}/>
            <div id={"controls"}>
                <div id={"audio"}>
                    <Recorder
                        recorder1={mediaRecorder1}
                        recorder2={mediaRecorder2}
                        audioCtx={audioContext}
                        sendToPeers={sendToPeers}
                        loopLength={loopLength}
                        permission={permission}
                        sessionOffset={sessionOffset.current}
                        changeLoop={changeLoopLength}
                    />
                    <button className={"squircle-button light-blue"} disabled={permission} onClick={init}>Start
                    </button>
                </div>

            </div>
        </div >
    );
}


export default Audio;
