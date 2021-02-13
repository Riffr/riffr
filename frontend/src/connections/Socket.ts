import io from 'socket.io-client';

import { Result, ResultStatus } from '@riffr/backend';

type Function = (...args: any[]) => void;

class Socket {

    private socket: SocketIOClient.Socket;

    constructor(uri: string, opts?: SocketIOClient.ConnectOpts) {
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
        const promise = new Promise((resolve, reject) => {
            // Emit and wait
            this.socket.emit(event, ...args, (res: Result) => {
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
