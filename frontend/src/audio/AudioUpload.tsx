import { BaseSyntheticEvent, useState, useRef } from 'react';
import { DecodedRecord } from './Audio';

interface AudioUploadProps {
    audioCtx: AudioContext;
    permission: boolean;
    loopLength: number;
    changeLoop(length: number): void
}

const AudioUpload = (props: AudioUploadProps) => {
    const [trackBuffer, setTrackBuffer] = useState<DecodedRecord>();
    const [isFilePicked, setIsFilePicked] = useState(false);
    let sourceNode = useRef<AudioBufferSourceNode>(props.audioCtx.createBufferSource());
    let gainNode = useRef<GainNode>(props.audioCtx.createGain());

    const fileCheck = (filename: string) => {
        let extension = filename.substring(filename.lastIndexOf('.'), filename.length) || filename;
        return extension === ".mp3" || extension === ".wav";
    }

    const onLoadFileSuccess = (buffer: AudioBuffer) => {
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
            let file: File = event.target.files[0];
            if (file !== undefined) {
                let filename = file.name;
                let reader = new FileReader();
                reader.onload = (event: any) => {
                    if (fileCheck(filename)) {
                        props.audioCtx.decodeAudioData(event.target.result)
                            .then(onLoadFileSuccess);
                    } else {
                        removeFile();
                    }
                }
                reader.readAsArrayBuffer(file);
            }
        }
    };

    return (
        <div>
            <input type="file" id="audio-file" accept=".mp3,.wav" disabled={!props.permission} onChange={changeHandler} />
            <button disabled={!props.permission} onClick={removeFile}>Remove Audio</button>
        </div>
    )
}

export default AudioUpload;