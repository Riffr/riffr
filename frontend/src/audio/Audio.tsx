import React, {useCallback, useEffect, useRef, useState} from 'react';
import Recorder, {RecordType} from './Recorder';
import Clip from './Clip';
import { Peer, SignalPayload } from "../connections/Peer";
import { SignallingChannel } from '../connections/SignallingChannel';


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

const Audio = (props: {signal: SignallingChannel, initiator: boolean}) => {

    let AudioContext: any = window.AudioContext // Default
        || (window as any).webkitAudioContext // Safari
    let audioContext: AudioContext = new AudioContext();
    
   


    const [loopLength, setLoopLength] = useState<number>(8);
    const [mediaRecorder, setMediaRecorder] = useState<any>(null);
    const [sounds, setSounds] = useState<AudioBuffer[]>([]);
    const [permission, setPermission] = useState(false);
    const [peer, setPeer] = useState<Peer | undefined>(undefined);
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
        let p = new Peer({ initiator: props.initiator });
    
        p.on("error", (e) => {
            console.log(`Error: ${ JSON.stringify(e) }`);
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
                console.log(`connected with ${ channel.label } and ready to send data!`);
                p.send("data", `Hello World`);
            });
        }
    
        p.addDataChannel("audio");
        p.on("channelData", (_, channel, data) => {
            console.log(`[AUDIO] Recieved ${ data } from channel ${ channel.label }`);
            if (channel.label == "audio"){
                console.log(data);
                addToPlaylist({blob: new Blob([data]), start: 0, end: 0} as RecordType);
                //todo: Take blob, run addToPlayList on it, done!
            }
        });

        setPeer(p);
        return () => props.signal.clearMessageHandlers();
    }, [props.initiator, props.signal]);


    const onRecorderSuccess = (mediaStream: MediaStream) => {
        setMediaRecorder(new MediaRecorder(mediaStream));
        setPermission(true);
    }

    const addOwnSound = useCallback(async (record: RecordType) => {
        console.log("[addOwnSound] sending to peer")
        // WTF CHROME DOESN'T SUPPORT BLOBS. NOT IMPLEMENTED ERROR!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        if (peer != undefined) {
            const buf = await record.blob.arrayBuffer();
            peer.send("audio", buf);
        }

        addToPlaylist(record);
    }, [peer]);

    const addToPlaylist = (record: RecordType) => {
        console.log("Received sound")

        record.blob.arrayBuffer().then(buffer => audioContext.decodeAudioData(buffer).then(buffer => {
            setSounds(prev => [...prev, buffer]);
            //Timing will be a bit off, but will resolve after 1 bar
            playSound(buffer, 0)
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


    const runBar = () => {
        //Bit ugly but lets us read state easily
        setSounds(sounds => {
            sounds.forEach(sound => {
                playSound(sound, loopLength * barCount.current);
            });
            return sounds;
        });

        barCount.current = barCount.current + 1;
    }

    useEffect(() => {

        let i1 = setInterval(runBar, loopLength * 1000);

        return () => {
            clearInterval(i1);
        }
    }, [])

    return (
        <div id={"audio"}>
            <Recorder
                recorder={mediaRecorder}
                audioCtx={audioContext}
                addToPlaylist={addOwnSound}
                loopLength={loopLength}
                permission={permission}
            />
            <button className={"squircle-button light-blue"} disabled={permission} onClick={init}>Grant permission</button>
            <button className={"squircle-button light-blue"} onClick={initPeer}>Init Peer</button>
            <button className={"squircle-button light-blue"} onClick={() => {if (peer != undefined) peer.send("data", "test")}}>Send Dummy Audio</button>
        </div>
    );
}


export default Audio;
