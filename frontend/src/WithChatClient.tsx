import { UserProps } from "@riffr/backend/dist";
import React, { useEffect, useState } from "react";
import { RouteComponentProps } from "react-router";

import { ChatClient } from "./connections/ChatClient";
import { Socket } from "./connections/Socket";
import { ErrorBoundary } from "./ErrorBoundary";
import { IsPendingError, Resource, resource } from "./resource";
import { withResource } from "./WithResource";
import Loading from "./Loading";
import ErrorMessage from "./ErrorMessage";


interface WithChatClientLocationState {
    roomId: string,
    username: string,
    create: boolean
};
interface WithChatClientProps extends RouteComponentProps<{}, {}, WithChatClientLocationState> {
    socket: Socket
};

type ChatClientProps<P> = P &  WithChatClientLocationState & { socket: Socket, chatClient: ChatClient };


const withChatClient = <P extends any>(
    Component: React.FC<ChatClientProps<P>>
): React.FC<P & WithChatClientProps> =>
    (props) => {
        if (!props.location.state) return <p>Location Error</p>;

        const { socket } = props;
        const { roomId, username, create } = props.location.state;
        const userProps : UserProps = { username };

        // useEffect(() => {
        //     // This effect deals with setting create to false on reload => if create is true 
        //     // then the client attempts to re-create the room, resulting in an error
        //     // This prevents that :)
        //     const cleanup = () => {
        //         props.history.replace(
        //             props.location.pathname,
        //             { ...props.location.state, create: false }
        //         );
        //     };

        //     window.addEventListener('beforeunload', cleanup);
        //     return () => {
        //         window.removeEventListener('beforeunload', cleanup);
        //     }
        // }, [props.history, props.location]);

        
        const [chatClientResource, setChatClientResource] = useState<Resource<ChatClient> | undefined>(undefined);

        useEffect(() => {
            console.log('Creating chatClientPromise');

            const chatClientPromise = create
                ? ChatClient.createRoom(socket, roomId, userProps)
                : ChatClient.joinRoom(socket, roomId, userProps);

            setChatClientResource(resource(chatClientPromise));

            return () => {
                chatClientPromise.then(client => client.leave());
            }
        }, []);


        const Wrapped = withResource<ChatClient, P>(props => {
            console.log(`Reading chatClientResource...`);
            const chatClient = props.resource.read();
            if (!chatClient) throw new Error(`Chat Client is undefined!`);

            return <Component {...props} { ...{roomId, username, create} } chatClient={chatClient} socket={socket} />
        });

        if (chatClientResource == undefined) return <p>Loading resource...</p>;

        return <ErrorBoundary fallback={<ErrorMessage />}>
            <Wrapped {...props} fallback={<Loading />} resource={chatClientResource} />
        </ErrorBoundary>
    };

export {
    withChatClient,
};
export type {
    WithChatClientProps,
    WithChatClientLocationState,
    ChatClientProps,
};