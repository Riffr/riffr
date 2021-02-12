import React from 'react';
import {BrowserRouter as Router, Route} from "react-router-dom";
import Home from "./Home";
import Lobby from "./Lobby";
import io from 'socket.io-client';

const App = () => {
  const signallingSocket = io("http://127.0.0.1:10000/signalling");

  console.log(`connection ${ signallingSocket }`);


  return (
    <Router>
      <div className="App">
        <Route path="/" exact render={() => <Home socket={signallingSocket}/>}/>
        <Route path="/lobby/:name" render={({match}) => (
          <Lobby
            name={match.params.name}
          />
        )}/>
      </div>
    </Router>
  );
}

export default App;
