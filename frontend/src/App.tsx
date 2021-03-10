import React, {lazy, Suspense, useEffect, useState} from 'react';
import {BrowserRouter as Router, Route, Switch, useRouteMatch} from "react-router-dom";
import Home from "./Home";
import Lobby from "./Lobby";
import Room from "./Room";
import Loading from "./Loading";

import {Socket} from "./connections/Socket";
import { Riffr } from './Riffr';


const App = () => {
    const socket = new Socket(`${process.env.REACT_APP_BACKEND_IP}:${process.env.REACT_APP_BACKEND_PORT}`);

    return (
        <Router>
            <div className="App">
                <Route exact path="/" component={Home}/>
                <Route path="/riffr" render={(props) => 
                    <Riffr {...props} socket={socket} />
                }/>
            </div>
        </Router>
    );
}

export default App;


