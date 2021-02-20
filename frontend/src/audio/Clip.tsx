import { useEffect, useRef } from 'react';

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
    let playStart: number = props.loopLength - (props.recordEnd - props.recordStart);
    let nextLoop = useRef(playStart + props.audioCtx.currentTime);

    const onBufferSuccess = (buffer: AudioBuffer) => {
        audioBuffer = buffer;
    }

    const getNextLoop = () => {
        if (nextLoop.current < props.audioCtx.currentTime + 0.1) {
            console.log(nextLoop);
            nextLoop.current = nextLoop.current + props.loopLength;
            playSound(nextLoop.current);
        }
    }

    const playSound = (startTime: number) => {
        let sourceNode = props.audioCtx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(props.audioCtx.destination);

        sourceNode.start(startTime);
    }

    useEffect(() => {
        const interval = setInterval(() => getNextLoop(), 1000);
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