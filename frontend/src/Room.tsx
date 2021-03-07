import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './css/Room.css';
import './css/General.css';
import Audio from "./audio/Audio";
import AudioComponent from "./audio/AudioComponent";
import { Socket } from './connections/Socket';
import { SignallingChannel } from "./connections/SignallingChannel";
import { 
    Message, 
    ChatUser as User,
    UserProps
} from "@riffr/backend";
import { ChatClient } from './connections/ChatClient';

const Room = (props: { roomCode: string, name: string, socket: Socket, create: boolean, chatClient?: ChatClient }) => {

    let [message, setMessage] = useState("");
    let [messages, setMessages] = useState<Array<Message>>([]);

    let [members, setMembers] = useState<Array<UserProps>>([]);
    
    const userProps: UserProps = { username: props.name };

    let [memberListShown, setListShown] = useState("grid");

    let [chatDisplay, setChatDisplay] = useState("flex");
    let [wrapperGrid, setWrapperGrid] = useState("min-content 3fr 1fr");
    let [audio, setAudio] = useState(<div />);


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
            const channel = await (props.create
                ? SignallingChannel.createRoom(props.socket, props.roomCode, userProps)
                : SignallingChannel.joinRoom(props.socket, props.roomCode, userProps));

            setAudio(<AudioComponent signal={channel} />);
        })();
    }, []);

    useEffect(() => {
        setMembers(Array.from(props.chatClient?.room.members.values() || []));

        props.chatClient?.on("message", (_, message: Message) => {
            onMessageReceived(message);
        });

        return () => {
            props.chatClient?.removeAllListeners("message");
            props.chatClient?.room.removeAllListeners("membersUpdated");
        };
    }, [props.chatClient]);

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
                <button className={"squircle-button purple"} onClick={toggleChat}>
                    <i className={"fa fa-comment block"} />
                </button>
            </div>
            {audio}
            <div id={"chat"} style={{ display: chatDisplay }}>
                <button onClick={toggleMembers} className={"blue"} id={"chat-member-header"}><b>Members</b></button>
                <div id={"member-list"}>
                    <p><b>Members: </b>{members.map(user => user.username).join(", ")}</p>
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
}

export default Room;