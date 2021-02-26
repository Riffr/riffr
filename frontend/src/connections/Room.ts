
import { Socket } from './Socket';

import { RoomEvent } from '@riffr/backend/modules/Room';
import { ChatEvent, User, Message } from '@riffr/backend/modules/Chat';

import EventEmitter from "events";
import StrictEventEmitter from "strict-event-emitter-types"

interface RoomEvents {
    membersUpdated : (room: Room) => void;
    message        : (room: Room, message: any) => void;
};
type RoomEmitter = {new (): StrictEventEmitter<EventEmitter, RoomEvents>};

class Room extends (EventEmitter as RoomEmitter) {

    // Factory methods
    static async createRoom(socket: Socket, name: string, user: User) {
        
        const room = new Room(socket, name);
        await room.create(user);
        
        return room;
    }

    static async joinRoom(socket: Socket, name: string, user: User) {

        const room = new Room(socket, name);
        await room.join(user);
        
        return room;
    }


    private async create(props: User) {
        const { members } = await this.socket.request(RoomEvent.CreateRoom, this.name, props);
        this.members = members;
    }
    
    private async join(props: User) {
        const { members } = await this.socket.request(RoomEvent.JoinRoom, this.name, props);
        this.members = members;
    }


    private socket: Socket;
    
    public name: string;
    public members: Array<User> = new Array();
    // Room class allows handling of room metadata
    // e.g. Room members, etc

    private constructor(socket: Socket, name: string) {
        super();

        this.socket = socket;
        this.name = name;

        this.socket.on(ChatEvent.Message, (message: any) => {
            this.emit("message", this, message);
        })

        this.socket.on(RoomEvent.AddUser, (user: User) => {
            this.members.push(user);
            this.emit("membersUpdated", this);
        });

        this.socket.on(RoomEvent.RemoveUser, (user: User) => {
            // Locking? This will lead to a race condition...
            this.members = this.members.filter(x => x !== user);
            this.emit("membersUpdated", this);
        });
    }


    public async leave() {
        await this.socket.request(RoomEvent.Leave);
    }

    public send(message: Message) {
        this.socket.emit(ChatEvent.Message, message);
    }

}


// interface ClientEvents {
//     message: (message: any) => void;
// };
// type ClientEmitter = {new (): StrictEventEmitter<EventEmitter, ClientEvents>};

// class Client extends (EventEmitter as ClientEmitter) {


//     private socket: Socket;
//     public room: Room;

//     public createRoom(config: Config, roomConfig: RoomConfig) {

//     }

//     private constructor({ uri, namespace, roomConfig}: Config) {
//         super();
//         this.socket = new Socket(`${ uri }/${ namespace }`);
//         room = Room

//         this.socket.on(Event.Message, (message: any) => {
//             this.emit("message", message);
//         });
//     }



//     public async createRoom(name: string, props: UserProps) {
//         if (this.room !== undefined) await this.room.leave();
//         this.room = await Room.createRoom(this.socket, name, props);
//     }

//     public async joinRoom(name: string, props: UserProps) {
//         if (this.room !== undefined) await this.room.leave();
//         this.room = await Room.joinRoom(this.socket, name, props);
//     }

//     public async leaveRoom() {
//         if (this.room === undefined) return;
//         await this.room.leave();
//     }    

//     public send(message: any) {
//         this.room.send(message);
//     }

//     public addMessageHandler(handler: onMessageHandler) {
//         this.onMessageHandlers.push(handler);
//     }

//     //We should probably allow removing individual handlers, but meh
//     public clearMessageHandlers(){
//         this.onMessageHandlers = this.onMessageHandlers.filter(x => false);
//     }

// }

export {
    Room,
};
