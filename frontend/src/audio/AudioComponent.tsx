import { useState } from 'react';
import Audio from './Audio';
import { SignallingChannel } from "../connections/SignallingChannel";

let AudioContext: any = window.AudioContext // Default
    || (window as any).webkitAudioContext // Safari

const createAudioCtx = () => {
    let ctx: AudioContext = new AudioContext();
    ctx.suspend();
    return ctx;
}


const AudioComponent = (props: { signal: SignallingChannel }) => {
    const [audioCtx, setAudioCtx] = useState<AudioContext>(createAudioCtx());

    const resetAudioCtx = () => {
        audioCtx.close();
        setAudioCtx(createAudioCtx());
    }

    return (
        <Audio signal={props.signal} audioCtx={audioCtx} resetAudioCtx={resetAudioCtx} />
    );
}


export default AudioComponent;
