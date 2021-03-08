import React, {lazy, Suspense, useEffect, useState} from 'react';
import {BrowserRouter as Router, Route, Switch, useRouteMatch} from "react-router-dom";
import Home from "./Home";
import Lobby from "./Lobby";
import Room from "./Room";

import {Socket} from "./connections/Socket";
import { Riffr } from './Riffr';

const Loading = () => (
    <p>"Loading..."</p>
)



const App = () => {
    // const socket = new Socket("127.0.0.1:10000");

    return (
        <Router>
            <div className="App">
                <Route exact path="/" component={Home}/>
                <Route path="/riffr" render={(props) => 
                    <Riffr {...props} />
                }/>
            </div>
        </Router>
    );
}

export default App;


