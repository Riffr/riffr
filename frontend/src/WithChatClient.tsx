import { UserProps } from "@riffr/backend/dist";
import React, { useEffect } from "react";
import { RouteComponentProps } from "react-router";

import { ChatClient } from "./connections/ChatClient";
import { Socket } from "./connections/Socket";
import { ErrorBoundary } from "./ErrorBoundary";
import { IsPendingError, Resource, resource } from "./resource";
import { withResource } from "./WithResource";


interface WithChatClientLocationState {
    roomId: string,
    username: string,
    create: boolean
};

// type ChatClientResource = Resource<ChatClient>;
// interface WithChatClientProps extends RouteComponentProps<{}, {}, WithChatClientLocationState> {
//     socket: Socket;
// };

// interface ChatClientProps extends WithChatClientProps {
//     chatClient: ChatClient;
// };



// const chatClientResource = (socket, roomId, userProps) => {
//     return resource(
//         create
//     ? ChatClient.createRoom(socket, roomId, userProps)
//     : ChatClient.joinRoom(socket, roomId, userProps)
//     )

interface WithChatClientProps extends RouteComponentProps<{}, {}, WithChatClientLocationState> {
};
type ChatClientProps<P> = P & { chatClient: ChatClient };


const withChatClient = <P extends any>(
    Component: React.FC<ChatClientProps<P>>
): React.FC<P & WithChatClientProps> =>
    (props) => {
        const { roomId, username, create } = props.location.state;
        const userProps : UserProps = { username };

        console.log('Creating chatClientPromise');

        const chatClientPromise = create
            ? ChatClient.createRoom(roomId, userProps)
            : ChatClient.joinRoom(roomId, userProps);

        const chatClientResource = resource(chatClientPromise);

        const Wrapped = withResource<ChatClient, P>(props => {
            console.log(`Reading chatClientResource...`);
            const chatClient = props.resource.read();
            if (!chatClient) throw new Error(`Chat Client is undefined!`);

            useEffect(() => 
                () => chatClient?.leave(), 
            [chatClient]);

            return <Component {...props} chatClient={chatClient} />
        });

        return <ErrorBoundary fallback={<p>ChatClientError</p>}>
            <Wrapped {...props} fallback={<p>Loading...</p>} resource={chatClientResource} />        
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