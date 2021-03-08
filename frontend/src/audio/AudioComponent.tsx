import { useState } from 'react';
import Audio from './Audio';
import { SignallingChannel } from "../connections/SignallingChannel";


/*
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
*/