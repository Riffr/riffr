import React, {useState} from 'react';
import {Link} from "react-router-dom";
import './css/Home.css'
import './css/General.css'
import {SignallingChannel} from "./connections/SignallingChannel";


const Home = (props: { socket: SignallingChannel }) => {
  const [name, setName] = useState("User");
  const [lobbyName, setLobbyName] = useState("");


  let randomRoomName = generateRandomRoomName();

  const newRoomClick = () => {
    console.log(props)
    props.socket.createRoom(randomRoomName).then((e) => console.log(e));
  }

  return (
    <div id={"home-wrapper"}>
      <h1 className={"title"}>Riffr <i className={"fa fa-music"}/></h1>
      <TextInput id={"name-input"} placeholder={"Enter name"} parentCallback={setName}/>
      <div className={"lobby-container"} id={"join-lobby"}>
        <TextInput id={"lobby-input"} placeholder={"Enter lobby name"} parentCallback={setLobbyName}/>
        <Link to={`/lobby/${lobbyName}/${name}`}>
          <button className={"circle-button blue white-text"} id={"join-button"}>
            <i className={"fa fa-send"}/>
          </button>
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

//Just some random algorithm
const generateRandomRoomName = () => {
  let words = ["cat", "dog", "hammer", "jack", "tape", "driver", "word", "can", "wheel"];
  return words[Math.floor(Math.random() * words.length)] + "-" + words[Math.floor(Math.random() * words.length)] + "-" + words[Math.floor(Math.random() * words.length)];
}

const TextInput = (props: { id: string, placeholder: string, parentCallback: (arg0: string) => void }) => {
  return (
    <input type={"textField"} id={props.id} className={"text-input"} placeholder={props.placeholder} onChange={(e) => {
      props.parentCallback(e.target.value);
    }}/>
  );
}

export default Home;