import React, {ReactComponentElement, useCallback, useEffect, useState} from 'react';
import {Link, RouteComponentProps} from "react-router-dom";
import './css/Home.css'
import './css/General.css'


import {Socket} from "./connections/Socket";
import { WithChatClientLocationState } from './WithChatClient';


const Home = (props: RouteComponentProps<{}>) => {


    const [username, setUsername] = useState("User");
    const [roomId, setRoomId] = useState("");

    let randomRoomName = generateRandomRoomName();

    useEffect(() => {
        document.getElementById("name-input")?.focus();
        document.getElementById("name-input")?.addEventListener("keydown", (e) => {
            if (e.code === "Enter") {
                document.getElementById("lobby-input")?.focus();
            }
        });
    }, []);

    const joinRoom = useCallback(() => {
        if (roomId == "") {
            alert("Please enter lobby name");
        } else if (username === "") {
            alert("Please enter username");
        } else {
            props.history.push(`/riffr/lobby`, { roomId, username, create: false });
        }
    }, [props.history, username, roomId]);

    useEffect(() => {
        document.getElementById("lobby-input")
            ?.addEventListener("keydown", (e) => {
                if (e.code === "Enter") joinRoom();
            });
    }, [joinRoom]);


    return (
        <div id={"home-wrapper"}>
            <h1 className={"title"}>Riffr <i className={"fa fa-music"}/></h1>
            <TextInput id={"name-input"} placeholder={"Enter name"} parentCallback={setUsername} autoComplete={"on"}/>
            <div className={"lobby-container"} id={"join-lobby"}>
                <TextInput id={"lobby-input"} placeholder={"Enter lobby name"} parentCallback={setRoomId}/>
                <Link to={{
                        pathname: `/riffr/lobby`,
                        state: { roomId, username, create: false } as WithChatClientLocationState
                    }} className={"circle-button button blue white-text"}
                      id={"join-button"}>
                    <i className={"fa fa-send block"}/>
                </Link>
            </div>
            <div>
                <Link to={{
                        pathname: `/riffr/lobby`,
                        state: { roomId: randomRoomName, username, create: true } as WithChatClientLocationState
                    }}>
                    <button id={"create-button"} className={"squircle-button green white-text"}>
                        Or create a lobby
                        <i className={"fa fa-rocket"}/>
                    </button>
                </Link>
            </div>
        </div>
    );
}

const generateRandomRoomName = () => {
    let words = ["cat", "dog", "tape", "word", "wheel", "tree", "apple", "mouse", "golf", "van", "lock", "nest", "prawn", "crow", "atom", "year"];
    // Gets a random word and removes it from the list to avoid duplicates
    return words.splice(Math.floor(Math.random() * words.length), 1)[0] + "-" +
        words.splice(Math.floor(Math.random() * words.length), 1)[0] + "-" +
        words.splice(Math.floor(Math.random() * words.length), 1)[0];
}


const TextInput = (props: { id: string, placeholder: string, autoComplete?: string, parentCallback: (arg0: string) => void }) => {
    let autoComplete = "off";
    if (props.autoComplete != undefined) {
        autoComplete = props.autoComplete;
    }

    return (
        <input type={"textField"} id={props.id} className={"text-input"} placeholder={props.placeholder}
               autoComplete={autoComplete} onChange={(e) => {
            props.parentCallback(e.target.value);
        }}/>
    );
}

export default Home;