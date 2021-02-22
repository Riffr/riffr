import {useEffect, useRef, useState} from 'react';

type BlobEvent = { data: Blob; }

export interface RecordType {
    blob: Blob;
    start: number;
    end: number;
}

interface RecorderProps {
    recorder: any;
    audioCtx: AudioContext;
    addToPlaylist(record: RecordType): void;
    loopLength: number;
    permission: boolean;
}

//Todo: Not really synced with the audio player, might have to move logic here into audio as well
const Recorder = (props: RecorderProps) => {
    let chunks: BlobPart[] = [];
    const startTime = useRef(0);
    const stopTime = useRef(0);
    const [recordNext, setRecordNext] = useState(false);
    const [recording, setRecording] = useState(false);
    const [timer, setTimer] = useState(0);

    const runBar = () => {
        console.log("Running bar")
        setTimer(0);
        setRecordNext(prev => {
            if (prev){
                startRecording();
                console.log("We're recording!")
                setRecording(true);
                return false;
            }
            return false;
        })

    }

    const startRecording = () => {
        if (props.audioCtx.state === 'suspended') {
            console.log("Audio context permission required");
        }
        if (props.recorder !== null && props.recorder.state !== 'recording') {
            console.log("Start recording...");
            setTimeout(stopRecording, props.loopLength * 1000);
            startTime.current = props.audioCtx.currentTime;
            props.recorder.start();
        }
    }

    const stopRecording = () => {
        if (props.recorder !== null && props.recorder.state !== 'inactive') {
            console.log("Stop recording");
            setRecording(false);
            props.recorder.stop();
            stopTime.current = props.audioCtx.currentTime;
        }
    }

    const saveRecording = () => {
        console.log(props.loopLength)
        console.log(startTime.current)
        const clip: RecordType = {
            blob: new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' }),
            start: startTime.current % props.loopLength,
            end: stopTime.current % props.loopLength
        };
        console.log(clip);
        props.addToPlaylist(clip);
        chunks = [];
    }


    if (props.recorder !== null) {
        props.recorder.onstop = saveRecording;

        props.recorder.ondataavailable = (evt: BlobEvent) => {
            console.log("Saving")
            chunks.push(evt.data);
        }
    }

    useEffect(() => {
        let i1 = setInterval(runBar, props.loopLength * 1000);

        return () => {clearInterval(i1);}
    }, [props])



    return (
        <div>
            <button className={"squircle-button light-blue"} disabled={!props.permission || recordNext} onClick={() => setRecordNext(true)}>Jam in</button>
        </div>
    );
}


export default Recorder;
