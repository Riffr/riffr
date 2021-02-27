import React, {useEffect, useState} from 'react';
import {BrowserRouter as Router, Route} from "react-router-dom";
import Home from "./Home";
import Lobby from "./Lobby";
import Room from "./Room";

import {Socket} from "./connections/Socket";
import {User} from "@riffr/backend";

class BasicUser implements User {
    id: string;

    constructor(id: string) {
        this.id = id;
    }
}

const App = () => {
    const socket = new Socket("127.0.0.1:10000");
    const [create, setCreate] = useState(false);
    const [user, setUser] = useState<User>(new BasicUser(""));

    // let [chatClient, setChatClient] = useState<ChatClient|undefined>(undefined);


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
                        setUser={setUser}
                    />
                )}/>
                <Route path="/room/:code/:name" render={({match}) => (
                    <Room
                        roomCode={match.params.code}
                        name={match.params.name}
                        user={user}
                        socket={socket}
                        create={create}
                    />
                )}/>
            </div>
        </Router>
    );
}

export default App;
