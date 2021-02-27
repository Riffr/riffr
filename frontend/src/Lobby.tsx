import React, {RefObject, useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import './css/Lobby.css';
import './css/General.css'

import { Socket } from './connections/Socket';

import { ChatEvent, User, Message } from '@riffr/backend';

class Player implements User {
    id: string;
    name: string;

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
    }

}

const Lobby = (props: { name: string, roomCode: string, socket: Socket, create: boolean, setUser: (user: User) => void }) => {
    
    let [message, setMessage] = useState("");
    let [messages, setMessages] = useState([]);
    let [members, setMembers] = useState<Array<string>>([]);
    let [user] = useState<User>(new Player(props.name, props.name));

    const onMessageReceived = (message: Message) => {
        // I promise I'll be good later...
        // @ts-ignore
        setMessages(prev => [{message: e}, ...prev]);
    }


    const sendMessage = useCallback(() => {
        let msg = message;
        // if (!chatClient) return;
        // // Add some UI for pending messages?

        // chatClient.send(msg);
        // @ts-ignore
        setMessages(prev => [...prev, {from: props.name, content: msg} as Message]);
        setMessage("");


    }, [props.socket, message]);



    useEffect(() => {
        props.setUser(user);
        document.querySelector("#message-field")?.lastElementChild?.scrollIntoView();
            // (async () => {
                    
            // //     console.log("registering...");

            // //     const chatClient = await (props.create 
            // //         ? ChatClient.createRoom(props.socket, props.roomCode, { id: props.name })
            // //         : ChatClient.createRoom(props.socket, props.roomCode, { id: props.name }));
                
            // //     setChatClient(chatClient);
            // //     setMembers(chatClient.room.members);
            // //     chatClient.room.on("membersUpdated", (room: Room<User>) => {
            // //         setMembers(room.members);
            // //     })

            // //     chatClient.on("message", (_, message: Message) => {
            // //         onMessageReceived(message);
            // //     });

            // //     return () => { chatClient.removeAllListeners("message"); chatClient.room.removeAllListeners("membersUpdated"); }; //Should remove handler in return
            // // }) ();
        }
        , [props.socket, props.name, props.roomCode, props.create, messages]);

    const chatKeypress = (e: any) => {
        if (e.code == "Enter") {
            sendMessage();
        }
    }

    return (
        <div id="lobby-wrapper">
            <div>
                <Link to={"/"} className={"squircle-button button red"} id={"home-button"}>
                    <i className={"fa fa-home block"}/>
                </Link>
            </div>
            <h1>Welcome, {props.name}</h1>
            <h3>Invite your friends using the code below</h3>
            <CopyField id={"copy-field"} value={props.roomCode}/>
            <div>
                <div id={"member-list"}>
                    <p><b>Members</b>{members.join(", ")}</p>
                </div>
                <div id={"message-field"}>
                    {messages.map((x: Message) => <div className={"messageWrapper"}>
                        <p className={"chat-message"}><b>{x.from}</b>: {x.content}</p>
                    </div>)}
                </div>
                <input id={"chat-input"} onKeyDown={chatKeypress} type={"textField"} value={message}
                       placeholder={"Type message"}
                       onChange={(e) => setMessage(e.target.value)}/>
                <button id={"send-message-button"} className={"green"} onClick={sendMessage}>
                    <i className={"fa fa-send"}/>
                </button>
            </div>
            <Link to={`/room/${props.roomCode}/${props.name}`}>
                <button>
                    Start
                </button>
            </Link>
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