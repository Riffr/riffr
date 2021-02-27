import React, {useCallback, useEffect, useRef, useState} from 'react';
import Recorder, {RecordType} from './Recorder';
import Clip from './Clip';
import Canvas from "../Canvas";
import {Peer, SignalPayload} from "../connections/Peer";
import {SignallingChannel} from '../connections/SignallingChannel';


// TODO. IMPORT TYPES, DONT DUPE THEM
type MessagePayload = ChatPayload | SignallingPayload;

interface ChatPayload {
    type: "chat",
    payload: any
}

interface SignallingPayload {
    type: "signal",
    payload: SignalPayload,
}

declare var MediaRecorder: any;

const Audio = (props: { signal: SignallingChannel, initiator: boolean }) => {
    let AudioContext: any = window.AudioContext // Default
        || (window as any).webkitAudioContext // Safari
    let audioContext: AudioContext = new AudioContext();
    const [loopLength, setLoopLength] = useState<number>(8);
    const [mediaRecorder, setMediaRecorder] = useState<any>(null);
    const [sounds, setSounds] = useState<Map<string, AudioBuffer[]>>(new Map());  // string : AudioBuffer
    const [permission, setPermission] = useState(false);
    const [peer, setPeer] = useState<Peer | undefined>(undefined);
    const [time, setTime] = useState(0);
    let barCount = useRef(1);

    const init = () => {
        navigator.mediaDevices.getUserMedia({audio: true, video: false})
            .then(onRecorderSuccess)
            .catch((err) => {
                console.log('The following error occured: ' + err);
            });
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    const initPeer = useCallback(() => {
        let p = new Peer({initiator: props.initiator});

        p.on("error", (e) => {
            console.log(`Error: ${JSON.stringify(e)}`);
        });

        p.on("signal", (_, payload: SignalPayload) => {
            props.signal.sendMessage({
                type: "signal",
                payload
            });
        })

        props.signal.addMessageHandler((payload: MessagePayload) => {
            switch (payload.type) {
                case "signal":
                    console.log("[onSignal] Signalling payload received")
                    p.dispatch(payload.payload);
                    break;
                default:
                    break;
            }
        });


        if (props.initiator) {
            p.on("connection", (_, state: RTCIceConnectionState) => {
                if (state == "connected") {
                    console.log("Connected via WebRTC :)");
                }
            });

            p.on("channelOpen", (_, channel) => {
                console.log(`connected with ${channel.label} and ready to send data!`);
                p.send("data", `Hello World`);
            });
        }

        p.addDataChannel("audio");
        p.on("channelData", (_, channel, data) => {
            console.log(`[AUDIO] Recieved ${data} from channel ${channel.label}`);
            if (channel.label == "audio") {
                // TODO confirm that p.id is the actual sender ID
                addToPlaylist({blob: new Blob([data]), start: 0, end: 0} as RecordType, p.id);
            }
        });

        setPeer(p);
        return () => props.signal.clearMessageHandlers();
    }, [props.initiator, props.signal]);


    const onRecorderSuccess = (mediaStream: MediaStream) => {
        setMediaRecorder(new MediaRecorder(mediaStream));
        setPermission(true);
    }

    const sendToPeers = useCallback(async (record: RecordType) => {
        console.log("[addOwnSound] sending to peer")
        // WTF CHROME DOESN'T SUPPORT BLOBS. NOT IMPLEMENTED ERROR!!!!!!!!!!!!!!!!!!!!!!!!!!!!


        record.blob.arrayBuffer().then(buffer => audioContext.decodeAudioData(buffer).then(buffer => {
            sounds.set("self", [])
            sounds.get("self")!.push(buffer)
        }));
        if (peer != undefined) {
            const buf = await record.blob.arrayBuffer();
            peer.send("audio", buf);
            console.log("Sending audio")
        }
    }, [peer]);

    const addToPlaylist = (record: RecordType, peerID: string) => {
        console.log("Received sound from ", peerID)

        record.blob.arrayBuffer().then(buffer => audioContext.decodeAudioData(buffer).then(buffer => {
            if (!(peerID in sounds)) {
                sounds.set(peerID, [])
            }
            sounds.get(peerID)!.push(buffer)
        }));
    }

    const changeLoopLength = (length: number) => {
        setLoopLength(length);
    }

    const playSound = (sound: AudioBuffer, time: number) => {
        let sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = sound;
        sourceNode.connect(audioContext.destination);
        sourceNode.start(time);
    }

    const onHalfSectionStart = () => {
        // Bit ugly but lets us read state easily

        // Find and play the correct tracks from other peers
        console.log(sounds)
        sounds.forEach((soundList) => {
            if (soundList != undefined) {
                let sound = soundList.pop()
                console.log(sound)
                if (sound != undefined) {
                    playSound(sound, 0);
                }
            }
        });
    }

    const update = () => {
        setTime(audioContext.currentTime);
    }
    useEffect(() => {

        let i1 = setInterval(onHalfSectionStart, loopLength * 1000 / 2);
        let i2 = setInterval(update, 100);

        return () => {
            clearInterval(i1);
            clearInterval(i2);
        }
    }, [])

    //Todo: Turn recorder into inner class, make recording dependent on the update function,
    //Todo: ...add buffer depending on audiocontext, and trim audio dependent on this
    return (
        <div style={{position: "relative"}}>
            <Canvas id={"canvas"} width={1600} height={800} time={time} loopLength={loopLength}/>
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
                    <button className={"squircle-button light-blue"} onClick={initPeer}>Init Peer</button>
                    <button className={"squircle-button light-blue"} onClick={() => {
                        peer?.send("data", "test")
                    }}>Send Dummy Audio
                    </button>
                </div>

            </div>
        </div>
    );
}


export default Audio;
