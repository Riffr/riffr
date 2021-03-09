import React, {useEffect, useState} from 'react';
import {BrowserRouter as Router, Route} from "react-router-dom";
import Home from "./Home";
import Lobby from "./Lobby";
import Room from "./Room";

import {Socket} from "./connections/Socket";
import {User} from "@riffr/backend";
import { ChatClient } from './connections/ChatClient';

const App = () => {
    const socket = new Socket("https://ec2-52-17-80-252.eu-west-1.compute.amazonaws.com:443", {secure: true});
    const [create, setCreate] = useState(false);
    const [chatClient, setChatClient] = useState<ChatClient|undefined>(undefined);

    return (
        <Router>
            <div className="App">
                <Route path="/" exact render={() => <Home socket={socket} setCreate={setCreate}/>}/>
                <Route path="/lobby/:code/:name" render={({match}) => (
                    <Lobby
                        roomCode={match.params.code}
                        name={match.params.name}
                        socket={socket}
                        create={create}
                        // Chat Client state
                        chatClient={chatClient}
                        setChatClient={setChatClient}
                    />
                )}/>
                <Route path="/room/:code/:name" render={({match}) => (
                    <Room
                        roomCode={match.params.code}
                        name={match.params.name}
                        socket={socket}
                        create={create}

                        // Chat Client state
                        chatClient={chatClient}
                    />
                )}/>
            </div>
        </Router>
    );
}

export default App;
