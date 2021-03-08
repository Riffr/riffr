import { Room, RoomEmitter } from "./Room";
import { Socket } from "./Socket";

import { 
    ChatUser as User,
    UserProps,

    Message, ChatEvent 
} from '@riffr/backend';

import EventEmitter from "events";
import StrictEventEmitter from "strict-event-emitter-types"

interface ChatEvents {
    message: (client: ChatClient, message: Message) => void;
}
type ChatEmitter = {new (): StrictEventEmitter<EventEmitter, ChatEvents>};

class ChatClient extends (EventEmitter as ChatEmitter) {

    private readonly socket: Socket;

    public readonly user: User;
    public readonly room: Room<UserProps>;

    static async createRoom(roomId: string, userProps: UserProps) {
        console.log(`Creating Room... ChatClient`);
        
        const signalSocket = new Socket(`${process.env.REACT_APP_BACKEND_IP}:${process.env.REACT_APP_BACKEND_PORT}/chat`);

        const { room, user } = await Room.createRoom<UserProps>(signalSocket, roomId, userProps);
        return new ChatClient(signalSocket, user, room);
    }

    static async joinRoom( roomId: string, userProps: UserProps) {
        console.log(`Joining Room... JoinRoom`);
        
        
        const signalSocket = new Socket(`${process.env.REACT_APP_BACKEND_IP}:${process.env.REACT_APP_BACKEND_PORT}/chat`);

        const { room, user } = await Room.joinRoom<UserProps>(signalSocket, roomId, userProps);
        return new ChatClient(signalSocket, user, room);
    }

    private constructor(socket: Socket, user: User, room: Room<UserProps>) {
        super();

        this.socket = socket;
        this.user = user;
        this.room = room;

        this.socket.on(ChatEvent.Message, (message: Message) => {
            this.emit("message", this, message);
        })
    }

    public send(content: string) {
        this.socket.emit(ChatEvent.Message, content);
    }

    public leave() {
        this.room.leave();
    }

}

export {
    ChatClient,
}
export type {
    ChatEmitter,
    ChatEvents,
}