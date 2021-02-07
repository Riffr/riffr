import React, {RefObject, useRef} from 'react';
import { Link } from 'react-router-dom';
import "./Lobby.css"

const Lobby = (props: { name: string }) => {
  const lobbyCode = "jack-hammer-tape";
  return (
    <div id="main">
      <Link to={"/"}>
        <button className={"homeButton"} id={"homeButton"}>
          <i className={"fa fa-home"}/>
        </button>
      </Link>
      <h1 id={"greetingText"}>Hello, {props.name}</h1>
      <h3 id={"inviteText"}>Invite your friends using the code below</h3>
      <CopyField id={"copyField"} value={lobbyCode}/>
    </div>
  )
}

const CopyField = (props: { id: string, value: string }) => {
  const textFieldRef : RefObject<HTMLInputElement> = useRef(null);
  return (
    <div id={props.id}>
      <input type={"textField"} value={props.value} ref={textFieldRef} readOnly/>
      <button className={"homeButton"} id={"joinButton"} onClick={() => {
        textFieldRef?.current?.select();
        document.execCommand('copy');
      }}>
        <i className={"fa fa-copy"}/>
      </button>
    </div>
  );
}

export default Lobby;