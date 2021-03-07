import {
    ChatUser as User,
    UserProps,

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

    private readonly socket: Socket;

    public readonly user: User;
    public readonly room: Room<UserProps>;

    static async createRoom(socket: Socket, roomId: string, userProps: UserProps) {
        const signalSocket = new Socket(`${socket.uri}/signalling`);

        const { room, user } = await Room.createRoom<UserProps>(signalSocket, roomId, userProps);
        return new SignallingChannel(signalSocket, user, room);
    }

    static async joinRoom(socket: Socket, roomId: string, userProps: UserProps) {
        const signalSocket = new Socket(`${socket.uri}/signalling`);

        const { room, user } = await Room.joinRoom<UserProps>(signalSocket, roomId, userProps);
        return new SignallingChannel(signalSocket, user, room);
    }

    private constructor(socket: Socket, user: User, room: Room<UserProps>) {
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