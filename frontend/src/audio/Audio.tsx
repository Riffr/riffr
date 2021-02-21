import React, {useEffect, useRef, useState} from 'react';
import Recorder, {RecordType} from './Recorder';
import Clip from './Clip';
import {Peer} from "../connections/Peer";

declare var MediaRecorder: any;

const Audio = (props: {peer: Peer | undefined}) => {
    let audioContext: AudioContext = new window.AudioContext();
    const [loopLength, setLoopLength] = useState<number>(8);
    const [mediaRecorder, setMediaRecorder] = useState<any>(null);
    const [sounds, setSounds] = useState<AudioBuffer[]>([]);
    const [permission, setPermission] = useState(false);
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

    const onRecorderSuccess = (mediaStream: MediaStream) => {
        setMediaRecorder(new MediaRecorder(mediaStream));
        setPermission(true);
    }

    const addOwnSound = (record: RecordType) => {
        if (props.peer!=undefined)
            props.peer.send("data", record.blob)

        addToPlaylist(record);
    }

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

    //Todo: Might wanna handle this another way
    useEffect(() => {
        if (props.peer!= undefined)
            props.peer.on("channelData", (_, channel, data) => {
            console.log(`Recieved ${ data } from channel ${ channel.label }`);
            if (channel.label=="data"){
                console.log(data);
                //todo: Take blob, run addToPlayList on it, done!
            }
        })
    }, [props.peer])

    useEffect(() => {

        let i1 = setInterval(runBar, loopLength * 1000);

        return () => {
            clearInterval(i1);
        }
    }, [])

    return (
        <div>
            <Recorder
                recorder={mediaRecorder}
                audioCtx={audioContext}
                addToPlaylist={addOwnSound}
                loopLength={loopLength}
                permission={permission}
            />
            <button disabled={permission} onClick={init}>Grant permission</button>
        </div>
    );
}


export default Audio;
