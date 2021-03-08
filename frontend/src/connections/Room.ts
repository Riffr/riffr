import {Socket} from './Socket';

import {RoomEvent, User} from '@riffr/backend';

import EventEmitter from "events";
import StrictEventEmitter from "strict-event-emitter-types"


interface RoomEvents<T> {
    membersUpdated: (room: Room<T>) => void
}
type RoomEmitter<T> = { new(): StrictEventEmitter<EventEmitter, RoomEvents<T>> };

// TODO: FIGURE OUT A HACK TO REFERENCE TYPE PARAM T IN ROOMEMITTER<T> (current MS Typescript Issue open: ...)
class Room<T> extends EventEmitter {

    // Factory methods
    static async createRoom<T>(socket: Socket, id: string, userProps: T) {
        console.log(`Creating Room... Room`);
        const { user, members } = await socket.request(RoomEvent.Create, id, userProps);
        const room = new Room<T>(socket, id, members);

        return { room, user };
    }

    static async joinRoom<T>(socket: Socket, id: string, userProps: T) {
        const { user, members } = await socket.request(RoomEvent.Join, id, userProps);
        const room = new Room<T>(socket, id, members);

        return { room, user };
    }


    private socket: Socket;

    public id: string;
    public readonly members: Map<string, T> = new Map();
    // Room class allows handling of room metadata
    // e.g. Room members, etc

    private constructor(socket: Socket, id: string, members: Array<User<T>>) {
        super();

        this.socket = socket;
        this.id = id;

        members.forEach(user => this.members.set(user.id, user));

        this.socket.on(RoomEvent.AddUser, (user: User<T>) => {
            this.members.set(user.id, user);
            this.emit("membersUpdated", this);
        });

        this.socket.on(RoomEvent.RemoveUser, (user: User<T>) => {
            this.members.delete(user.id);
            this.emit("membersUpdated", this);
        });
    }

    public async leave() {
        this.socket.emit(RoomEvent.Leave);
    }
}

export {
    Room,
    RoomEvent,
};

export type {
    RoomEmitter,
};
