import React, { useState } from 'react';
import {Link} from "react-router-dom";
import './Home.css';

const Home = (props: any) => {
  const [name, setName] = useState("User");
  const [lobbyName, setLobbyName] = useState("");
  let signallingSocket = props.socket;

  const createLobby = () => {
      signallingSocket.emit('signalling:create_room', { name: "test-room" }, ({name, status} : {name : string, status: string}) => {
          console.log(`[callback] ${ name } ${ status }`);
          signallingSocket.emit('message', { test: "Hello World!"}, (res:any) => {
              console.log(`[message callback] Was expecting nothing, got ${ res }`);
          });
      })
    }

    const joinLobby = () => {
        signallingSocket.emit('signalling:join_room', { name: "test-room" }, ({name, status} : {name : string, status: string}) => {
            console.log(`[callback] ${ name } ${ status }`);
        })
    }

  return (
    <div id={"main"}>
      <h1>Riffr <i className={"fa fa-music"}/></h1>
      <TextInput id={"nameInput"} placeholder={"Enter name to get started"} parentCallback={setName}/>
      <div className={"lobbyContainer"} id={"joinLobby"}>
        <h2>Join Lobby</h2>
        <TextInput id={"lobbyInput"} placeholder={"Enter lobby name"} parentCallback={setLobbyName}/>
        <button onClick={joinLobby} className={"homeButton"} id={"joinButton"}>
          <i className={"fa fa-send"}/>
        </button>
      </div>
      <div className={"lobbyContainer"} id={"createLobby"}>
        <h2>Create Lobby</h2>
        <Link to={`/lobby/${name}`}>
          <button onClick={createLobby} className={"homeButton"} id={"createButton"}>
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