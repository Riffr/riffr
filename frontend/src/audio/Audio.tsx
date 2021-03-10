import {useCallback, useEffect, useRef, useState} from 'react';
import Recorder, {RecordType} from './Recorder';

import {Mesh, MeshedPeer} from "../connections/Mesh";
import {SignallingChannel} from "../connections/SignallingChannel";
import Canvas from "../Canvas";

import {Mesh as M} from '@riffr/backend';

export interface DecodedRecord {
    buffer: AudioBuffer;
    startOffset: number;
    isBackingTrack: boolean;
}

const AudioContext: any = window.AudioContext // Default
    || (window as any).webkitAudioContext; // Safari

const createAudioCtx = () => {
    const ctx: AudioContext = new AudioContext();
    ctx.suspend();
    return ctx;
};

const Audio = (props: { signal: SignallingChannel }) => {
    const [paused, setPaused] = useState(true);
    const [loopLength, setLoopLength] = useState<number>(8);
    const [sounds, setSounds] = useState<Map<string, DecodedRecord[]>>(new Map());
    const [previousSounds, setPreviousSounds] = useState<Map<string, DecodedRecord>>(new Map());

    const [time, setTime] = useState(0);
    const [mesh, setMesh] = useState<Mesh | undefined>(undefined);

    const [canvasWidth, setCanvasWidth] = useState(1000);
    const [canvasHeight, setCanvasHeight] = useState(600);

    const [timeSignature, setTimeSignature] = useState(4);
    const [duration, setDuration] = useState(4);
    const [isRecording, setIsRecording] = useState(false);

    const barCount = useRef(1);
    const newLoopLength = useRef(8);

    const [audioCtx, setAudioCtx] = useState<AudioContext>(createAudioCtx());
    const [audioSources, setAudioSources] = useState<AudioBufferSourceNode[]>([]);

    const audioOffset = 0;

    const resetAudioCtx = () => {
        //audioCtx.close();  // We probably should be closing these, but it crashes :(
        audioCtx.suspend();
        console.log("Resetting AudioContext");
        setAudioCtx(createAudioCtx());
    };

    const initMesh = useCallback(() => {
        const m = new Mesh();

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
                console.log(`Mesh: ${peer.userId} connected via WebRTC :)`);
            }
        });

        m.on("channelOpen", (_, channel: RTCDataChannel) => {
            console.log(`connected with ${channel.label} and ready to send data!`);
            m.send("data", `Hello World`);
        });

        m.on("channelData", async (peer, channel, data) => {
            console.log(`[AUDIO] Received ${data} from channel ${channel.label}`);
            if (channel.label === "audio") {
                // data = await data.arrayBuffer();  // Firefox seems to read data as a blob
                if (data instanceof Blob) data = await data.arrayBuffer();
                console.log(data);
                const decodedRecord: DecodedRecord = await decodeReceivedData(data);
                addToPlaylist(decodedRecord, peer.userId!);
            } else if (channel.label === "control") {
                if (data === "play") {play()}
                else if (data === "pause") {pause()}
                else if (data === "deleteBackingTrack") {deleteBackingTrack(false)}
                else if (data.substring(0,17) === "changeLoopLength:") {
                    let newLoopLength = data.substring(17);
                    console.log("Changing loop length to", newLoopLength)
                    changeLoopLength(parseFloat(newLoopLength), false)
                }
            }
        });

        setMesh(m);
        return () => {
            props.signal.removeAllListeners("signal");
            m.close();
        };
    }, [props.signal]);

    const sendToPeers = useCallback((record: RecordType, isBackingTrack = false) => {
        console.log("Sending data to mesh with offset ", record.startOffset);

        if (mesh !== undefined) {
            const floatArray: Float64Array = new Float64Array([record.startOffset]);
            const audioArray: ArrayBuffer = record.buffer;

            // Use uint8 because audio data comes in whole bytes
            const combinedArray = new Uint8Array(floatArray.byteLength + audioArray.byteLength + 1);
            combinedArray.set(new Uint8Array(floatArray.buffer));
            combinedArray.set([isBackingTrack ? 1 : 0], floatArray.byteLength);
            combinedArray.set(new Uint8Array(audioArray), floatArray.byteLength + 1);
            console.log("Sending audio");

            mesh.send("audio", combinedArray.buffer);
        } else {
            console.log("Error: Mesh uninitialised");
        }

    }, [mesh]);

    const decodeReceivedData = async (data: Uint8Array) => {
        const dataView = new DataView(data);

        const startOffset: number = dataView.getFloat64(0, true);
        const isBackingTrack = !!dataView.getInt8(8);
        const audioArrayBuffer = data.slice(9);  // startOffset (float64) takes up first 8 bytes, isBackingTrack (int8/bool) is 1 byte
        const buffer: AudioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer);
        const decodedRecord: DecodedRecord = {
            buffer: buffer,
            startOffset: startOffset,
            isBackingTrack: isBackingTrack,
        };
        console.log("Received sound with start offset ", startOffset);
        return decodedRecord;
    };

    const deleteBackingTrack = (updateMesh = true) => {
        console.log("Deleting backing track");

        // Hacks because previousSounds.delete("backingTrack") doesn't work when called from inside initMesh
        //setPreviousSounds(prev => {prev.delete("backingTrack"); return prev});
        setSounds(prev => {prev.delete("backingTrack"); return prev});
        if (updateMesh) {
            mesh?.send("control", "deleteBackingTrack");
        }
    }

    const addToPlaylist = (decodedRecord: DecodedRecord, peerID: string) => {
        console.log("Adding sound from peer ", peerID, " to playlist (isBackingTrack = ", decodedRecord.isBackingTrack, ")");
        // Another initMesh hack
        setSounds(prev => {
            if (decodedRecord.isBackingTrack) {
                prev.set("backingTrack", [decodedRecord]);
            } else {
                if (!(peerID in prev)) {
                    prev.set(peerID, []);
                }
                prev.get(peerID)!.push(decodedRecord);
            }
            return prev
        });
    };

    const play = () => {
        checkLoopLength();
        setAudioCtx(prev => {
            prev.resume();
            //onSectionStart();  // Still doesn't work?
            return prev;
        });  // Does the same thing as audioCtx.resume() but always gets called on the actual audioCtx
        setPaused(false);
        //onSectionStart();
    };

    const pause = () => {
        console.log("Pausing");
        console.log("Clearing all except backing track in", sounds)
        setSounds(prev => {prev.forEach(
            (soundList, peerID) => {
                if (peerID !== "backingTrack") {
                    prev.delete(peerID)
                }
            });
            console.log("Removed sounds in", prev);
            return prev
        })
        barCount.current = 0;

        // Stop all currently playing audio
        // Hack because acting directly on audioSources doesn't work when called from inside initMesh
        setAudioSources(prev => {
            for (let i = 0; i < prev.length; i++) {
                prev[i].stop();
            }
            return []
        });

        resetAudioCtx();
        setPaused(true);
    };

    const togglePaused = () => {
        if (paused) {
            play();
            mesh?.send("control", "play");
        } else {
            pause();
            mesh?.send("control", "pause");
        }
    };

    const getPausedStatus = () => {
        return paused ? "Start" : "Stop";
    };

    const changeLoopLength = (length: number, updateMesh = true) => {
        newLoopLength.current = length;
        if (updateMesh) {
            mesh?.send("control", "changeLoopLength:".concat(length.toString()))
        }
    };

    const checkLoopLength = () => {
        if (newLoopLength.current !== loopLength) {
            console.log("Detect loop length change");
            setLoopLength(newLoopLength.current);
        }
    };

    const playSound = (record: DecodedRecord, volume = 1) => {
        const sourceNode = audioCtx.createBufferSource();
        const gainNode = audioCtx.createGain();
        sourceNode.buffer = record.buffer;
        sourceNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        gainNode.gain.value = volume;
        console.log("Scheduled to play: ", loopLength * barCount.current);
        sourceNode.start(loopLength * barCount.current + audioOffset, record.startOffset, loopLength);
        audioSources.push(sourceNode);
    };

    const onSectionStart = () => {
        // Find and play the correct tracks from other peers
        console.log("Playing sounds:", sounds, previousSounds);
        sounds.forEach((soundList, peerID) => {
            if (soundList !== undefined) {
                let sound;
                if (soundList.length) {
                    sound = soundList.shift();  // Returns and removes the first item in the list
                }/* else {
                    sound = previousSounds.get(peerID);
                }*/
                if (sound !== undefined) {
                    // Keep the previous sound around so that we can still play it next iteration if needed
                    //previousSounds.set(peerID, sound);

                    playSound(sound);
                    if (peerID == "backingTrack") {
                        // Keep the backing track so it repeats
                        soundList.push(sound)
                    }
                }
            }
        });
        barCount.current += 1;
    };

    const update = () => {
        setTime(Math.max(audioCtx.currentTime - audioOffset, 0));
    };

    /* Canvas resizing code */
    const handleResize = () => {
        const w = document.getElementById("canvas")?.clientWidth || 1;
        const h = document.getElementById("canvas")?.clientHeight || 1;
        setCanvasWidth(w);
        setCanvasHeight(h);
    };

    useEffect(() => {
        let i1: any;
        console.log("Setting update intervals: audioCtx.state ==", audioCtx.state)
        if (!paused) {
            onSectionStart();
            i1 = setInterval(onSectionStart, loopLength * 1000);
        }
        const i2 = setInterval(update, 50);
        handleResize();
        return () => {
            clearInterval(i1);
            clearInterval(i2);
        };
    }, [paused]);

    useEffect(() => {
        handleResize();
        console.log('Creating mesh');

        const cleanup = initMesh();
    }, []);

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
                    loopLength={loopLength} isRecording={isRecording} isPaused={paused} duration={duration}
                    timeSignature={timeSignature}/>
            <div id={"controls"}>
                <div id={"audio"}>
                    <Recorder
                        audioCtx={audioCtx}
                        audioOffset={audioOffset}
                        paused={paused}
                        addToPlaylist={addToPlaylist}
                        sendToPeers={sendToPeers}
                        loopLength={loopLength}
                        changeLoopLength={changeLoopLength}
                        deleteBackingTrack={deleteBackingTrack}

                        setTimeSignature={setTimeSignature}
                        setDuration={setDuration}
                        setIsRecording={setIsRecording}
                    />
                    <div style={{paddingTop: "8px"}}>
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
};


export default Audio;
