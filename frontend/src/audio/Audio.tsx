import {useCallback, useEffect, useRef, useState} from 'react';
import Recorder, {RecordType} from './Recorder';

// import { SignalPayload } from "@riffr/backend/modules/Mesh";
import {Mesh, MeshedPeer} from "../connections/Mesh";
import {SignallingChannel} from "../connections/SignallingChannel";
import Canvas from "../Canvas";

import {Mesh as M} from '@riffr/backend';

export interface DecodedRecord {
    buffer: AudioBuffer;
    startOffset: number;
    isBackingTrack: boolean;
    //endOffset: number;
}

enum RecorderState {
    REC,
    MUTE,
    STOP
}

let AudioContext: any = window.AudioContext // Default
    || (window as any).webkitAudioContext // Safari

const createAudioCtx = () => {
    let ctx: AudioContext = new AudioContext();
    ctx.suspend();
    return ctx;
}

const Audio = (props: { signal: SignallingChannel }) => {
    const [paused, setPaused] = useState(true);
    const [loopLength, setLoopLength] = useState<number>(8);
    const [sounds, setSounds] = useState<Map<string, DecodedRecord[]>>(new Map());
    const [previousSounds, setPreviousSounds] = useState<Map<string, DecodedRecord>>(new Map());

    const [time, setTime] = useState(0);
    const [mesh, setMesh] = useState<Mesh | undefined>(undefined);

    const [canvasWidth, setCanvasWidth] = useState(1000);
    const [canvasHeight, setCanvasHeight] = useState(600);

    const [recorderState, setRecorderState] = useState(RecorderState.STOP);

    let barCount = useRef(1);
    let newLoopLength = useRef(8);

    const [audioCtx, setAudioCtx] = useState<AudioContext>(createAudioCtx());
    const [audioSources, setAudioSources] = useState<AudioBufferSourceNode[]>([]);

    const resetAudioCtx = () => {
        //audioCtx.close();  // We probably should be closing these, but it crashes :(
        audioCtx.suspend();
        console.log("Resetting AudioContext");
        setAudioCtx(createAudioCtx());
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
            if (state === "connected") {
                console.log(`Mesh: ${peer.meshId} connected via WebRTC :)`);
            }
        });

        m.on("channelOpen", (_, channel: RTCDataChannel) => {
            console.log(`connected with ${channel.label} and ready to send data!`);
            m.send("data", `Hello World from ${m.id}`);
        });

        m.on("channelData", async (peer, channel, data) => {
            console.log(`[AUDIO] Received ${data} from channel ${channel.label}`);
            if (channel.label === "audio") {
                data = await data.arrayBuffer();  // Firefox seems to read data as a blob
                console.log(data);
                let decodedRecord: DecodedRecord = await decodeReceivedData(data);
                addToPlaylist(decodedRecord, peer.meshId!);
            } else if (channel.label === "control") {
                switch (data) {
                    case "play":
                        play();
                        break;
                    case "pause":
                        pause();
                        break;
                }
            }
        });

        setMesh(m);
        return () => props.signal.removeAllListeners("signal");
    }, [props.signal]);

    const sendToPeers = useCallback((record: RecordType, isBackingTrack: boolean = false) => {
        console.log("Sending data to mesh with offset ", record.startOffset)

        if (mesh !== undefined) {
            const floatArray: Float64Array = new Float64Array([record.startOffset]);
            const audioArray: ArrayBuffer = record.buffer;

            // Use uint8 because audio data comes in whole bytes

            const combinedArray = new Uint8Array(floatArray.byteLength + audioArray.byteLength + 1);
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
        let buffer: AudioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer);
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

    const play = () => {
        checkLoopLength();
        setAudioCtx(prev => {
            prev.resume();
            onSectionStart();  // Still doesn't work?
            return prev
        });  // Does the same thing as audioCtx.resume() but always gets called on the actual audioCtx
        setPaused(false);
        //onSectionStart();
    }

    const pause = () => {
        console.log("Pausing");
        let backingTrack = previousSounds.get("backingTrack") || (sounds.get("backingTrack"))?.shift();
        console.log("Backing track being kept:", backingTrack)
        if (backingTrack){
            setPreviousSounds(new Map([["backingTrack", backingTrack]]));
            setSounds(new Map([["backingTrack", []]]));
        }
        else {
            setPreviousSounds(new Map());
            setSounds(new Map());
        }
        barCount.current = 1;

        // Stop currently playing audio
        console.log(audioSources);
        for (let i = 0; i < audioSources.length; i++) {
            audioSources[i].stop();
        }

        resetAudioCtx();
        setPaused(true);
    }

    const togglePaused = () => {
        if (paused) {
            play();
            mesh?.send("control", "play");
        } else {
            pause();
            mesh?.send("control", "pause");
        }
    }

    const getPausedStatus = () => {
        return paused ? "Start" : "Stop";
    }

    const changeLoopLength = (length: number) => {
        newLoopLength.current = length;
    }

    const checkLoopLength = () => {
        if (newLoopLength.current !== loopLength) {
            console.log("Detect loop length change");
            setLoopLength(newLoopLength.current);
        }
    }

    const playSound = (record: DecodedRecord, volume: number = 1) => {
        let sourceNode = audioCtx.createBufferSource();
        let gainNode = audioCtx.createGain();
        sourceNode.buffer = record.buffer;
        sourceNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        gainNode.gain.value = volume;
        console.log("Scheduled to play: ", loopLength * barCount.current);
        sourceNode.start(loopLength * barCount.current, record.startOffset, loopLength);
        audioSources.push(sourceNode);
    }

    const onSectionStart = () => {
        // Bit ugly but lets us read state easily

        // Find and play the correct tracks from other peers
        console.log("Playing sounds:", sounds)
        sounds.forEach((soundList, peerID) => {
            if (soundList !== undefined) {
                let sound;
                if (soundList.length) {
                    sound = soundList.shift()  // Returns and removes the first item in the list
                } else {
                    sound = previousSounds.get(peerID)
                }
                if (sound !== undefined) {
                    // Keep the previous sound around so that we can still play it next iteration if needed
                    previousSounds.set(peerID, sound);

                    playSound(sound);
                }
            }
        });
        barCount.current += 1
    }

    const update = () => {
        setTime(audioCtx.currentTime);
    }

    /* Canvas resizing code */
    const handleResize = () => {
        let w = document.getElementById("canvas")?.offsetWidth || 1;
        let h = document.getElementById("canvas")?.offsetHeight || 1;
        let maxH = document.getElementById("room-wrapper")?.clientHeight || 1;
        // console.log(`Width: ${w}, height: ${h}`);
        setCanvasHeight(maxH - 156);
    }

    window.addEventListener("resize", handleResize);

    useEffect(() => {
        let i1: any;
        if (audioCtx.state == "running") {
            i1 = setInterval(onSectionStart, loopLength * 1000);
        }
        let i2 = setInterval(update, 100);
        let i3 = setInterval(() => console.log(audioCtx), 4000);
        handleResize();
        return () => {
            clearInterval(i1);
            clearInterval(i2);
            clearInterval(i3);
        }
    }, [loopLength, audioCtx, audioCtx.state])

    useEffect(() => {
        let cleanup = initMesh();
        //TODO: Should we clear up the mesh once we leave the room?
    }, [])

    return (
        <div style={{
            position: "relative",
            gridRow: "1 /span 2",
            gridColumn: "2",
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'inherit'
        }}>
            <Canvas id={"canvas"} width={canvasWidth} height={canvasHeight} time={time} sounds={sounds}
                    loopLength={loopLength} recorderState={recorderState}/>
            <div id={"controls"}>
                <div id={"audio"}>
                    <Recorder
                        audioCtx={audioCtx}
                        paused={paused}
                        addToPlaylist={addToPlaylist}
                        sendToPeers={sendToPeers}
                        loopLength={loopLength}
                        changeLoop={changeLoopLength}
                    />
                    <div style={{paddingTop: "16px"}}>
                        <button id={"play-button"} className={`squircle-button ${paused ? `green` : `red`}`}
                                onClick={togglePaused}>
                            {getPausedStatus()}
                            <i className={`fa fa-${paused ? `play` : `stop`}`}/>
                        </button>
                        {/*<button className={"squircle-button light-blue"} onClick={() => {*/}
                        {/*    mesh?.send("data", "test")*/}
                        {/*}}>Send Dummy Audio*/}
                        {/*</button>*/}
                    </div>
                </div>
            </div>
        </div>
    );
}


export default Audio;
