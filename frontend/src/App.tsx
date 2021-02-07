import React from 'react';
import './App.css';

function App() {
  return (

    <div className="App">

      <div id={"main"}>
        <h1>Riffr <i className={"fa fa-music"}/></h1>
        {/*<p>Enter name to start jamming</p>*/}
        <input type={"textField"} id={"nameInput"} placeholder={"Enter name to get started"}/>
        <div className={"lobbyContainer"} id={"joinLobby"}>
          <h2>Join Lobby</h2>
          <input type={"textField"} id={"lobbyInput"} placeholder={"Enter lobby name"}/>
          <button className={"homeButton"} id={"joinButton"}>
            <i className={"fa fa-send"}/>
          </button>
        </div>
        <div className={"lobbyContainer"} id={"createLobby"}>
          <h2>Create Lobby</h2>
          <button className={"homeButton"} id={"createButton"}>
            Create
            <i className={"fa fa-rocket"}/>
          </button>
          <p></p>
        </div>
      </div>
      <div id={"darkmode"}>
        <input type={"checkBox"} id={"darkmodeSwitch"}/>
      </div>

    </div>
  );
}

export default App;
