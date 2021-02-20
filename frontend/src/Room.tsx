import React, {useState} from 'react';
import {Link} from 'react-router-dom';
import './css/Room.css';
import './css/General.css'
import {SignallingChannel} from "./connections/SignallingChannel";
import Canvas from "./Canvas";

const Room = (props: { name: string, roomCode: string, socket: SignallingChannel }) => {
    let [message, setMessage] = useState("");
    let [messages, setMessages] = useState([]);
    let [memberListShown, setListShown] = useState("grid");
    let [chatDisplay, setChatDisplay] = useState("flex");
    let [wrapperGrid, setWrapperGrid] = useState("min-content 3fr 1fr");

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
            <Canvas id={"canvas"} width={1600} height={800}/>
            <div id={"chat"} style={{display: chatDisplay}}>
                <button onClick={toggleMembers} className={"blue"} id={"chat-member-header"}><b>Members</b></button>
                <div id={"member-list"} style={{display: memberListShown}}>
                    <p>{props.name}</p>
                    <p>Freddie</p>
                </div>
                <div id={"message-field"}>
                    {messages.map((x: any) => <div className={"messageWrapper"}>
                        <p className={"chat-message"}><b>{props.name}</b>: {x.message}</p>
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
            <div id={"controls"} style={{
                width: "100%",
                height: "100px",
                background: "white",
                borderRadius: "15px",
                borderColor: "#444",
                borderStyle: "solid",
                gridArea: "2/2"
            }}>

            </div>
        </div>
    )
}

export default Room;