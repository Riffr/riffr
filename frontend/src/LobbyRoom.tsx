import { UserProps } from "@riffr/backend/dist";
import { useEffect } from "react";
import { RouteComponentProps } from "react-router";

import { ChatClient } from "./connections/ChatClient";
import { Socket } from "./connections/Socket";

interface LobbyRoomParams {
    code: string,
    name: string
};

interface LobbyRoomProps extends RouteComponentProps<LobbyRoomParams> {};

const LobbyRoom = async (props: LobbyRoomProps) => {
    const { roomId, username } = props.match.params;
    const { create } = { create: true };

    const socket = new Socket("127.0.0.1:10000");
    const userProps : UserProps = { username };


    try {
        const chatClient = await (create
            ? ChatClient.createRoom(socket, roomId, userProps)
            : ChatClient.joinRoom(socket, roomId, userProps));
    } catch (err) {
        // return ERROR COMPONENT OR 
    }

    useEffect(() => {
        return () => {
            ChatClient.leave()
        }
    }, [])



    return ();

};