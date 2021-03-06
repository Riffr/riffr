import { BaseSyntheticEvent, useState, useRef } from 'react';
import { DecodedRecord } from './Audio';
import { RecordType } from "./Recorder";

interface AudioUploadProps {
    audioCtx: AudioContext;
    permission: boolean;
    loopLength: number;
    changeLoop(length: number): void;
    addToPlaylist(record: DecodedRecord, peerID: string): void;
    sendToPeers(record: RecordType, isBackingTrack: boolean): void
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

    const onLoadFileSuccess = async (arrayBuffer: ArrayBuffer) => {
        // Convert AudioBuffer into ArrayBuffer that can be sent to other peers
        console.log("Loaded audio file of size ", arrayBuffer.byteLength)

        const clip: RecordType = {
            buffer: arrayBuffer,
            startOffset: 0,
        }
        props.sendToPeers(clip, true);

        // Add uploaded audio to local playlist
        let audioBuffer: AudioBuffer = await props.audioCtx.decodeAudioData(arrayBuffer)

        const decodedRecord: DecodedRecord = {
            buffer: audioBuffer,
            startOffset: 0,
            isBackingTrack: true,
        }
        props.addToPlaylist(decodedRecord, "backingTrack")

        setIsFilePicked(true);
        setTrackBuffer(decodedRecord);

        // TODO uncomment later
        //props.changeLoop(audioBuffer.duration);
    }

    const removeFile = () => {
        if (isFilePicked) {
            // TODO Send blank file
            setIsFilePicked(false);
        }
    }

    const changeHandler = (event: BaseSyntheticEvent) => {
        if (event.target.files) {
            let file: File = event.target.files[0];
            if (file !== undefined) {
                let filename = file.name;
                let reader = new FileReader();
                reader.onload = (event: any) => {
                    if (fileCheck(filename)) {
                        onLoadFileSuccess(event.target.result);
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