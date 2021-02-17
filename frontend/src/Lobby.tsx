import React, {RefObject, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import './css/Lobby.css';
import './css/General.css'
import {SignallingChannel} from "./connections/SignallingChannel";

const Lobby = (props: { name: string, roomCode: string, socket: SignallingChannel }) => {
    let [message, setMessage] = useState("");
    let [messages, setMessages] = useState([]);

    const sendMessage = () => {
        let msg = message;
        props.socket.sendMessage(msg);
        // @ts-ignore
        setMessages(prev => [{message: msg}, ...prev]);
        setMessage("");
    }

    const onMessageReceived = (e: any) => {
        // I promise I'll be good later...
        // @ts-ignore
        setMessages(prev => [{message: e}, ...prev]);
    }

    useEffect(() => {
            console.log("registering...");
            props.socket.addMessageHandler(onMessageReceived);
            props.socket.joinRoom(props.roomCode).then((e) => console.log(e));
            return () => props.socket.clearMessageHandlers(); //Should remove handler in return
        }
        , [props.name]);

    const chatKeypress = (e: any) => {
        if (e.code == "Enter") {
            sendMessage();
            document.querySelector("#message-field")?.lastElementChild?.scrollIntoView();
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