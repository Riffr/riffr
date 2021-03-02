import {
    User,
    Mesh as M,
    SignalEvent,
} from '@riffr/backend';

import EventEmitter from "events";
import StrictEventEmitter from "strict-event-emitter-types";

import { Room } from './Room';
import { Socket } from './Socket';


interface SignallingChannelEvents {
    signal: (channel: SignallingChannel, payload: M.MeshPayload) => void;
}
type SignallingChannelEmitter = {new (): StrictEventEmitter<EventEmitter, SignallingChannelEvents>};

class SignallingChannel extends (EventEmitter as SignallingChannelEmitter) {

    private socket: Socket;

    public user: User;
    public room: Room<User>;

    static async createRoom(socket: Socket, roomId: string, user: User) {
        const signalSocket = new Socket(`${socket.uri}/signalling`);
        const room = await Room.createRoom<User>(signalSocket, roomId, user);
        return new SignallingChannel(signalSocket, user, room);
    }

    static async joinRoom(socket: Socket, roomId: string, user: User) {
        const signalSocket = new Socket(`${socket.uri}/signalling`);
        const room = await Room.joinRoom<User>(signalSocket, roomId, user);
        return new SignallingChannel(signalSocket, user, room);
    }

    private constructor(socket: Socket, user: User, room: Room<User>) {
        super();

        this.socket = socket;
        this.user = user;
        this.room = room;

        this.socket.on(SignalEvent.Signal, (payload: M.MeshPayload) => {
            this.emit("signal", this, payload);
        })
    }

    public signal(payload: M.SignalPayload) {
        this.socket.emit(SignalEvent.Signal, payload);
    }

    public async leave() {
        await this.room.leave();
    }

}

export {
    SignallingChannel,
}