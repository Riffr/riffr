import {useEffect, useRef} from 'react';

export interface ClipProps {
    audioCtx: AudioContext;
    blob: Blob;
    mute: boolean;
    loopLength: number;
    recordStart: number;
    recordEnd: number;
}

const Clip = (props: ClipProps) => {
    let audioBuffer: AudioBuffer;
    let loopNumber: number = Math.floor(props.audioCtx.currentTime / props.loopLength);
    let nextLoop = useRef(loopNumber * props.loopLength);

    const onBufferSuccess = (buffer: AudioBuffer) => {
        audioBuffer = buffer;
        //Might be slightly out of time
        getNextLoop();
    }

    const getNextLoop = () => {
        console.log(nextLoop);
        playSound(nextLoop.current);
        nextLoop.current = nextLoop.current + props.loopLength;
    }

    const playSound = (startTime: number) => {
        let sourceNode = props.audioCtx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(props.audioCtx.destination);

        sourceNode.start(startTime);
    }

    useEffect(() => {
        const interval = setInterval(() => getNextLoop(), props.loopLength*1000);
        return () => clearInterval(interval);
    });

    props.blob.arrayBuffer().then(arrayBuffer => {
        props.audioCtx.decodeAudioData(arrayBuffer).then(onBufferSuccess);
    })

    return (
        <div></div>
    )
}
export default Clip;