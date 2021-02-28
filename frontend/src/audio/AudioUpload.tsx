import { BaseSyntheticEvent, useState } from 'react';
import { DecodedRecord } from './Audio';

const AudioUpload = (props: { audioCtx: AudioContext }) => {
    const [isFilePicked, setIsFilePicked] = useState(false);

    const onLoadFileSuccess = (buffer: AudioBuffer) => {
        // AudioBuffer for the uploaded track
        const record: DecodedRecord = {
            buffer: buffer,
            startOffset: 0,
            endOffset: 0
        }
        console.log(buffer);
        playTrack(record, 1);
    }

    const changeHandler = (event: BaseSyntheticEvent) => {
        if (event.target.files) {
            let file = event.target.files[0];
            let reader = new FileReader();
            reader.onload = (event: any) => {
                props.audioCtx.decodeAudioData(event.target.result).then(onLoadFileSuccess);
            }
            reader.readAsArrayBuffer(file);
        }
    };

    const playTrack = (record: DecodedRecord, volume: number) => {
        let sourceNode = props.audioCtx.createBufferSource();
        let gainNode = props.audioCtx.createGain();
        sourceNode.buffer = record.buffer;
        sourceNode.connect(gainNode);
        gainNode.connect(props.audioCtx.destination);
        gainNode.gain.value = volume;
        sourceNode.loop = true;
        sourceNode.start();
    }

    return (
        <div>
            <input type="file" id="audio-file" accept=".mp3" onChange={changeHandler} />
        </div>
    )
}

export default AudioUpload;