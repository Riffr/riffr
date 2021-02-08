
import { Socket } from './Socket';

import { SignallingEvent } from '../../../backend/src/Signalling';

// TODO: Define a type for Message (and it's handlers)
type onMessageHandler = (message: any) => void;

class SignallingChannel {

    private readonly onMessageHandlers: Array<onMessageHandler> = new Array();
    private socket: Socket;

    constructor(uri: string) {
        this.socket = new Socket(`${ uri }/signalling`);
    
        this.socket.on(SignallingEvent.Message, (message: any) => {
            this.onMessageHandlers.forEach(handler => handler(message));
        });
    }

    // TODO: Might be nice to add rooms as a resource (class)
    // Will allow easy monitoring of room info?

    public async createRoom(name: string) {
        const res = await this.socket.request(SignallingEvent.CreateRoom, { name });
        return res;
    }

    public async joinRoom(name: string) {
        const res = await this.socket.request(SignallingEvent.JoinRoom, { name });
        return res;
    }

    public async leaveRoom(name: string) {
        await this.socket.request(SignallingEvent.LeaveRoom, { name });    
    }    

    public sendMessage(message: any) {
        this.socket.emit(SignallingEvent.Message, { message });
    }


    public addMessageHandler(handler: onMessageHandler) {
        this.onMessageHandlers.push(handler);
    }

}

export {
    SignallingChannel,
};
