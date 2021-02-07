import React, { useState } from 'react';
import {Link} from "react-router-dom";
import './Home.css';

const Home = () => {
  const [name, setName] = useState("User");
  const [lobbyName, setLobbyName] = useState("");

  return (
    <div id={"main"}>
      <h1>Riffr <i className={"fa fa-music"}/></h1>
      <TextInput id={"nameInput"} placeholder={"Enter name to get started"} parentCallback={setName}/>
      <div className={"lobbyContainer"} id={"joinLobby"}>
        <h2>Join Lobby</h2>
        <TextInput id={"lobbyInput"} placeholder={"Enter lobby name"} parentCallback={setLobbyName}/>
        <button className={"homeButton"} id={"joinButton"}>
          <i className={"fa fa-send"}/>
        </button>
      </div>
      <div className={"lobbyContainer"} id={"createLobby"}>
        <h2>Create Lobby</h2>
        <Link to={`/lobby/${name}`}>
          <button className={"homeButton"} id={"createButton"}>
            Create
            <i className={"fa fa-rocket"}/>
          </button>
        </Link>
      </div>
    </div>
  );
}


const TextInput = (props: {id: string, placeholder: string, parentCallback: (arg0: string) => void}) => {
  return (
    <input type={"textField"} id={props.id} placeholder={props.placeholder} onChange={(e) => {
      props.parentCallback(e.target.value);
    }}/>
  );
}

export default Home;