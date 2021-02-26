
import { Socket } from './Socket';

import { RoomEvent } from '@riffr/backend';

import EventEmitter from "events";
import StrictEventEmitter from "strict-event-emitter-types"



interface RoomEvents<T> {
    membersUpdated : (room: Room<T>) => void
};
type RoomEmitter<T> = {new (): StrictEventEmitter<EventEmitter, RoomEvents<T>>};

// TODO: FIGURE OUT A HACK TO REFERENCE TYPE PARAM T IN ROOMEMITTER<T> (current MS Typescript Issue open: ...)
class Room<T> extends EventEmitter {

    // Factory methods
    static async createRoom<T>(socket: Socket, id: string, user: T) {
        
        const room = new Room<T>(socket, id);
        await room.create(user);
        
        return room;
    }

    static async joinRoom<T>(socket: Socket, id: string, user: T) {

        const room = new Room<T>(socket, id);
        await room.join(user);
        
        return room;
    }


    private async create(user: T) {
        const { members } = await this.socket.request(RoomEvent.Create, this.id, user);
        this.members = members;
    }
    
    private async join(user: T) {
        const { members } = await this.socket.request(RoomEvent.Join, this.id, user);
        this.members = members;
    }


    private socket: Socket;
    
    public id: string;
    public members: Array<T> = new Array();
    // Room class allows handling of room metadata
    // e.g. Room members, etc

    private constructor(socket: Socket, id: string) {
        super();

        this.socket = socket;
        this.id = id;


        this.socket.on(RoomEvent.AddUser, (user: T) => {
            this.members.push(user);
            this.emit("membersUpdated", this);
        });

        this.socket.on(RoomEvent.RemoveUser, (user: T) => {
            // Locking? This will lead to a race condition...
            this.members = this.members.filter(x => x !== user);
            this.emit("membersUpdated", this);
        });
    }


    public async leave() {
        await this.socket.request(RoomEvent.Leave);
    }

}


export {
    Room,
    RoomEvent,
};

export type {
    RoomEmitter,
};
