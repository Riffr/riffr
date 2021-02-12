import React from 'react';
import {BrowserRouter as Router, Route} from "react-router-dom";
import Home from "./Home";
import Lobby from "./Lobby";
import io from 'socket.io-client';

const App = () => {
  return (
    <Router>
      <div className="App">
        <Route path="/" exact render={() => <Home/>}/>
        <Route path="/lobby/:name" render={({match}) => (
          <Lobby
            name={match.params.name}
          />
        )}/>
      </div>
    </Router>
  );
}

const connect = () => {
  const signallingSocket = io("http://127.0.0.1:10000/signalling");

  console.log(`connection ${ signallingSocket }`);



  signallingSocket.emit('create_room', { name: "test-room" }, ({name, status} : {name : string, status: string}) => {
    console.log(`[callback] ${ name } ${ status }`);
    signallingSocket.emit('message', { test: "Hello World!"}, (res:any) => {
      console.log(`[message callback] Was expecting nothing, got ${ res }`);
    });
  })
};



export default App;
