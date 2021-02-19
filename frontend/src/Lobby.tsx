import React, {RefObject, useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import './css/Lobby.css';
import './css/General.css'
import {SignallingChannel} from "./connections/SignallingChannel";
import {SignalPayload, Peer} from './connections/Peer';
import { Button } from './Button';


type MessagePayload = ChatPayload | SignallingPayload;

interface ChatPayload {
    type: "chat",
    payload: any
};
interface SignallingPayload {
    type: "signal",
    payload: SignalPayload,
};

var peer : Peer | undefined; 

const initPeer = (name: string, signal: SignallingChannel) => {

    let initiator = (name == "offerer");
    console.log(`[isOfferer] ${ initiator }`);
    let p = new Peer({
        id: name,
        initiator,
    });
    peer = p;
    console.log(p);

    p.on("error", (e) => {
        console.log(`Error: ${ e }`);
    });

    p.on("signal", (_, payload: SignalPayload) => {
        signal.sendMessage({
            type: "signal",
            payload
        });
    });

    if (initiator) {
        p.on("connection", (_, state: RTCIceConnectionState) => {
            if (state == "connected") {
                console.log("Connected via WebRTC :)");
            }
        });
    
        p.on("channelOpen", (_, channel) => {
            console.log(`connected with ${ channel.label } and ready to send data!`);
            p.send(channel.label, `Hello World`);
        });

    }

    p.on("channelData", (_, channel, data) => {
        console.log(`Recieved ${ data } from channel ${ channel.label }`);
    });
    

};


const onSignal = (payload: SignalPayload) => {
    if (peer === undefined) {
        console.log("Peer is undefined :("); 
        console.log("peer:");
        console.log(peer);
        return;
    }

    console.log("[onSignal] Signalling payload received")
    peer.dispatch(payload);        
};

const Lobby = (props: { name: string, roomCode: string, signal: SignallingChannel }) => {
    let [message, setMessage] = useState("");
    let [messages, setMessages] = useState([]);


    const onMessageReceived = (e: any) => {
        // I promise I'll be good later...
        // @ts-ignore
        setMessages(prev => [{message: e}, ...prev]);
    }


    const sendMessage = () => {
        let msg = message;
        props.signal.sendMessage({ type: "chat", payload: msg });
        // @ts-ignore
        setMessages(prev => [{message: msg}, ...prev]);
        setMessage("");
    }



    useEffect(() => {
            console.log("registering...");
            props.signal.addMessageHandler((payload: MessagePayload) => {
                switch (payload.type) {
                    case "signal":
                        onSignal(payload.payload);
                        break;
                    case "chat":
                        onMessageReceived(payload.payload);
                        break;
                }
            });

            props.signal.joinRoom(props.roomCode).then((e) => console.log(e));

            return () => props.signal.clearMessageHandlers(); //Should remove handler in return
        }
        , [props.signal, props.name]);

    const chatKeypress = (e: any) => {
        if (e.code == "Enter") {
            sendMessage();
            document.querySelector("#message-field")?.lastElementChild?.scrollIntoView();
        }
    }

    return (
        <div id="lobby-wrapper">
            <Link to={"/"}>
                <button className={"squircle-button red"} id={"home-button"}>
                    <i className={"fa fa-home"}/>
                </button>
            </Link>
            <h1>Welcome, {props.name}</h1>
            <h3>Invite your friends using the code below</h3>
            <CopyField id={"copy-field"} value={props.roomCode}/>
            <div>
                <div id={"member-list"}>
                    <p><b>Members</b>: {props.name}, Freddie</p>
                </div>
                <div id={"message-field"}>
                    {messages.map((x: any) => <div className={"messageWrapper"}>
                        <p className={"chat-message"}><b>{props.name}</b>: {x.message}</p>
                    </div>)}
                </div>
                <input id={"chat-input"} onKeyDown={chatKeypress} type={"textField"} value={message}
                       placeholder={"Type message"}
                       onChange={(e) => setMessage(e.target.value)}/>
                <button id={"send-message-button"} className={"green"} onClick={sendMessage}>
                    <i className={"fa fa-send"}/>
                </button>
            </div>
            <div>
                <Button text={"Init Peer"} onClick={() => initPeer(props.name, props.signal)}/>
            </div>
        </div>
    )
}

const CopyField = (props: { id: string, value: string }) => {
    const textFieldRef: RefObject<HTMLInputElement> = useRef(null);
    return (
        <div id={props.id}>
            <input id={"copy-input"} className={"text-input"} type={"textField"} ref={textFieldRef}
                   value={props.value}/>
            <button className={"circle-button circle-overlay-button blue"} style={{gridRow: 1, gridColumn: 2}}
                    onClick={() => {
                        textFieldRef?.current?.select();
                        document.execCommand('copy');
                    }}>
                <i className={"fa fa-copy"}/>
            </button>
        </div>
    );
}

export default Lobby;