import { Context, Store } from '../Server';
import { room, RoomState } from './Room';

interface User {
    id: string
};
interface Message {
    from: User,
    content: string
};

enum ChatEvent {
    Message = "chat/message",
};

const chat = room<User>("/chat", RoomState<User>());
chat.on(ChatEvent.Message, (ctx: Context, message: Message) => {
    console.log(`[Chat][onMessage] Client sending message: ${ JSON.stringify(message) }`);

    const room = Store.of<RoomState<User>>(ctx).room;
    room?.broadcast(ctx, ChatEvent.Message, message);
});

export {
    User,
    Message,
    ChatEvent,
    chat,
};


