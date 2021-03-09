import { debug } from 'console';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

interface Result {
    status: ResultStatus,
    body: any
};

enum ResultStatus {
    Success = 200,
    Error = 500
};

type Function = (...args: any[]) => void;

class Socket {

    public readonly id = uuidv4();

    public uri: string;
    private socket: SocketIOClient.Socket;

    constructor(uri: string, opts?: SocketIOClient.ConnectOpts) {
        console.log(`Creating Socket w/ uri ${uri} ${this.id}...`);
        this.uri = uri;
        this.socket = io(uri, opts);
    }

    on(event: string, fn: Function): Socket {
        this.socket.on(event, fn);
        return this;
    }

    once(event: string, fn: Function): Socket {
        this.socket.once(event, fn);
        return this;
    }

    off(event: string, fn?: Function): Socket {
        this.socket.off(event, fn);
        return this;
    }

    emit(event: string, ...args: any[]): Socket {
        this.socket.emit(event, ...args);
        return this;
    }

    /**
     * Promisify-emit. This will allow us to write:
     *      await socket.emit(event, ....)
     * This is more preferable than using callbacks everywhere :)
     * and allows a request-response like protocol over socket.io
     * 
     * @param event 
     * @param args 
     */

    request(event: string, ...args: any[]): Promise<any> {
        console.log(`Creating Room... Socket Request ${ this.id }`);
        
        const promise = new Promise((resolve, reject) => {
            // Emit and wait

            console.log('Requesting....');
            this.socket.emit(event, ...args, (res: Result) => {
                console.log(`Result from socket ${ this.id } ${this.uri}`);

                // TODO: Would be nice to add some runtime typechecking
                // for result, perhaps using https://github.com/gristlabs/ts-interface-checker
                if (res.status === ResultStatus.Success) {
                    resolve(res.body);
                } else { 
                    reject({
                        message: res?.body,
                        event,
                        args
                    });
                }
            });

            // Set timeout for 3000 ms (3 seconds)
            setTimeout(() => reject({
                message: "Request timed out",
                event,
                args
            }), 3000);
        });

        return promise;
    }

}

export {
    Socket,
};
