import React, {RefObject, useCallback, useEffect, useRef, useState} from 'react';
import {Link, RouteComponentProps} from 'react-router-dom';
import './css/Lobby.css';
import './css/General.css'

import { v4 as uuidv4 } from "uuid";

import { Socket } from './connections/Socket';

import { 
    ChatEvent, 
    ChatUser as User,
    UserProps,
    Message, 
    chat
} from '@riffr/backend';
import { ChatClient } from './connections/ChatClient';
import { Room } from './connections/Room';
import { WithChatClientLocationState } from './WithChatClient';


interface LobbyProps extends RouteComponentProps {
    chatClient: ChatClient;
    create: boolean;
};


const Lobby = (props: LobbyProps) => {
    
    const { path } = props.match;
    

    const { chatClient, create } = props;
    const user = chatClient.user;
    const room = chatClient.room;

    const locationState: WithChatClientLocationState = { roomId: room.id, username: user.username, create };
    
    let [message, setMessage] = useState("");
    let [messages, setMessages] = useState<Array<Message>>([]);
    let [members, setMembers] = useState<Array<UserProps>>([...room.members.values()]);

    const onMessageReceived = (message: Message) => {
        const { from, content } = message;

        const username = room.members.get(from)?.username;
        if (!username) return;

        setMessages(prev => [...prev, { from: username, content}]);
    };

    const sendMessage = useCallback(() => {
        let msg = message;

        props.chatClient.send(message);

        setMessages(prev => [...prev, {from: user.username, content: msg} as Message]);
        setMessage("");
    }, [message]);


    useEffect(() => {
        chatClient.room.on("membersUpdated", (room: Room<User>) => {
            setMembers([...room.members.values()]);
        })

        chatClient.on("message", (_, message: Message) => {
            onMessageReceived(message);
        });

        chatClient.on("start", () => {
            setTimeout(() => { props.history.push('/riffr/room', locationState)}, 1000);
        });

        return () => { 
            chatClient.removeAllListeners("message"); 
            chatClient.room.removeAllListeners("membersUpdated"); 
        };
    }, [chatClient])

    useEffect(() => {
        document.getElementById("chat-input")?.focus();
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
                <Link to={"/"} className={"squircle-button button dark-burgandy"} id={"home-button"}>
                    <i className={"fa fa-home block"}/>
                </Link>
            </div>
            <h1>Welcome, {user.username}</h1>
            <h3>Invite your friends using the code below</h3>
            <CopyField id={"copy-field"} value={room.id}/>
            <div style={{maxWidth: "350px"}}>
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
            { create && <Link to={
                { pathname: `/riffr/room`
                , state: locationState
                }} onClick={() => chatClient.broadcastStart()}>
                <button id={"start-button"} className={"squircle-button green"}>
                    Start
                    <i className={"fa fa-play"} />
                </button>
            </Link>}
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