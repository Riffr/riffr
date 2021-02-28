import React, {useCallback, useEffect, useRef, useState} from 'react';
import Recorder, {RecordType} from './Recorder';
import Clip from './Clip';

// import { SignalPayload } from "@riffr/backend/modules/Mesh";
import { Mesh } from "../connections/Mesh";
import { SignallingChannel } from "../connections/SignallingChannel";
import Canvas from "../Canvas";

declare var MediaRecorder: any;

const Audio = (props: {signal: SignallingChannel}) => {

    let AudioContext: any = window.AudioContext // Default
        || (window as any).webkitAudioContext // Safari
    let audioContext: AudioContext = new AudioContext();

    const [loopLength, setLoopLength] = useState<number>(8);
    const [mediaRecorder, setMediaRecorder] = useState<any>(null);
    const [sounds, setSounds] = useState<AudioBuffer[]>([]);
    const [permission, setPermission] = useState(false);
    const [time, setTime] = useState(0);
    const [mesh, setMesh] = useState<Mesh | undefined>(undefined);
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
        // let m = new Mesh();
        // console.log(`Initializing mesh with id: ${ m.id }`);

        // m.on("error", (_, e: Error) => {
        //     console.log(`Error: ${ JSON.stringify(e) }`);
        // });

        // m.on("signal", (_, payload: SignalPayload) => {
        //     signal.send(payload);
        // });

        // signal.on("signal", (payload: MeshPayload) => {
        //     m.dispatch(payload);
        // });
        
        // m.on("connection", (peer: MeshedPeer, state: RTCIceConnectionState) => {
        //     if (state == "connected") {
        //         console.log(`Mesh: ${ peer.mesh } connected via WebRTC :)`);
        //     }
        // });
    
        // m.on("channelOpen", (_, channel: RTCDataChannel) => {
        //     console.log(`connected with ${ channel.label } and ready to send data!`);
        //     m.send("data", `Hello World from ${ m.id }`);
        // });

    
        // m.addDataChannel("audio");
        // m.on("channelData", (_, channel, data) => {
        //     console.log(`[AUDIO] Recieved ${ data } from channel ${ channel.label }`);
        //     if (channel.label == "audio"){
        //         console.log(data);
        //         addToPlaylist({blob: new Blob([data]), start: 0, end: 0} as RecordType);
        //         //todo: Take blob, run addToPlayList on it, done!
        //     }
        // });

        // setMesh(m);
        // return () => props.signal.clearMessageHandlers();
    }, [props.signal]);


    const onRecorderSuccess = (mediaStream: MediaStream) => {
        setMediaRecorder(new MediaRecorder(mediaStream));
        setPermission(true);
    }

    const addOwnSound = useCallback(async (record: RecordType) => {
        console.log("[addOwnSound] sending to peer")
        // WTF CHROME DOESN'T SUPPORT BLOBS. NOT IMPLEMENTED ERROR!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        if (mesh != undefined) {
            const buf = await record.blob.arrayBuffer();
            mesh.send("audio", buf);
        }

        addToPlaylist(record);
    }, [mesh]);

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

    const update = () => {
        setTime(audioContext.currentTime);
    }

    useEffect(() => {

        let i1 = setInterval(runBar, loopLength * 1000);
        let i2 = setInterval(update, 20);

        return () => {
            clearInterval(i1);
            clearInterval(i2);
        }
    }, [])

    return (
        <div style={{position: "relative"}}>
            <Canvas id={"canvas"} width={1600} height={800} time={time} loopLength={loopLength}/>
            <div id={"controls"}>
                <div id={"audio"}>
                    <Recorder
                        recorder={mediaRecorder}
                        audioCtx={audioContext}
                        addToPlaylist={addOwnSound}
                        loopLength={loopLength}
                        permission={permission}
                    />
                    <button className={"squircle-button light-blue"} disabled={permission} onClick={init}>Grant
                        permission
                    </button>
                    <button className={"squircle-button light-blue"} onClick={initPeer}>Init Peer</button>
                    <button className={"squircle-button light-blue"} onClick={() => {mesh?.send("data", "test")}}>Send Dummy Audio</button>
                </div>

            </div>
        </div>
    );
}


export default Audio;
