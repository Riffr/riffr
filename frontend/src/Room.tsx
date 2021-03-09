import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './css/Room.css';
import './css/General.css';
import Audio from "./audio/Audio";
import { Socket } from './connections/Socket';
import { SignallingChannel } from "./connections/SignallingChannel";
import { Message, User } from "@riffr/backend";
import { ChatClient } from './connections/ChatClient';

const Room = (props: { roomCode: string, name: string, socket: Socket, create: boolean, chatClient?: ChatClient }) => {

    let [message, setMessage] = useState("");
    let [messages, setMessages] = useState<Array<Message>>([]);

    let [members, setMembers] = useState<Array<User>>([]);
    let [memberListShown, setListShown] = useState("grid");
    let [settingsShown, setSettingsShown] = useState("grid");

    let [chatDisplay, setChatDisplay] = useState("flex");
    let [wrapperGrid, setWrapperGrid] = useState("min-content 3fr 1fr");
    let [audio, setAudio] = useState(<div />);

    const user: User = { id: props.name };

    const onMessageReceived = (message: Message) => {
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
        setMessages(prev => [...prev, { from: user, content: msg } as Message]);
        setMessage("");


    }, [props.socket, message, props.chatClient]);

    useEffect(() => {
        (async () => {
            const channel = await (props.create
                ? SignallingChannel.createRoom(props.socket, props.roomCode, user)
                : SignallingChannel.joinRoom(props.socket, props.roomCode, user));

            setAudio(<Audio signal={channel} />);
        })();

        setMembers(props.chatClient?.room.members || []);

        props.chatClient?.on("message", (_, message: Message) => {
            onMessageReceived(message);
        });

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

    const toggleMembers = () => {
        if (memberListShown == "grid") {
            setListShown("none");
        } else {
            setListShown("grid");
        }
    }

    const toggleSettings = () => {
        console.log(settingsShown == "grid");
        if (settingsShown == "grid") {
            document.getElementById("controls")?.setAttribute("style","display: none");
            setSettingsShown("none");
        }
        else {
            document.getElementById("controls")?.setAttribute("style","display: grid");
            setSettingsShown("grid");
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
        <div id="room-wrapper" style={{ gridTemplateColumns: wrapperGrid }}>
            <div id={"nav-bar"}>
                <Link to={"/"} className={"squircle-button button blue"}>
                    <i className={"fa fa-home block"} />
                </Link>
                <button className={"squircle-button purple"} onClick={toggleChat} style={{marginTop: "50px"}}>
                    <i className={"fa fa-comment block"} />
                </button>
                <button className={"squircle-button purple"} onClick={toggleSettings} title={"Toggle loop settings"}>
                    <i className={"fa fa-cog block"}/>
                </button>
            </div>
            {audio}
            <div id={"chat"} style={{ display: chatDisplay }}>
                <button onClick={toggleMembers} className={"blue"} id={"chat-member-header"}><b>Members</b></button>
                <div id={"member-list"} style={{display: memberListShown}}>
                    {members.map(user => <p>{user.id}</p>)}
                </div>
                <div id={"message-field"}>
                    {messages.map((x: Message) => <div className={"messageWrapper"}>
                        <p className={"chat-message"}><b>{x.from.id}</b>: {x.content}</p>
                    </div>)}
                </div>
                <div>
                    <input id={"chat-input"} onKeyDown={chatKeypress} type={"textField"} value={message}
                        placeholder={"Type message"}
                        onChange={(e) => setMessage(e.target.value)} autoComplete={"off"} />
                    <button id={"send-message-button"} className={"green"} onClick={sendMessage}>
                        <i className={"fa fa-send block"} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Room;