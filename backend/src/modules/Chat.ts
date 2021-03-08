import { Context, error, Store } from '../Server';
import { room, RoomState, User as RoomUser } from './Room';

////////////////////////////////////////////////////////////////////////////////////////////////
// ERRORS
////////////////////////////////////////////////////////////////////////////////////////////////

enum ChatErrorType {
    MessageFailed = "message_failed",
};
interface MessageFailedError {
    type: ChatErrorType.MessageFailed
}

type ChatError = MessageFailedError;


////////////////////////////////////////////////////////////////////////////////////////////////
interface UserProps {
    username: string,
};
type ChatUser = RoomUser<UserProps>;
interface Message {
    from: string,
    content: string
}

enum ChatEvent {
    Message = "chat/message",
    Start   = "chat/start",
}

const chat = room<UserProps>("/chat", RoomState<UserProps>());
const log = (message: string) => console.log(`{namespace:/chat}${ message }`);

chat.on(ChatEvent.Message, (ctx: Context, content: string, callback: any) => {
    log(`[onMessage] Client sending message: ${ content }`);

    const roomCtx = Store.of<RoomState<UserProps>>(ctx).roomCtx;

    if (!roomCtx) {
        log(`[onMessage] Failed to send message... Client not in room.`);
        callback(error({ type: ChatErrorType.MessageFailed } as MessageFailedError)); 
        return;
    }

    roomCtx.room?.broadcast(ctx, ChatEvent.Message, { from: roomCtx.user.id, content } as Message);
});
chat.on(ChatEvent.Start, (ctx: Context) => {
    const roomCtx = Store.of<RoomState<UserProps>>(ctx).roomCtx;

    roomCtx?.room?.broadcast(ctx, ChatEvent.Start);    
})


export {
    UserProps, ChatUser,
    Message,
    ChatEvent,
    chat,
};


