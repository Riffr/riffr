import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Link, useHistory} from "react-router-dom";
import './css/Home.css'
import './css/General.css'


import {Socket} from "./connections/Socket";


const Home = (props: { socket: Socket, setCreate: (create: boolean) => void }) => {
    const [name, setName] = useState("User");
    const [lobbyName, setLobbyName] = useState("");
    const nameRef = useRef("");
    const lobbyNameRef = useRef("");
    const history = useHistory();
    let randomRoomName = generateRandomRoomName();

    const newRoomClick = useCallback(() => {
        console.log(props)
        props.setCreate(true);
    }, [name]);

    useEffect(() => {
        document.getElementById("name-input")?.focus();
        document.getElementById("name-input")?.addEventListener("keydown", (e) => {
            if (e.code === "Enter") {
                document.getElementById("lobby-input")?.focus();
            }
        });
    }, []);

    const gotoLobby = () => {
        if (lobbyNameRef.current === "") {
            alert("Please enter lobby name");
        } else {
            history.push(`/lobby/${lobbyNameRef.current}/${nameRef.current}`);
        }
    }

    useEffect(() => {
        document.getElementById("lobby-input")?.addEventListener("keydown", (e) => {
            if (e.code === "Enter") {
                gotoLobby();
            }
        });
    }, []);

    useEffect(() => {
        nameRef.current = name;
        lobbyNameRef.current = lobbyName;
    }, [name, lobbyName]);

    return (
        <div id={"home-wrapper"}>
            <h1 className={"title"}>Riffr <i className={"fa fa-music"}/></h1>
            <TextInput id={"name-input"} placeholder={"Enter name"} parentCallback={setName} autoComplete={"on"}/>
            <div className={"lobby-container"} id={"join-lobby"}>
                <TextInput id={"lobby-input"} placeholder={"Enter lobby name"} parentCallback={setLobbyName}/>
                <button id={"join-button"} className={"circle-button button blue white-text"} onClick={gotoLobby}>
                    <i className={"fa fa-send block"}/>
                </button>
            </div>
            <div>
                <Link to={`/lobby/${randomRoomName}/${name}`}>
                    <button id={"create-button"} className={"squircle-button green white-text"} onClick={newRoomClick}>
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