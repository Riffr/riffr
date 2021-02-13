import React, {RefObject, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import "./Lobby.css"
import {SignallingChannel} from "./connections/SignallingChannel";

const Lobby = (props: { name: string, roomCode: string, socket: SignallingChannel }) => {
    let [message, setMessage] = useState("");
    let [messages, setMessages] = useState([]);

    const sendMessage = () => {
        let msg = message;
        props.socket.sendMessage(msg);
        // @ts-ignore
        setMessages(prev =>[{message: msg}, ...prev]);
        setMessage("");
    }

    const onMessageReceived = (e: any) => {
        // I promise I'll be good later...
        // @ts-ignore
        setMessages(prev =>[e.message, ...prev]);
    }

    useEffect(() => {
            console.log("registering...");
            props.socket.addMessageHandler(onMessageReceived);
            props.socket.joinRoom(props.roomCode).then((e) => console.log(e));
            return () => props.socket.clearMessageHandlers(); //Should remove handler in return
        }
        , [props.name]);

    return (
        <div id="main">
            <Link to={"/"}>
                <button className={"homeButton"} id={"homeButton"}>
                    <i className={"fa fa-home"}/>
                </button>
            </Link>
            <h1 id={"greetingText"}>Hello, {props.name}</h1>
            <h3 id={"inviteText"}>Invite your friends using the code below</h3>
            <CopyField id={"copyField"} value={props.roomCode}/>
            <div id={"messageField"}>
                <div style={{backgroundColor: "#ffffff", overflowY: "scroll", height: "180px", width: "480px"}}>
                    {messages.map((x: any) => <p>{x.message}</p>)}
                </div>
                <input type={"textField"} value={message} onChange={(e) => setMessage(e.target.value)}/>
                <button onClick={sendMessage}>
                    Send message
                </button>
            </div>
        </div>
    )
}

const CopyField = (props: { id: string, value: string }) => {
    const textFieldRef: RefObject<HTMLInputElement> = useRef(null);
    return (
        <div id={props.id}>
            <input type={"textField"} value={props.value} ref={textFieldRef} readOnly/>
            <button className={"homeButton"} id={"joinButton"} onClick={() => {
                textFieldRef?.current?.select();
                document.execCommand('copy');
            }}>
                <i className={"fa fa-copy"}/>
            </button>
        </div>
    );
}

export default Lobby;