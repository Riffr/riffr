import React, {RefObject, useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import './css/Lobby.css';
import './css/General.css'

import { Socket } from './connections/Socket';

import { ChatEvent, User, Message } from '@riffr/backend';
import { ChatClient } from './connections/ChatClient';
import { Room } from './connections/Room';

const Lobby = (props: { name: string, roomCode: string, socket: Socket, create: boolean, chatClient?: ChatClient, setChatClient: (chat?: ChatClient) => void }) => {
    
    let [message, setMessage] = useState("");
    let [messages, setMessages] = useState([]);
    let [members, setMembers] = useState<Array<User>>([]);
    
    const user: User = { id: props.name };

    const onMessageReceived = (message: Message) => {
        console.log(messages);
        // I promise I'll be good later...
        // @ts-ignore
        setMessages(prev => [...prev, message]);
    }

    const sendMessage = useCallback(() => {
        let msg = message;

        // Add some UI for pending messages?
        if (!props.chatClient) return;
        props.chatClient.send(message);

        // @ts-ignore
        setMessages(prev => [...prev, {from: user, content: msg} as Message]);
        setMessage("");


    }, [props.socket, message, props.chatClient]);

    useEffect(() => {
        (async () => {
            console.log("registering...");
            const client = await (props.create 
                ? ChatClient.createRoom(props.socket, props.roomCode, user)
                : ChatClient.joinRoom(props.socket, props.roomCode, user));

 
            client.room.on("membersUpdated", (room: Room<User>) => {
                setMembers(room.members);
            })

            client.on("message", (_, message: Message) => {
                onMessageReceived(message);
            });

            props.setChatClient(client);
            setMembers(client.room.members || []);

        }) ();

        return () => { 
            props.chatClient?.removeAllListeners("message"); 
            props.chatClient?.room.removeAllListeners("membersUpdated"); 
            props.chatClient?.leave();
        };
    }, []);

    useEffect(() => {
        document.querySelector("#message-field")?.lastElementChild?.scrollIntoView();
    }, [messages]);

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
                    <p><b>Members </b>{members.map(user => user.id).join(", ")}</p>
                </div>
                <div id={"message-field"}>
                    {messages.map((x: Message) => <div className={"messageWrapper"}>
                        <p className={"chat-message"}><b>{x.from.id}</b>: {x.content}</p>
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
                <button id={"start-button"} className={"squircle-button green"}>
                    Start
                    <i className={"fa fa-play"} />
                </button>
            </Link>
        </div>
    );
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