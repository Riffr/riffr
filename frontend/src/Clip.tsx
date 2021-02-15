import React from 'react';

interface ClipProps {
    audioCtx: AudioContext;
    blob: Blob;
    play: boolean;
    recordStart?: number;
    recordEnd?: number;
    playStart?: number;
}

const Clip = (props: ClipProps) => {
    props.blob.arrayBuffer().then(arrayBuffer => {
        let sourceNode = props.audioCtx.createBufferSource();
        props.audioCtx.decodeAudioData(arrayBuffer).then(audioBuffer => {
            sourceNode.buffer = audioBuffer;
            sourceNode.connect(props.audioCtx.destination);
            if (props.play === true) {
                //TODO: play at playStart time
                sourceNode.start();
            }
        });
    })

    return (
        <div></div>
    )
}
export default Clip;