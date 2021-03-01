import { Room, RoomEmitter } from "./Room";
import { Socket } from "./Socket";

import { Message, User, ChatEvent, chat } from '@riffr/backend';

import EventEmitter from "events";
import StrictEventEmitter from "strict-event-emitter-types"

interface ChatEvents {
    message: (client: ChatClient, message: Message) => void;
}
type ChatEmitter = {new (): StrictEventEmitter<EventEmitter, ChatEvents>};

class ChatClient extends (EventEmitter as ChatEmitter) {

    private socket: Socket;

    public user: User;
    public room: Room<User>;

    static async createRoom(socket: Socket, roomId: string, user: User) {
        const chatSocket = new Socket(`${socket.uri}/chat`);
        const room = await Room.createRoom<User>(chatSocket, roomId, user);
        return new ChatClient(chatSocket, user, room);
    }

    static async joinRoom(socket: Socket, roomId: string, user: User) {
        const chatSocket = new Socket(`${socket.uri}/chat`);
        const room = await Room.joinRoom<User>(chatSocket, roomId, user);
        return new ChatClient(chatSocket, user, room);
    }

    private constructor(socket: Socket, user: User, room: Room<User>) {
        super();

        this.socket = socket;
        this.user = user;
        this.room = room;

        this.socket.on(ChatEvent.Message, (message: Message) => {
            console.log("ChatEvent Message");
            this.emit("message", this, message);
        })
    }

    public send(message: string) {
        console.log("ChatClient send")
        console.log(this.socket);
        this.socket.emit("chat/message", "test");
        this.socket.emit(ChatEvent.Message, { from: this.user, content: message } as Message);
    }

    public async leave() {
        await this.room.leave();
    }

}

export {
    ChatClient,
}
export type {
    ChatEmitter,
    ChatEvents,
}