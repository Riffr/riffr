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
    socket: Socket;
};
type ChatClientProps<P> = P & { socket: Socket, chatClient: ChatClient };


const withChatClient = <P extends any>(
    Component: React.FC<ChatClientProps<P>>
): React.FC<P & WithChatClientProps> =>
    (props) => {
        const { socket } = props;
        const { roomId, username, create } = props.location.state;
        const userProps : UserProps = { username };

        const chatClientResource = resource(
            create
            ? ChatClient.createRoom(socket, roomId, userProps)
            : ChatClient.joinRoom(socket, roomId, userProps)
        );

        return <ErrorBoundary fallback={<p>ChatClientError</p>}>
            {withResource<ChatClient, P>(props => {
                const chatClient = props.resource.read();
                if (!chatClient) throw new Error(`Chat Client is undefined!`);

                useEffect(() => 
                    () => chatClient?.leave(), 
                [chatClient]);

                return <Component {...props} socket={socket} chatClient={chatClient} />
            })}        
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