import React from 'react';
import {BrowserRouter as Router, Route} from "react-router-dom";
import Home from "./Home";
import Lobby from "./Lobby";

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

export default App;
