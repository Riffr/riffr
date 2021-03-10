import { BaseSyntheticEvent, useState, useRef } from 'react';
import { DecodedRecord } from './Audio';
import { RecordType } from "./Recorder";

interface AudioUploadProps {
    audioCtx: AudioContext;
    paused: boolean;
    permission: boolean;
    loopLength: number;
    changeLoopLength(length: number): void;
    addToPlaylist(record: DecodedRecord, peerID: string): void;
    sendToPeers(record: RecordType, isBackingTrack: boolean): void
}

const AudioUploader = (props: AudioUploadProps) => {
    const [trackBuffer, setTrackBuffer] = useState<DecodedRecord>();
    const [isFilePicked, setIsFilePicked] = useState(false);
    const [fileName, setFileName] = useState("");
    const sourceNode = useRef<AudioBufferSourceNode>(props.audioCtx.createBufferSource());
    const gainNode = useRef<GainNode>(props.audioCtx.createGain());

    const onLoadFileSuccess = async (arrayBuffer: ArrayBuffer, fileName: string) => {
        // Convert AudioBuffer into ArrayBuffer that can be sent to other peers
        console.log("Loaded audio file of size ", arrayBuffer.byteLength);

        const clip: RecordType = {
            buffer: arrayBuffer,
            startOffset: 0,
        };
        props.sendToPeers(clip, true);

        // Add uploaded audio to local playlist
        const audioBuffer: AudioBuffer = await props.audioCtx.decodeAudioData(arrayBuffer);

        const decodedRecord: DecodedRecord = {
            buffer: audioBuffer,
            startOffset: 0,
            isBackingTrack: true,
        };
        props.changeLoopLength(audioBuffer.duration);
        props.addToPlaylist(decodedRecord, "backingTrack");

        setFileName(fileName);
        setIsFilePicked(true);
        setTrackBuffer(decodedRecord);
    };

    const removeFile = () => {
        if (isFilePicked) {
            // TODO Send blank file
            setIsFilePicked(false);
        }
    };

    const changeHandler = (event: BaseSyntheticEvent) => {
        if (event.target.files) {
            const file: File = event.target.files[0];
            if (file !== undefined) {
                const reader = new FileReader();
                reader.onload = (event: any) => {
                    onLoadFileSuccess(event.target.result, file.name);
                };
                reader.readAsArrayBuffer(file);
            }
        }
    };

    return (
        <div style={{display: "flex"}}>
            <label htmlFor={"audio-file"} id={"fake-upload"} className={"squircle-button light-blue button"+(props.paused ? "" : " disabled")} title={"Upload backing track"}>Upload: {fileName}</label>
            <input id="audio-file" type="file" style={{display:"none"}} accept=".mp3,.wav,.m4a" disabled={!props.paused} onChange={changeHandler}></input>
            <button disabled={!props.paused} onClick={removeFile} className={"squircle-button"} style={{padding: 0, width: "27px", marginLeft:"-27px", zIndex: 1, backgroundColor: "white"}}><i className={"fa fa-times block"} /></button>
        </div>
    );
};

export default AudioUploader;