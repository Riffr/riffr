import { Socket } from "dgram";
import { RouteComponentProps } from "react-router";
import { Route, Switch } from "react-router-dom";
import Lobby from "./Lobby";
import Room from "./Room";
import { withChatClient } from "./WithChatClient";


interface RiffrProps extends RouteComponentProps {

}



const Riffr = withChatClient<RiffrProps>(props => {
    const { chatClient, socket, create } = props; 
    const { path } = props.match;

    console.log(`Create: ${create}`);

    return (<Switch>
        <Route 
            path={`${path}/lobby`} 
            render={(props) => <Lobby {...props} chatClient={chatClient} create={create}/>}
        />
        <Route 
            path={`${path}/room`} 
            render={(props) => <Room {...props} socket={socket} chatClient={chatClient} create={create}/>}
        />
    </Switch>);

});

export {
    Riffr
}
