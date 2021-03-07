import React, {RefObject, useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import './css/Lobby.css';
import './css/General.css'

import { Socket } from './connections/Socket';

import { 
    ChatEvent, 
    ChatUser as User,
    UserProps,
    Message 
} from '@riffr/backend';
import { ChatClient } from './connections/ChatClient';
import { Room } from './connections/Room';

const Lobby = (props: { name: string, roomCode: string, socket: Socket, create: boolean, chatClient?: ChatClient, setChatClient: (chat?: ChatClient) => void }) => {
    
    let [message, setMessage] = useState("");
    let [messages, setMessages] = useState<Array<{ from: string, content: string }>>([]);
    let [members, setMembers] = useState<Array<UserProps>>([]);
    
    const userProps: UserProps = { username: props.name };

    const onMessageReceived = useCallback((message: Message) => {
        const { from, content } = message;
        const username = props.chatClient?.room.members.get(from)?.username
        if (!username) return;

        setMessages(prev => [...prev, { from: username, content}]);
    }, [props.chatClient]);

    const sendMessage = useCallback(() => {
        let msg = message;

        // Add some UI for pending messages?
        if (!props.chatClient) return;
        const username = props.chatClient.user.username;
        props.chatClient.send(message);

        setMessages(prev => [...prev, {from: username, content: msg} as Message]);
        setMessage("");


    }, [message, props.chatClient]);

    useEffect(() => {
        (async () => {
            console.log("registering...");
            const client = await (props.create 
                ? ChatClient.createRoom(props.socket, props.roomCode, userProps)
                : ChatClient.joinRoom(props.socket, props.roomCode, userProps));

 
            setMembers(Array.from(client.room.members.values() || []));

            props.setChatClient(client);
        }) ();
    }, []);

    useEffect(() => {
        props.chatClient?.room.on("membersUpdated", (room: Room<User>) => {
            setMembers(Array.from(room.members.values()));
        })

        props.chatClient?.on("message", (_, message: Message) => {
            onMessageReceived(message);
        });

        return () => { 
            props.chatClient?.removeAllListeners("message"); 
            props.chatClient?.room.removeAllListeners("membersUpdated"); 
            // props.chatClient?.leave();
        };
    }, [props.chatClient])

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
                    <p><b>Members: </b>{members.map(user => user.username).join(", ")}</p>
                </div>
                <div id={"message-field"}>
                    {messages.map((x: Message) => <div className={"messageWrapper"}>
                            <p className={"chat-message"}><b>{x.from}</b>: {x.content}</p>
                        </div>
                    )}
                </div>
                <input id={"chat-input"} onKeyDown={chatKeypress} type={"textField"} value={message}
                       placeholder={"Type message"}
                       onChange={(e) => setMessage(e.target.value)} autoComplete={"off"} />
                <button id={"send-message-button"} className={"blue"} onClick={sendMessage}>
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