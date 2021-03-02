import React, {useCallback, useState} from 'react';
import {Link} from "react-router-dom";
import './css/Home.css'
import './css/General.css'


import { Socket } from "./connections/Socket";


const Home = (props: { socket: Socket, setCreate: (create: boolean) => void }) => {
  const [name, setName] = useState("User");
  const [lobbyName, setLobbyName] = useState("");

  let randomRoomName = generateRandomRoomName();

  const newRoomClick = useCallback(() => {
    console.log(props)
    props.setCreate(true);
  }, [name]);

  return (
    <div id={"home-wrapper"}>
      <h1 className={"title"}>Riffr <i className={"fa fa-music"}/></h1>
      <TextInput id={"name-input"} placeholder={"Enter name"} parentCallback={setName}/>
      <div className={"lobby-container"} id={"join-lobby"}>
        <TextInput id={"lobby-input"} placeholder={"Enter lobby name"} parentCallback={setLobbyName}/>
        <Link to={`/lobby/${lobbyName}/${name}`} className={"circle-button button blue white-text"} id={"join-button"}>
            <i className={"fa fa-send block"}/>
        </Link>
      </div>
      <div>
        <Link to={`/lobby/${randomRoomName}/${name}`}>
          <button id={"create-button"}  className={"squircle-button green white-text"} onClick={newRoomClick}>
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

const TextInput = (props: { id: string, placeholder: string, parentCallback: (arg0: string) => void }) => {
  return (
    <input type={"textField"} id={props.id} className={"text-input"} placeholder={props.placeholder} onChange={(e) => {
      props.parentCallback(e.target.value);
    }}/>
  );
}

export default Home;