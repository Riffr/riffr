import React, {useEffect} from 'react';
import {BrowserRouter as Router, Route} from "react-router-dom";
import Home from "./Home";
import Lobby from "./Lobby";
import Room from "./Room";

import { SignallingChannel } from './connections/SignallingChannel';
import Audio from "./audio/Audio";

const App = () => {
  let socket: SignallingChannel;
  socket = new SignallingChannel("127.0.0.1:10000");

  return (
    <Router>
      <div className="App">
        <Route path="/" exact render={() => <Home socket={socket}/>}/>
        <Route path="/lobby/:code/:name" render={({match}) => (
            <Lobby
                roomCode={match.params.code}
                name={match.params.name}
                socket={socket}
            />
        )}/>
        <Route path="/room/:code/:name" render={({match}) => (
            <Room
                roomCode={match.params.code}
                name={match.params.name}
                socket={socket}
            />
        )}/>
      </div>
    </Router>
  );
}

export default App;
