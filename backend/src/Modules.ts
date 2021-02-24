import { Context, error, Module, Store, success } from "./Server";

enum Event {
    CreateRoom              = "create_room",
    JoinRoom                = "join_room",
    LeaveRoom               = "leave_room",

    AddClientToRoom         = "add_client_to_room",
    RemoveClientFromRoom    = "remove_client_from_room",
 
    Message                 = "message"
}

class Room {

    public name : string;
    public members: Map<string, UserProps> = new Map();

    constructor(name: string) {
        this.name = name;
    }

    public join(ctx: Context, props: UserProps) {
        leave(ctx);
        ctx.socket.join(this.name);
    
        Store.of<State>(ctx).local.room = this;
        this.members.set(ctx.socket.id, props);


        console.log("[join] Emitting AddClientToRoom")
        ctx.socket.to(this.name).broadcast.emit(Event.AddClientToRoom, props);
        

        console.log(this.members);
    }


    public broadcast(ctx: Context, message: any) {
        ctx.socket.to(this.name).broadcast.emit(Event.Message, message);
    }

    public leave(ctx: Context) {
        ctx.socket.leave(this.name);

        ctx.socket.to(this.name).broadcast.emit(Event.RemoveClientFromRoom, this.members.get(ctx.socket.id)!);
        this.members.delete(ctx.socket.id);
    }

    public size() {
        return this.members.keys.length;
    }

}

const join = (ctx: Context, config: RoomPayload) => {
    leave(ctx);
    const { name, props } = config;

    const rooms = Store.of<State>(ctx).global.rooms;

    if (!rooms.has(name)) rooms.set(name, new Room(name));
    const room = rooms.get(name)!;

    room.join(ctx, props);
    return room;
};

const leave = (ctx: Context) => {
    const room = Store.of<State>(ctx).local.room;
    if (room) room.leave(ctx);
};



type UserProps = string;
type Payload = RoomPayload
interface RoomPayload {
    name: string;
    props: UserProps;
};


// Module State
interface State {
    global: {
        rooms: Map<string, Room>;
    };
    local: {
        props?: UserProps;
        room?: Room;
    };
}
class State implements State {
    // Static ensures global state :)
    static global = {
        rooms: new Map(),
    };

    public local: {
        props?: UserProps;
        room?: Room;
    };

    constructor() {
        this.local = { 
            props: undefined,
            room: undefined,
        };
    }
}

const make = (namespace: string) => {

    const mod = new Module(namespace)
    mod.use(Store.middleware(State));

    
    mod.on(Event.CreateRoom, (ctx: Context, config: RoomPayload, callback: any) => {
        const { name } = config;
        console.log(`[${namespace}][onCreateRoom] Client requesting to create room: ${ JSON.stringify(name) }`);
        const room = Store.of<State>(ctx).global.rooms.get(name);
    
        if (room && room.size() > 0) {
            callback(error(`Room ${ name } taken`));
        } else {
            console.log(`[${namespace}][onCreateRoom] Creating and joining the room ${ name }`);
            const joinedRoom = join(ctx, config);
            
            console.log(`[${namespace}][onCreateRoom] room: ${ JSON.stringify(room) }`);
    
            callback(success({
                members: [...joinedRoom.members.values()]
            }));
        }
    });
    
    
    mod.on(Event.JoinRoom, (ctx: Context, config: RoomPayload, callback: any) => {
        console.log(`[${namespace}][onJoinRoom] Client requesting to join room: ${ config.name }`);
        const room = join(ctx, config);
    
        console.log(`[${namespace}][onJoinRoom] room: ${ JSON.stringify(room) }`);
        callback(success({ 
            members: [...room.members.values()]
        }));
    });
    
    mod.on(Event.LeaveRoom, (ctx: Context, callback: any) => {
        console.log(`[${namespace}][onLeaveRoom] Client requesting to leave room`);
    
        leave(ctx);
        callback(success(`Left room ${ Store.of<State>(ctx).local.room?.name }`));
    });
    
    mod.on(Event.Message, (ctx: Context, message: any) => {
        console.log(`[${namespace}][onMessage] Client sending message: ${ JSON.stringify(message) }`);
    
        const room = Store.of<State>(ctx).local.room;
        if (room) room.broadcast(ctx, message);
    });
    
    return mod;
};


const signallingModule = make("/signalling");
const chatModule = make("/chat");

export {
    signallingModule,
    chatModule,
    Event
};

export type {
    UserProps,
    RoomPayload as RoomConfig,
};
