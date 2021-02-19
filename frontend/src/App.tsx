import React, {useEffect} from 'react';
import {BrowserRouter as Router, Route} from "react-router-dom";
import Home from "./Home";
import Lobby from "./Lobby";

import { SignallingChannel } from './connections/SignallingChannel';
import { Button } from './Button';

const App = () => {
  const signal = new SignallingChannel("127.0.0.1:10000");

  return (
    <Router>
      <div className="App">
        <Route path="/" exact render={() => <Home signal={signal}/>}/>
        <Route path="/lobby/:code/:name" render={({match}) => (
          <Lobby
            roomCode={match.params.code}
            name={match.params.name}
            signal={signal}
          />
        )}/>
      </div>
    </Router>
  );
}

export default App;
