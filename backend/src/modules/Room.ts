import { Socket } from "socket.io";
import { Context, error, Handler, Module, Store, success } from "../Server";

enum RoomEvent {
    Create              = "room/create",
    Join                = "room/join",
    Leave               = "room/leave",

    AddUser             = "room/add_user",
    RemoveUser          = "room/remove_user",
};

class Room<T> {

    public id : string;
    public members: Map<string, T> = new Map();

    constructor(name: string) {
        this.id = name;
    }

    public join(ctx: Context, user: T) {
        leave(ctx);
        ctx.socket.join(this.id);
    
        Store.of<RoomState<T>>(ctx).room = this;
        this.members.set(ctx.socket.id, user);


        console.log("[join] Emitting AddClientToRoom")
        ctx.socket.to(this.id).broadcast.emit(RoomEvent.AddUser, user);
        

        console.log(this.members);
    }

    // public contexts(ctx: Context): Array<Context>  {
    //     return Array.from(this.members.keys())
    //         .map(id => {
    //             const socket = ctx.io.sockets.get(id)!;
    //             return { io: ctx.io, socket}
    //         });
    // } 

    public unicast(ctx: Context, socketId: string, event: string, ...args: any[]) {
        if (!this.members.has(socketId)) return;
        ctx.io.sockets.get(socketId)?.emit(event, ...args);   
    }

    public multicast(ctx: Context, socketIds: Array<string>, event: string, ...args: any[]) {
        socketIds.forEach(id => {
            if (!this.members.has(id)) return;
            ctx.io.sockets.get(id)?.emit(event, ...args);            
        });
    }

    public broadcast(ctx: Context, event: string, ...args: any[]) {
        ctx.socket.to(this.id).broadcast.emit(event, ...args);
    }

    public leave(ctx: Context) {
        ctx.socket.leave(this.id);

        ctx.socket.to(this.id).broadcast.emit(RoomEvent.RemoveUser, this.members.get(ctx.socket.id)!);
        this.members.delete(ctx.socket.id);
    }

    public size() {
        return this.members.keys.length;
    }

}

const join = <T>(ctx: Context, roomId: string, user: T) => {
    leave(ctx);

    const rooms = Store.of<RoomState<T>>(ctx).rooms;

    if (!rooms.has(roomId)) rooms.set(roomId, new Room(roomId));
    const room = rooms.get(roomId)!;

    room.join(ctx, user);
    return room;
};

const leave = <T>(ctx: Context) => {
    const room = Store.of<RoomState<T>>(ctx).room;
    if (room) room.leave(ctx);
};


// Module State
interface RoomState<T> {
    rooms: Map<string, Room<T>>;
    room?: Room<T>;
}
// Some messy typescript hacks :) Sometimes I miss Java :( 
const RoomState = <T>(): ({ new(): RoomState<T> }) => {
    
    class S implements RoomState<T> {
        // Static ensures global state :)
        private static _rooms = new Map<string, Room<T>>();
    
        public rooms = S._rooms;
        public room?: Room<T>;
    }

    return S;
}

const inRoom = <T>(f: (room: Room<T>) => Handler) => {
    return (ctx: Context, ...args: any[]) => {
        const room = Store.of<RoomState<T>>(ctx).room;
        if (!room) return;
        return f(room)(ctx, ...args);
    };
};

const room = <T>(namespace: string, state: { new (): RoomState<T> }) => {

    const mod = new Module(namespace)
    mod.use(Store.middleware(state));

    
    mod.on(RoomEvent.Create, (ctx: Context, roomId: string, localCtx: T, callback: any) => {

        console.log(`[${namespace}][onCreateRoom] Client requesting to create room: ${ JSON.stringify(roomId) }`);
        const room = Store.of<RoomState<T>>(ctx).rooms.get(roomId);
    
        if (room && room.size() > 0) {
            callback(error(`Room ${ roomId } taken`));
        } else {
            console.log(`[${namespace}][onCreateRoom] Creating and joining the room ${ roomId }`);
            const joinedRoom = join(ctx, roomId, localCtx);
            
            console.log(`[${namespace}][onCreateRoom] room: ${ JSON.stringify(room) }`);
    
            callback(success({
                members: [...joinedRoom.members.values()]
            }));
        }
    });
    
    
    mod.on(RoomEvent.Join, (ctx: Context, roomId: string, localCtx: T, callback: any) => {
        console.log(`[${namespace}][onJoinRoom] Client requesting to join room: ${ roomId }`);
        const room = join(ctx, roomId, localCtx);
    
        console.log(`[${namespace}][onJoinRoom] room: ${ JSON.stringify(room) }`);
        callback(success({ 
            members: [...room.members.values()]
        }));
    });
    
    mod.on(RoomEvent.Leave, (ctx: Context, callback: any) => {
        console.log(`[${namespace}][onLeaveRoom] Client requesting to leave room`);
    
        leave(ctx);
        callback(success(`Left room ${ Store.of<RoomState<T>>(ctx).room?.id }`));
    });
    
    
    return mod;
};

export {
    room,
    inRoom, 
    RoomState,
    RoomEvent,
    Room
};


