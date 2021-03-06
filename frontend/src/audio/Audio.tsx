import React, { useCallback, useEffect, useRef, useState } from 'react';
import Recorder, { RecordType } from './Recorder';
import Clip from './Clip';

// import { SignalPayload } from "@riffr/backend/modules/Mesh";
import { Mesh, MeshedPeer } from "../connections/Mesh";
import { SignallingChannel } from "../connections/SignallingChannel";
import Canvas from "../Canvas";

import { Mesh as M } from '@riffr/backend';

export interface DecodedRecord {
    buffer: AudioBuffer;
    startOffset: number;
    endOffset: number;
}

declare var MediaRecorder: any;

let AudioContext: any = window.AudioContext // Default
    || (window as any).webkitAudioContext // Safari
let audioContext: AudioContext = new AudioContext();

const Audio = (props: { signal: SignallingChannel}) => {
    const [loopLength, setLoopLength] = useState<number>(8);
    const [mediaRecorder, setMediaRecorder] = useState<any>(null);
    const [sounds, setSounds] = useState<Map<string, DecodedRecord[]>>(new Map());
    const [previousSounds, setPreviousSounds] = useState<Map<string, DecodedRecord>>(new Map());
    const [permission, setPermission] = useState(false);
    const [time, setTime] = useState(0);
    const [mesh, setMesh] = useState<Mesh | undefined>(undefined);
    let barCount = useRef(1);

    const init = () => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(onRecorderSuccess)
            .catch((err) => {
                console.log('The following error occured: ' + err);
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


        m.addDataChannel("audio");
        m.on("channelData", (peer, channel, data) => {
            console.log(`[AUDIO] Recieved ${data} from channel ${channel.label}`);
            if (channel.label == "audio") {
                console.log(data);
                addToPlaylist({ blob: new Blob([data]), startOffset: 0, endOffset: 0 } as RecordType, peer.meshId!);
                //todo: Take blob, run addToPlayList on it, done!
            }
        });

        setMesh(m);
        return () => props.signal.removeAllListeners("signal");
    }, [props.signal]);


    const onRecorderSuccess = (mediaStream: MediaStream) => {
        setMediaRecorder(new MediaRecorder(mediaStream));
        setPermission(true);
    }

    const sendToPeers = useCallback(async (record: RecordType) => {
        console.log("[addOwnSound] sending to peer")

        record.blob.arrayBuffer().then(buffer => audioContext.decodeAudioData(buffer).then((buffer: AudioBuffer) => {
            sounds.set("self", [])
            let decodedRecord: DecodedRecord = {
                buffer: buffer,
                startOffset: record.startOffset,
                endOffset: 0  // Not currently using this
            }
            sounds.get("self")!.push(decodedRecord)
        }));

        // WTF CHROME DOESN'T SUPPORT BLOBS. NOT IMPLEMENTED ERROR!!!!!!!!!!!!!!!!!!!!!!!!!!!

        if (mesh != undefined) {
            const buf = await record.blob.arrayBuffer();
            mesh.send("audio", buf);
            console.log("Sending audio")
        }

    }, [mesh]);


    const addToPlaylist = (record: RecordType, peerID: string) => {
        console.log("Received sound from ", peerID)

        record.blob.arrayBuffer().then(buffer => audioContext.decodeAudioData(buffer).then((buffer: AudioBuffer) => {
            if (!(peerID in sounds)) {
                sounds.set(peerID, [])
            }
            let decodedRecord: DecodedRecord = {
                buffer: buffer,
                startOffset: record.startOffset,
                endOffset: 0 //Not currently using this
            }
            sounds.get(peerID)!.push(decodedRecord)
        }));
    }

    const changeLoopLength = (length: number) => {
        setLoopLength(length);
    }

    let checkRecording = () => {
        console.log(audioContext.currentTime)
    }

    const playSound = (record: DecodedRecord) => {
        let sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = record.buffer;
        sourceNode.connect(audioContext.destination);
        sourceNode.start(loopLength * barCount.current, record.startOffset, loopLength);
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
        setTime(audioContext.currentTime);
    }

    useEffect(() => {

        let i1 = setInterval(onHalfSectionStart, loopLength * 1000);
        let i2 = setInterval(update, 100);

        return () => {
            clearInterval(i1);
            clearInterval(i2);
        }
    }, [])

    //Todo: Turn recorder into inner class, make recording dependent on the update function,
    //Todo: ...add buffer depending on audiocontext, and trim audio dependent on this
    return (
        <div style={{ position: "relative", gridRow: "1 /span 2", gridColumn: "2", display: 'flex', flexDirection: 'column' }}>
            <Canvas id={"canvas"} width={1600} height={800} time={time} loopLength={loopLength} />
            <div id={"controls"}>
                <div id={"audio"}>
                    <Recorder
                        recorder={mediaRecorder}
                        audioCtx={audioContext}
                        sendToPeers={sendToPeers}
                        loopLength={loopLength}
                        permission={permission}
                    />
                    <button className={"squircle-button light-blue"} disabled={permission} onClick={init}>Grant
                    permission
                    </button>
                    <button className={"squircle-button light-blue"} onClick={initMesh}>Init Mesh</button>
                    <button className={"squircle-button light-blue"} onClick={() => { mesh?.send("data", "test") }}>Send Dummy Audio</button>
                </div>
                <div id={"coordination"}>
                    <div>
                        <label htmlFor={"signature-input"}>Time Sig: </label>
                        <input id={"signature-input"} type={"number"} min={1}></input>
                        <label htmlFor={"signature-input-2"}> / </label>
                        <input id={"signature-input-2"} type={"number"} min={1}></input>
                    </div>
                    <div>
                        <label htmlFor={"tempo-input"} title={"Set tempo of loop (can be left blank)"}>Tempo: </label>
                        <input id={"tempo-input"} type={"number"} min={0} title={"Set tempo of loop (can be left blank)"}></input>
                    </div>
                    <div>
                        <label htmlFor={"duration-input"} title={"Set duration of loop"}>Duration: </label>
                        <input id={"duration-input"} type={"number"} min={0} title={"Set duration of loop"}></input>
                    </div>
                    <div>
                        <label htmlFor={"upload"} id={"fake-upload"} className={"squircle-button light-blue button"} title={"Upload backing track"}>Upload</label>
                        <input id={"upload"} type={"file"} style={{display:"none"}}></input>
                    </div>
                    <button className={"green circle-button"}><i className={"fa fa-check block"} title={"Submit changes"}></i></button>
                </div>
            </div>
        </div>
    );
}


export default Audio;
