import React from 'react';
import logo from './logo.svg';
import './App.css';

import io from 'socket.io-client';

import { Button } from './Button';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
      <div>
        <Button text={"Test"} onClick={() => connect()}/>
      </div>
    </div>
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
