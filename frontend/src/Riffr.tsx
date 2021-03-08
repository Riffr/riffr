import { RouteComponentProps } from "react-router";
import { Route, Switch } from "react-router-dom";
import Lobby from "./Lobby";
import { withChatClient } from "./WithChatClient";


interface RiffrProps extends RouteComponentProps {}



const Riffr = withChatClient<RiffrProps>(props => {
    const { chatClient } = props; 
    const { path } = props.match;

    console.log('Riffr Mounted');

    return (<Switch>
        <Route 
            path={`${path}/lobby`} 
            render={(props) => <Lobby {...props} chatClient={chatClient}/>}
        />
    </Switch>);

});

export {
    Riffr
}
