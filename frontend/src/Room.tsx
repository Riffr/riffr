import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Link, RouteComponentProps } from 'react-router-dom';
import './css/Room.css';
import './css/General.css';
import Audio from "./audio/Audio";

import {
    Message,
    ChatUser as User,
    UserProps
} from "@riffr/backend";

import { Room as CRoom } from './connections/Room';
import { withSignallingChannel } from './WithSignallingChannel';

const Room = withSignallingChannel(props => {


    const { chatClient, signallingChannel } = props;

    const room = chatClient.room;
    const user = chatClient.user;

    console.log(`Room ${room.id}`);


    let [message, setMessage] = useState("");
    let [messages, setMessages] = useState<Array<Message>>([]);
    let [members, setMembers] = useState<Array<UserProps>>([...room.members.values()]);


    let [memberListShown, setListShown] = useState("grid");
    let [settingsShown, setSettingsShown] = useState("grid");

    let [chatDisplay, setChatDisplay] = useState("flex");
    let [wrapperGrid, setWrapperGrid] = useState("min-content 3fr 1fr");


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
        chatClient.room.on("membersUpdated", (room: CRoom<User>) => {
            setMembers([...room.members.values()]);
        })

        chatClient.on("message", (_, message: Message) => {
            onMessageReceived(message);
        });

        return () => {
            chatClient.removeAllListeners("message");
            chatClient.room.removeAllListeners("membersUpdated");
        };
    }, [chatClient]);

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
                <Link to={"/"} className={"squircle-button button dark-burgandy"}>
                    <i className={"fa fa-home block"} />
                </Link>
                <button className={"squircle-button purple"} onClick={toggleChat} style={{marginTop: "50px"}}>
                    <i className={"fa fa-comment block"} />
                </button>
                <button className={"squircle-button purple"} onClick={toggleSettings} title={"Toggle loop settings"}>
                    <i className={"fa fa-cog block"}/>
                </button>
            </div>
            <Audio signal={signallingChannel} />
            <div id={"chat"} style={{ display: chatDisplay }}>
                <button onClick={toggleMembers} className={"blue"} id={"chat-member-header"}><b>Members</b></button>
                <div id={"member-list"} style={{display: memberListShown}}>
                    {members.map(user => <p>{user.username}</p>)}
                </div>
                <div id={"message-field"}>
                    {messages.map((x: Message) => <div className={"messageWrapper"}>
                            <p className={"chat-message"}><b>{x.from}</b>: {x.content}</p>
                        </div>
                    )}
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
});


export default Room;