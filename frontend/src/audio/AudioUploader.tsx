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

const AudioUploader = (props: AudioUploadProps) => {
    const [trackBuffer, setTrackBuffer] = useState<DecodedRecord>();
    const [isFilePicked, setIsFilePicked] = useState(false);
    let [fileName, setFileName] = useState("");
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
        props.changeLoop(audioBuffer.duration);
        props.addToPlaylist(decodedRecord, "backingTrack")

        setIsFilePicked(true);
        setTrackBuffer(decodedRecord);
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
                setFileName(file.name);
                let reader = new FileReader();
                reader.onload = (event: any) => {
                    if (fileCheck(fileName)) {
                        onLoadFileSuccess(event.target.result);
                    } else {
                        removeFile();
                    }
                }
                reader.readAsArrayBuffer(file);
            }
            else
            {
                setFileName("");
            }
        }
    };

    return (
        <div style={{display: "flex", maxWidth: "15vw"}}>
            <label htmlFor={"audio-file"} id={"fake-upload"} className={"squircle-button light-blue button"} title={"Upload backing track"}>Upload: {fileName}</label>
            <input id="audio-file" type="file" style={{display:"none"}} accept=".mp3,.wav" onChange={changeHandler}></input>
            <button disabled={!props.permission} onClick={removeFile} className={"squircle-button"} style={{padding: 0, width: "27px", marginLeft:"-27px", zIndex: 1}}><i className={"fa fa-times block"} /></button>
        </div>
    )
}

export default AudioUploader;