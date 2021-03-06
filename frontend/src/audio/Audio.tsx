import { useCallback, useEffect, useRef, useState } from 'react';
import Recorder, { RecordType } from './Recorder';

// import { SignalPayload } from "@riffr/backend/modules/Mesh";
import { Mesh, MeshedPeer } from "../connections/Mesh";
import { SignallingChannel } from "../connections/SignallingChannel";
import Canvas from "../Canvas";

import { Mesh as M } from '@riffr/backend';

export interface DecodedRecord {
    buffer: AudioBuffer;
    startOffset: number;
    isBackingTrack: boolean;
    //endOffset: number;
}

declare var MediaRecorder: any;

const Audio = (props: { signal: SignallingChannel, audioCtx: AudioContext, resetAudioCtx: () => void }) => {
    const [loopLength, setLoopLength] = useState<number>(8);
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
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then((mediaStream: MediaStream) => {
                setMediaRecorder1(new MediaRecorder(mediaStream));
                setMediaRecorder2(new MediaRecorder(mediaStream));
                setPermission(true);
            })
            .catch((err) => {
                console.log('The following error occurred: ' + err);
            });
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

        m.on("channelData", async (peer, channel, data) => {
            console.log(`[AUDIO] Received ${data} from channel ${channel.label}`);
            if (channel.label == "audio") {
                console.log(data);
                let decodedRecord: DecodedRecord = await decodeReceivedData(data);
                addToPlaylist(decodedRecord, peer.meshId!);
            }
        });

        setMesh(m);
        return () => props.signal.removeAllListeners("signal");
    }, [props.signal]);

    const sendToPeers = useCallback((record: RecordType, isBackingTrack: boolean = false) => {
        console.log("Sending data to mesh with offset ", record.startOffset)

        if (mesh != undefined) {
            const floatArray: Float64Array = new Float64Array([record.startOffset]);
            const audioArray: ArrayBuffer = record.buffer;

            // Use uint8 because audio data comes in whole bytes

            const combinedArray = new Uint8Array(floatArray.byteLength + audioArray.byteLength);
            combinedArray.set(new Uint8Array(floatArray.buffer));
            combinedArray.set([isBackingTrack ? 1 : 0], floatArray.byteLength);
            combinedArray.set(new Uint8Array(audioArray), floatArray.byteLength + 1);
            console.log("Sending audio")

            mesh.send("audio", combinedArray.buffer);
        } else {
            console.log("Error: Mesh uninitialised")
        }

    }, [mesh]);

    const decodeReceivedData = async (data: Uint8Array) => {
        let dataView = new DataView(data);

        let startOffset: number = dataView.getFloat64(0, true);
        let isBackingTrack: boolean = !!dataView.getInt8(8);
        let audioArrayBuffer = data.slice(9);  // startOffset (float64) takes up first 8 bytes, isBackingTrack (int8/bool) is 1 byte
        let buffer: AudioBuffer = await props.audioCtx.decodeAudioData(audioArrayBuffer);
        let decodedRecord: DecodedRecord = {
            buffer: buffer,
            startOffset: startOffset,
            isBackingTrack: isBackingTrack,
            //endOffset: 0 //Not currently using this
        }
        console.log("Received sound with start offset ", startOffset)
        return decodedRecord;
    }

    const addToPlaylist = (decodedRecord: DecodedRecord, peerID: string) => {
        console.log("Adding sound from peer ", peerID, " to playlist (isBackingTrack = ", decodedRecord.isBackingTrack, ")");
        if (decodedRecord.isBackingTrack) {
            peerID = "backingTrack";
        }
        if (!(peerID in sounds)) {
            sounds.set(peerID, [])
        }
        sounds.get(peerID)!.push(decodedRecord)
    }

    const clearAudio = () => {
        console.log("Audio Cleared!");
        setPreviousSounds(new Map());
        setSounds(new Map());
    }

    const leave = () => {
        clearAudio();
        props.audioCtx.close();
        props.resetAudioCtx();
    }

    const changeLoopLength = (length: number) => {
        if (length !== loopLength) {
            clearAudio();
            setLoopLength(length);
            sessionOffset.current = props.audioCtx.currentTime;
            setTime(0);
            barCount.current = 1;
        }
    }

    const playSound = (record: DecodedRecord, volume: number = 1) => {
        let sourceNode = props.audioCtx.createBufferSource();
        let gainNode = props.audioCtx.createGain();
        sourceNode.buffer = record.buffer;
        sourceNode.connect(gainNode);
        gainNode.connect(props.audioCtx.destination);
        gainNode.gain.value = volume;
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

    const update = () => {
        setTime(props.audioCtx.currentTime - sessionOffset.current);
    }

    /* Canvas resizing code */
    const handleResize = () => {
        let w = document.getElementById("canvas")?.offsetWidth || 1;
        let h = document.getElementById("canvas")?.offsetHeight || 1;
        // console.log(`Width: ${w}, height: ${h}`);
        setCanvasHeight(canvasWidth * h / w);
    }

    window.addEventListener("resize", handleResize);

    useEffect(() => {
        let i1 = setInterval(onHalfSectionStart, loopLength * 1000);
        let i2 = setInterval(update, 100);
        // let i3 = setInterval(() => console.log(props.audioCtx), 1000);
        handleResize();
        return () => {
            clearInterval(i1);
            clearInterval(i2);
            // clearInterval(i3);
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
                        audioCtx={props.audioCtx}
                        addToPlaylist={addToPlaylist}
                        sendToPeers={sendToPeers}
                        loopLength={loopLength}
                        permission={permission}
                        sessionOffset={sessionOffset.current}
                        changeLoop={changeLoopLength}
                    />
                    <button className={"squircle-button light-blue"} disabled={permission} onClick={init}>Start</button>
                    <button className={"squircle-button light-blue"} onClick={leave}>Leave</button>
                    <button className={"squircle-button light-blue"} onClick={() => {
                        mesh?.send("data", "test")
                    }}>Send Dummy Audio
                    </button>
                </div>

            </div>
        </div >
    );
}


export default Audio;
