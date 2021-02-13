import React from 'react';
import logo from './logo.svg';
import './App.css';

import io from 'socket.io-client';

import { SignallingChannel } from './connections/SignallingChannel';

import { Button } from './Button';



function App() {
  var channel : SignallingChannel = new SignallingChannel("http://127.0.0.1:10000");

  channel.addMessageHandler((message: any) => {
    console.log(`[MESSAGE] ${ JSON.stringify(message) }`);
  });


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
        <Button text={"Join"} onClick={() => channel.joinRoom("Test Room")}/>
        <Button text={"Create Room"} onClick={() => channel.createRoom("Test Room")}/>
       
        <Button text={"Send Message"} onClick={() => channel.sendMessage("Hello World")}/>
        <Button text={"Old"} onClick={() => join()}/>
        
      </div>
    </div>
  );
}

const join = async () => {


  const signallingSocket = io("http://127.0.0.1:10000/signalling");

  console.log(`connection ${ signallingSocket }`);

  signallingSocket.emit('signalling:create_room', "test-room", ({name, status} : {name : string, status: string}) => {
    console.log(`[callback] ${ name } ${ status }`);
    signallingSocket.emit('signalling:message', "Hello World!", (res:any) => {
      console.log(`[message callback] Was expecting nothing, got ${ res }`);
    });
  });

};



export default App;
