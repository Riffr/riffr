import React, {RefObject, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import './css/Room.css';
import './css/General.css';
import {SignallingChannel} from "./connections/SignallingChannel";
import Audio from "./audio/Audio";

import { Peer, SignalPayload } from "./connections/Peer";

type MessagePayload = ChatPayload | SignallingPayload;

interface ChatPayload {
    type: "chat",
    payload: any
}
interface SignallingPayload {
    type: "signal",
    payload: SignalPayload,
}

// var peer : Peer | undefined;

// const initPeer = (name: string, signal: SignallingChannel) => {

//     let initiator = (name == "offerer");
//     console.log(`[isOfferer] ${ initiator }`);
//     let p = new Peer({
//         id: name,
//         initiator,
//     });
//     peer = p;
//     console.log(p);

//     p.on("error", (e) => {
//         console.log(`Error: ${ e }`);
//     });

//     p.on("signal", (_, payload: SignalPayload) => {
//         signal.sendMessage({
//             type: "signal",
//             payload
//         });
//     });

//     if (initiator) {
//         p.on("connection", (_, state: RTCIceConnectionState) => {
//             if (state == "connected") {
//                 console.log("Connected via WebRTC :)");
//             }
//         });
    
//         p.on("channelOpen", (_, channel) => {
//             console.log(`connected with ${ channel.label } and ready to send data!`);
//             p.send(channel.label, `Hello World`);
//         });

//     }

//     p.on("channelData", (_, channel, data) => {
//         console.log(`Recieved ${ data } from channel ${ channel.label }`);
//     });
    

// };

// const onSignal = (payload: SignalPayload) => {
//     if (peer === undefined) {
//         console.log("Peer is undefined :(");
//         console.log("peer:");
//         console.log(peer);
//         return;
//     }

//     console.log("[onSignal] Signalling payload received")
//     peer.dispatch(payload);
// };

const Room = (props: { name: string, roomCode: string, signal: SignallingChannel }) => {
    let [message, setMessage] = useState("");
    let [messages, setMessages] = useState([]);
    let [memberListShown, setListShown] = useState("grid");
    let [chatDisplay, setChatDisplay] = useState("flex");
    let [wrapperGrid, setWrapperGrid] = useState("min-content 3fr 1fr");

    const sendMessage = () => {
        let msg = message;
        props.signal.sendMessage({
            type: "chat",
            payload: {
                user: props.name,
                message: msg
            }
        });
        // @ts-ignore
        setMessages(prev => [{message: msg, user: props.name}, ...prev]);
        setMessage("");
    }

    const onMessageReceived = (e: any) => {
        // I promise I'll be good later...
        // @ts-ignore
        setMessages(prev => [e, ...prev]);
    }

    useEffect(() => {
            console.log("registering...");
            props.signal.addMessageHandler((payload: MessagePayload) => {
                switch (payload.type) {
                    case "chat":
                        onMessageReceived(payload.payload);
                        break;
                    default:
                        break;
                }
            });
            props.signal.joinRoom(props.roomCode).then((e) => console.log(e));
            return () => props.signal.clearMessageHandlers(); //Should remove handler in return
        }
        , [props.name]);

    const chatKeypress = (e: any) => {
        if (e.code == "Enter") {
            sendMessage();
            document.querySelector("#message-field")?.lastElementChild?.scrollIntoView();
        }
    }


    const toggleMembers = () => {
        if (memberListShown == "grid") {
            setListShown("none");
        } else {
            setListShown("grid");
        }
    }

    const toggleChat = () => {
        if (chatDisplay == "flex") {
            setChatDisplay("none");
            setWrapperGrid("min-content 3fr 0fr");
        } else {
            setChatDisplay("flex");
            setWrapperGrid("min-content 3fr 1fr");
        }
    }

    return (
        <div id="room-wrapper" style={{gridTemplateColumns: wrapperGrid}}>

            <div style={{
                display: "grid",
                gridTemplateRows: "40px 40px 90px",
                gridTemplateColumns: "40px",
                gridGap: "10px"
            }}>
                <button className={"squircle-button red"}>
                    <i className={"fa fa-chevron-left block"}/>
                </button>
                <Link to={"/"} className={"squircle-button button red"}>
                    <i className={"fa fa-home block"}/>
                </Link>
                <button className={"squircle-button red"} onClick={toggleChat} style={{marginTop: "50px"}}>
                    <i className={"fa fa-comment block"}/>
                </button>
            </div>
            <Audio signal={props.signal} initiator={props.name == "offerer"}/>
            <div id={"chat"} style={{display: chatDisplay}}>
                <button onClick={toggleMembers} className={"blue"} id={"chat-member-header"}><b>Members</b></button>
                <div id={"member-list"} style={{display: memberListShown}}>
                    <p>{props.name}</p>
                    <p>Freddie</p>
                </div>
                <div id={"message-field"}>
                    {messages.map((x: any) => <div className={"messageWrapper"}>
                        <p className={"chat-message"}><b>{x.user}</b>: {x.message}</p>
                    </div>)}
                </div>
                <div>
                    <input id={"chat-input"} onKeyDown={chatKeypress} type={"textField"} value={message}
                           placeholder={"Type message"}
                           onChange={(e) => setMessage(e.target.value)}/>
                    <button id={"send-message-button"} className={"green"} onClick={sendMessage}>
                        <i className={"fa fa-send block"}/>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Room;