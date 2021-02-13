
import { Socket } from './Socket';

import { SignallingEvent } from '@riffr/backend';

// TODO: Define a type for Message (and it's handlers)
type onMessageHandler = (message: any) => void;
class Room {

    // Factory methods
    static async createRoom(socket: Socket, name: string) {
        // Error handling? Promise may be rejected
        await socket.request(SignallingEvent.CreateRoom, name);
        return new Room(socket, name);
    }

    static async joinRoom(socket: Socket, name: string) {
        await socket.request(SignallingEvent.JoinRoom, name);
        return new Room(socket, name);
    }

    public name: string;
    private socket: Socket;
    public members: Array<string> = new Array();
    // Room class allows handling of room metadata
    // e.g. Room members, etc

    private constructor(socket: Socket, name: string) {
        this.socket = socket;
        this.name = name;

        socket.on(SignallingEvent.AddClientToRoom, (id: string) => {
            this.members.push(id);
        });

        socket.on(SignallingEvent.RemoveClientFromRoom, (id: string) => {
            // Locking? This will lead to a race condition...
            this.members = this.members.filter(x => x !== id);
        });

    }

    public async leave() {
        const name = this.name;
        await this.socket.request(SignallingEvent.LeaveRoom, name);    
    }

    public sendMessage(message: any) {
        this.socket.emit(SignallingEvent.Message, message);
    }

}

class SignallingChannel {

    private readonly onMessageHandlers: Array<onMessageHandler> = new Array();
    private socket: Socket;
    private room?: Room = undefined;

    constructor(uri: string) {
        this.socket = new Socket(`${ uri }/signalling`);
    
        this.socket.on(SignallingEvent.Message, (message: any) => {
            this.onMessageHandlers.forEach(handler => handler(message));
        });
    }

    public async createRoom(name: string) {
        this.room = await Room.createRoom(this.socket, name);
    }

    public async joinRoom(name: string) {
        if (this.room !== undefined) this.room.leave();    
        this.room = await Room.joinRoom(this.socket, name);
    }

    public async leaveRoom(name: string) {
        await this.socket.request(SignallingEvent.LeaveRoom, name);    
    }    

    public sendMessage(message: any) {
        this.room?.sendMessage(message);
    }

    public addMessageHandler(handler: onMessageHandler) {
        this.onMessageHandlers.push(handler);
    }

}

export {
    SignallingChannel,
};
