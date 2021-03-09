import { Socket } from "socket.io";
import { Context, error, Handler, Module, Store, success } from "../Server";
import { v4 as uuidv4 } from "uuid";

enum RoomEvent {
    Create              = "room/create",
    Join                = "room/join",
    Leave               = "room/leave",

    AddUser             = "room/add_user",
    RemoveUser          = "room/remove_user",
}

////////////////////////////////////////////////////////////////////////////////////////////////
// ERRORS
////////////////////////////////////////////////////////////////////////////////////////////////


enum RoomErrorType {
    RoomExists = "room_exists",
    RoomNotExists = "room_not_exists",
    Unknown = "unknown"
}

interface RoomExistsError {
    type: RoomErrorType.RoomExists, 
    roomId: string
}
interface RoomNotExistsError {
    type: RoomErrorType.RoomNotExists,
    roomId: string
}
interface UnknownError {
    type: RoomErrorType.Unknown
}


type CreateRoomError = RoomExistsError | UnknownError;
type JoinRoomError = RoomNotExistsError | UnknownError;

class CreateRoomException extends Error {
    public err: CreateRoomError;

    constructor(err: CreateRoomError) {
        super(`Create Room Exception. Error: ${ JSON.stringify(err) }`);
        this.err = err;
    }
}

class JoinRoomException extends Error {
    public err: JoinRoomError;

    constructor(err: JoinRoomError) {
        super(`Join Room Exception. Error: ${ JSON.stringify(err) }`);
        this.err = err;
    }
}



////////////////////////////////////////////////////////////////////////////////////////////////




type User<T> = T & { id: string };
type RoomContext<T> = {
    room: Room<T>,
    user: User<T>
};
class Room<T> {

    public id : string;
    public members: Map<string, User<T>> = new Map();

    constructor(name: string) {
        this.id = name;
    }

    public join(ctx: Context, userProps: T) {

        // Join the room
        ctx.socket.join(this.id);
    
        // Create user from props and set socket / room state
        const user = { ...userProps, id: uuidv4() };
        this.members.set(ctx.socket.id, user);

        Store.of<RoomState<T>>(ctx).roomCtx = {
            room: this,
            user
        };
        
        // Broadcast new user
        ctx.socket.to(this.id).broadcast.emit(RoomEvent.AddUser, user);
        return user;
    }

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

        const user = this.members.get(ctx.socket.id);
        // I don't know how, but???
        if (!user) return;

        console.log(`[leave] ${ JSON.stringify(user) } is leaving`);
        ctx.socket.to(this.id).broadcast.emit(RoomEvent.RemoveUser, user);
        this.members.delete(ctx.socket.id);
    }

    public size() {
        return this.members.keys.length;
    }

}

const create = <T>(ctx: Context, roomId: string, userProps: T) => {
    leave(ctx);

    const rooms = Store.of<RoomState<T>>(ctx).rooms;
    if (rooms.has(roomId)) throw new CreateRoomException({ type: RoomErrorType.RoomExists, roomId });

    const room = new Room<T>(roomId);
    rooms.set(roomId, room);
    
    const user = room.join(ctx, userProps);
    return { room, user };
}

const join = <T>(ctx: Context, roomId: string, userProps: T) => {
    leave(ctx);

    const rooms = Store.of<RoomState<T>>(ctx).rooms;

    if (!rooms.has(roomId)) throw new JoinRoomException({ type: RoomErrorType.RoomNotExists, roomId }); 
    const room = rooms.get(roomId)!;

    const user = room.join(ctx, userProps);
    return { room, user };
};

const leave = <T>(ctx: Context) => {
    const room = Store.of<RoomState<T>>(ctx).roomCtx?.room;
    if (!room) return;

    room.leave(ctx);
    if (room.members.size == 0) Store.of<RoomState<T>>(ctx).rooms.delete(room.id);
};


// Module State
interface RoomState<T> {
    rooms: Map<string, Room<T>>;
    roomCtx?: RoomContext<T>;
}
// Some messy typescript hacks :) Sometimes I miss Java :( 
const RoomState = <T>(): ({ new(): RoomState<T> }) => {
    
    class S implements RoomState<T> {
        // Static ensures global state :)
        private static _rooms = new Map<string, Room<T>>();
    
        public rooms = S._rooms;
        public roomCtx?: RoomContext<T>;
    }

    return S;
}

const inRoom = <T>(f: (room: Room<T>, user: User<T>) => Handler) => {
    return (ctx: Context, ...args: any[]) => {
        const roomCtx = Store.of<RoomState<T>>(ctx).roomCtx;
        if (!roomCtx) return;
        return f(roomCtx.room, roomCtx.user)(ctx, ...args);
    };
};

const room = <T>(namespace: string, state: { new (): RoomState<T> }) => {

    const mod = new Module(namespace)
    mod.use(Store.middleware(state));

    const log = (message: string) => console.log(`{namespace:${namespace}}${ message }`);

    
    mod.on('disconnect', (ctx: Context) => {
        log(`[onDisconnect] Client ${ ctx.socket.id } has disconnected.`);
        leave<T>(ctx);
    });

    mod.on(RoomEvent.Create, (ctx: Context, roomId: string, userProps: T, callback: any) => {

        log(`[onCreateRoom] Client requesting to create room: ${ roomId }.`);
        
        try {
            const { room, user } = create<T>(ctx, roomId, userProps);
            log(`[onCreateRoom] Room created successfully. ${ JSON.stringify(user) } has joined.`);
    
            callback(success({
                user: user,
                members: [...room.members.values()]
            }));
        } catch (err) {
            if (err instanceof CreateRoomException) {
                callback(error(err.err));
            } 
            log(`[onCreateRoom] Unknown error has occurred ${ JSON.stringify(err) }`);
            callback(error({ type: RoomErrorType.Unknown } as UnknownError));
        }

    });
    
    
    mod.on(RoomEvent.Join, (ctx: Context, roomId: string, userProps: T, callback: any) => {
        console.log(`[${namespace}][onJoinRoom] Client requesting to join room: ${ roomId }`);
        
        try {
            const { room, user } = join<T>(ctx, roomId, userProps);
            log(`[onJoinRoom] ${ JSON.stringify(user) } has joined.`);

            callback(success({
                user: user,
                members: [...room.members.values()]
            }));
        } catch (err) {
            if (err instanceof JoinRoomException) {
                callback(error(err.err));
            }
            log(`[onJoinRoom] Unknown error has occurred ${ JSON.stringify(err) }`);
            callback(error({ type: RoomErrorType.Unknown } as UnknownError));
        }
    });
    
    mod.on(RoomEvent.Leave, (ctx: Context) => {
        log(`[onLeaveRoom] Client requesting to leave room`);
        leave<T>(ctx);
    });
    
    
    return mod;
};

export {
    room,
    inRoom, 
    RoomState,
    RoomEvent,
    Room,
    RoomContext,
    User, 
};


