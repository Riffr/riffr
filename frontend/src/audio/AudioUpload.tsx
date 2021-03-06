import { BaseSyntheticEvent, useState, useRef } from 'react';
import { DecodedRecord } from './Audio';

interface AudioUploadProps {
    audioCtx: AudioContext | null;
    permission: boolean;
    loopLength: number;
    changeLoop(length: number): void
}

const AudioUpload = (props: AudioUploadProps) => {
    const [trackBuffer, setTrackBuffer] = useState<DecodedRecord>();
    const [isFilePicked, setIsFilePicked] = useState(false);
    let sourceNode = useRef<AudioBufferSourceNode>();
    let gainNode = useRef<GainNode>();

    if (props.audioCtx !== null) {
        sourceNode.current = props.audioCtx.createBufferSource();
        gainNode.current = props.audioCtx.createGain();
    }

    const onLoadFileSuccess = (buffer: AudioBuffer) => {
        // TODO: Limitation on audio length (>= 4sec?)
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

        props.changeLoop(buffer.duration);

        playTrack(decodedRecord, 0.2, 0);
    }

    const removeFile = () => {
        if (isFilePicked && sourceNode.current !== undefined && gainNode.current !== undefined) {
            sourceNode.current.stop();
            sourceNode.current.disconnect();
            gainNode.current.disconnect();
            setIsFilePicked(false);
        }
    }

    const playTrack = (decodedRecord: DecodedRecord, volume: number, startTime: number) => {
        if (props.audioCtx !== null) {
            sourceNode.current = props.audioCtx.createBufferSource();
            gainNode.current = props.audioCtx.createGain();
            sourceNode.current.buffer = decodedRecord.buffer;
            sourceNode.current.connect(gainNode.current);
            gainNode.current.connect(props.audioCtx.destination);
            gainNode.current.gain.value = volume;
            sourceNode.current.loop = true;
            sourceNode.current.start(startTime);
        }
    }

    const changeHandler = (event: BaseSyntheticEvent) => {
        if (event.target.files) {
            let file = event.target.files[0];
            let reader = new FileReader();
            reader.onload = (event: any) => {
                if (props.audioCtx !== null)
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