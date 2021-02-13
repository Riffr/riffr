import { Context, error, Module, Store, success } from "./Server";


const join = (ctx: Context, name: string) => {
    leave(ctx);

    ctx.socket.join(name);
    Store.of(ctx).set("room", name);
};

const leave = (ctx: Context) => {
    const room: string = Store.of(ctx).get("room");

    if (room) {
        ctx.io.in(room).emit(SignallingEvent.RemoveClientFromRoom, { id: ctx.socket.id });
    }
};

const onCreateRoom = (ctx: Context, name: any, callback: any) => {
    console.log(`[onCreateRoom] Client requesting to create room: ${ name.name }`);
    const room = ctx.io.adapter.rooms.get(name.name);

    if (room && room.size > 0) {
        console.log(`[onCreateRoom] Failed to create room. ${ name.name } room is taken`);
        callback(error({message: `Room ${ name.name } taken`}));
    } else {
        join(ctx, name.name)
        console.log(`[onCreateRoom] Creating and joining the room ${ name.name }`);
        
        // TODO: When rooms are implemented as classes on client, send room details
        // on creation and joining. 
        callback(success({message: `Joined room ${ name.name }`}));
    }
};

const onJoinRoom = (ctx: Context, name: any, callback: any) => {
    console.log(`[onJoinRoom] Client requesting to join room: ${ name.name }`);
    join(ctx, name.name);
    callback(success({message: `Joined room ${ name.name }`}));
};


const onLeaveRoom = (ctx: Context, callback: any) => {
    console.log(`[onLeaveRoom] Client requesting to leave room`);
    leave(ctx);
    callback(success({message: `Left room ${ Store.of(ctx).get("room") }`}));
};

const onMessage = (ctx: Context, message: any) => {
    console.log(`[onMessage] Client sending message: ${ message.message }`);

    const room: string = Store.of(ctx).get("room");
    if (room) {
        ctx.socket.to(room).emit(SignallingEvent.Message, { message });
    }
};

enum SignallingEvent {
    CreateRoom              = "signalling:create_room",
    JoinRoom                = "signalling:join_room",
    RemoveClientFromRoom    = "signalling:remove_client_from_room",
    LeaveRoom               = "signalling:leave_room",
    Message                 = "signalling:message"
}

const signallingModule = new Module("/signalling");

signallingModule.attachHandler(SignallingEvent.CreateRoom, onCreateRoom);
signallingModule.attachHandler(SignallingEvent.JoinRoom, onJoinRoom);
signallingModule.attachHandler(SignallingEvent.LeaveRoom, onLeaveRoom);
signallingModule.attachHandler(SignallingEvent.Message, onMessage);

export {
    signallingModule,
    SignallingEvent
};
