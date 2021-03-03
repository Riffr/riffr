import { BaseSyntheticEvent, useState, useRef } from 'react';
import { DecodedRecord } from './Audio';

interface AudioUploadProps {
    audioCtx: AudioContext,
    permission: boolean,
    loopLength: number,
    changeLoop(length: number): void
}

const AudioUpload = (props: AudioUploadProps) => {
    const [trackBuffer, setTrackBuffer] = useState<DecodedRecord>();
    const [isFilePicked, setIsFilePicked] = useState(false);

    let sourceNode = useRef(props.audioCtx.createBufferSource());
    let gainNode = useRef(props.audioCtx.createGain());

    const onLoadFileSuccess = (buffer: AudioBuffer) => {
        // TODO: Limitation on audio length (>= 4sec)
        const decodedRecord: DecodedRecord = {
            buffer: buffer,
            startOffset: 0,
            endOffset: 0
        }
        if (isFilePicked) {
            removeFile();
        }

        setIsFilePicked(true);
        setTrackBuffer(decodedRecord);

        // TODO: Set loop length to audio duration (at the beginning of next loop);
        props.changeLoop(buffer.duration);

        // TODO: Play track at the beginning of next loop
        playTrack(decodedRecord, 1, 0);
    }

    const removeFile = () => {
        if (isFilePicked) {
            sourceNode.current.stop();
            sourceNode.current.disconnect();
            gainNode.current.disconnect();
            setIsFilePicked(false);
        }
    }

    const playTrack = (decodedRecord: DecodedRecord, volume: number, startTime: number) => {
        sourceNode.current = props.audioCtx.createBufferSource();
        gainNode.current = props.audioCtx.createGain();
        sourceNode.current.buffer = decodedRecord.buffer;
        sourceNode.current.connect(gainNode.current);
        gainNode.current.connect(props.audioCtx.destination);
        gainNode.current.gain.value = volume;
        sourceNode.current.loop = true;
        sourceNode.current.start(startTime);
    }

    const changeHandler = (event: BaseSyntheticEvent) => {
        if (event.target.files) {
            let file = event.target.files[0];
            let reader = new FileReader();
            reader.onload = (event: any) => {
                props.audioCtx.decodeAudioData(event.target.result).then(onLoadFileSuccess);
            }
            if (file !== undefined) {
                reader.readAsArrayBuffer(file);
            }
        }
    };

    return (
        <div>
            <input type="file" id="audio-file" accept=".mp3" disabled={!props.permission} onChange={changeHandler} />
            <button disabled={!props.permission} onClick={removeFile}>Remove Audio</button>
        </div>
    )
}

export default AudioUpload;