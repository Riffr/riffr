import React, { useState } from 'react';
import {Link} from "react-router-dom";
import './Home.css';
import {SignallingChannel} from "./connections/SignallingChannel";


const Home = (props: {socket: SignallingChannel}) => {
  const [name, setName] = useState("User");
  const [lobbyName, setLobbyName] = useState("");


  let randomRoomName = generateRandomRoomName();

    const newRoomClick = () => {
        console.log(props)
        props.socket.createRoom(randomRoomName).then((e) => console.log(e));
    }

  return (
    <div id={"main"}>
      <h1>Riffr <i className={"fa fa-music"}/></h1>
      <TextInput id={"nameInput"} placeholder={"Enter name to get started"} parentCallback={setName}/>
      <div className={"lobbyContainer"} id={"joinLobby"}>
        <h2>Join Lobby</h2>
        <TextInput id={"lobbyInput"} placeholder={"Enter lobby name"} parentCallback={setLobbyName}/>
          <Link to={`/lobby/${lobbyName}/${name}`} style={{gridColumn: 3, gridRow: 2, zIndex: 1, marginRight: "-5px"}}>
            <button className={"homeButton"} id={"joinButton"}>
              <i className={"fa fa-send"}/>
            </button>
          </Link>
      </div>
      <div className={"lobbyContainer"} id={"createLobby"}>
        <h2>Create Lobby</h2>
        <Link to={`/lobby/${randomRoomName}/${name}`}>
          <button onClick={newRoomClick} className={"homeButton"} id={"createButton"}>
            Create
            <i className={"fa fa-rocket"}/>
          </button>
        </Link>
      </div>
    </div>
  );
}

//Just some random algorithm
const generateRandomRoomName = () => {
    let words = ["cat", "dog", "hammer", "jack", "tape", "driver", "word","can","wheel"];
    return words[Math.floor(Math.random()*words.length)]+"-"+words[Math.floor(Math.random()*words.length)]+"-"+words[Math.floor(Math.random()*words.length)];
}

const TextInput = (props: {id: string, placeholder: string, parentCallback: (arg0: string) => void}) => {
  return (
    <input type={"textField"} id={props.id} placeholder={props.placeholder} onChange={(e) => {
      props.parentCallback(e.target.value);
    }}/>
  );
}

export default Home;