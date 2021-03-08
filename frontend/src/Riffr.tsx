import { UserProps } from "@riffr/backend/dist";
import { Socket } from "dgram";
import { RouteComponentProps } from "react-router";
import { withResource } from "./WithResource";

interface RiffrLocationState {
    roomId: string,
    username: string,
    create: boolean
};

interface RiffrProps extends RouteComponentProps<{}, {}, RiffrLocationState> {
    socket: Socket;
};


const Loading = () => (
    <p>"Loading..."</p>
)

const Riffr = (props: RiffrProps) => {
    const { socket } = props;
    const { roomId, username, create } = props.location.state;
    const userProps : UserProps = { username };


    const resource = chatClientResource(create, socket, roomId, userProps);

    const 

    return (<WithResource 
                resource={resource}
                fallback={<Loading />} 
                component={{props} => <WithChatClient {...props} />}
            />);

    // withChatClient(props => {
    //     const path = props.match.path;
    //     const chatClient = props.chatClient;
    
    //     return <Switch>
    //         <Route 
    //             path={`${path}/lobby`} 
    //             render={(props) => <Lobby {...props} chatClient={chatClient}/>}
    //         />
    //         <Route 
    //             path={`${path}/room`} 
    //             render={(props) => <Lobby {...props} chatClient={chatClient}/>}
    //         />
    //     </Switch>
    // })
}

export {
    Riffr
}
