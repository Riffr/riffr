import { UserProps } from "@riffr/backend/dist";

import { useEffect, useState } from "react";
import { RouteComponentProps } from "react-router-dom";
import { ChatClient } from "./connections/ChatClient";

import { SignallingChannel } from "./connections/SignallingChannel";
import { Socket } from "./connections/Socket";
import { ErrorBoundary } from "./ErrorBoundary";
import { resource, Resource } from "./resource";
import { withResource } from "./WithResource";

import Loading from "./Loading";
import ErrorMessage from "./ErrorMessage";

interface WithSignallingChannelProps {
    socket: Socket;
    chatClient: ChatClient;
    create: boolean
};

type SignallingChannelProps<P> = P & WithSignallingChannelProps & { signallingChannel : SignallingChannel };


const withSignallingChannel = <P extends any>(
    Component: React.FC<SignallingChannelProps<P>>
): React.FC<P & WithSignallingChannelProps> =>
    (props) => {

        const { socket, chatClient, create } = props;
        const userProps : UserProps = { username: chatClient.user.username };

        const [signallingChannelResource, setSignallingChannelResource] = useState<Resource<SignallingChannel> | undefined>(undefined);

        useEffect(() => {

            const signallingChannelPromise = create
                ? SignallingChannel.createRoom(socket, chatClient.room.id, userProps)
                : SignallingChannel.joinRoom(socket, chatClient.room.id, userProps);

            setSignallingChannelResource(resource(signallingChannelPromise));

            return () => {
                signallingChannelPromise.then(channel => channel.leave());
            }
        }, []);


        const Wrapped = withResource<SignallingChannel, P & WithSignallingChannelProps>(props => {
            const signallingChannel = props.resource.read();
            if (!signallingChannel) throw new Error(`Signalling Channel undefined!`);
            
            return <Component {...props} signallingChannel={signallingChannel}/>
        });

        if (signallingChannelResource == undefined) return <p>Loading resource...</p>;

        return <ErrorBoundary fallback={<ErrorMessage />}>
            <Wrapped {...props} fallback={<Loading />} resource={signallingChannelResource} />        
        </ErrorBoundary>
    };

export {
    withSignallingChannel,
};
export type {
    WithSignallingChannelProps,
    SignallingChannelProps,
};