import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import Audio from './Audio';
import { SignallingChannel } from "../connections/SignallingChannel";

let AudioContext: any = window.AudioContext // Default
    || (window as any).webkitAudioContext // Safari

const AudioComponent = (props: { signal: SignallingChannel }) => {
    const [audioCtx, setAudioCtx] = useState<AudioContext>(new AudioContext());

    const resetAudioCtx = () => {
        setAudioCtx(new AudioContext());
    }

    return (
        <Audio signal={props.signal} audioCtx={audioCtx} resetAudioCtx={resetAudioCtx} />
    );
}


export default AudioComponent;
