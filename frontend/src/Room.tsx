import React, {RefObject, useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import './css/Room.css';
import './css/General.css';

import Audio from "./audio/Audio";

import Canvas from "./Canvas";
import {Socket} from './connections/Socket';
import {SignallingChannel} from "./connections/SignallingChannel";
import {Message, User} from "@riffr/backend";
import {sign} from "crypto";
import { ChatClient } from './connections/ChatClient';

import { Room as CRoom } from './connections/Room';


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


const Room = (props: { roomCode: string, name: string, socket: Socket, create: boolean, chatClient?: ChatClient }) => {
    
    let [message, setMessage] = useState("");
    let [messages, setMessages] = useState<Array<Message>>([]);

    let [members, setMembers] = useState<Array<User>>([]);
    let [memberListShown, setListShown] = useState("grid");
    
    let [chatDisplay, setChatDisplay] = useState("flex");
    let [wrapperGrid, setWrapperGrid] = useState("min-content 3fr 1fr");
    let [audio, setAudio] = useState(<div/>);

    const user: User = { id: props.name };

    const onMessageReceived = (message: Message) => {
        // I promise I'll be good later...
        // @ts-ignore
        setMessages(prev => [message, ...prev]);
    }


    const sendMessage = useCallback(() => {
        let msg = message;

        // Add some UI for pending messages?
        if (!props.chatClient) return;
        props.chatClient.send(message);

        // chatClient.send(msg);
        // @ts-ignore
        setMessages(prev => [...prev, {from: user, content: msg} as Message]);
        setMessage("");


    }, [props.socket, message, props.chatClient]);


    useEffect(() => {
        (async () => {
            const channel = await (props.create 
                ? SignallingChannel.createRoom(props.socket, props.roomCode, user)
                : SignallingChannel.joinRoom(props.socket, props.roomCode, user));
            
            setAudio(<Audio signal={channel} />);
        }) ();
        
        setMembers(props.chatClient?.room.members || []);

        // props.chatClient?.room.on("membersUpdated", (room: CRoom<User>) => {
        //     setMembers(room.members);
        // })

        props.chatClient?.on("message", (_, message: Message) => {
            onMessageReceived(message);
        });

        return () => { 
            props.chatClient?.removeAllListeners("message"); 
            props.chatClient?.room.removeAllListeners("membersUpdated"); 
            props.chatClient?.leave();
        }; //Should remove handler in return

    }, []);

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
            {audio}
            <div id={"chat"} style={{display: chatDisplay}}>
                <button onClick={toggleMembers} className={"blue"} id={"chat-member-header"}><b>Members</b></button>
                <div id={"member-list"} style={{display: memberListShown}}>
                    <p><b>Members </b>{members.map(user => user.id).join(", ")}</p>
                </div>
                <div id={"message-field"}>
                    {messages.map((x: Message) => <div className={"messageWrapper"}>
                            <p className={"chat-message"}><b>{x.from.id}</b>: {x.content}</p>
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