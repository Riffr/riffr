import { Server as IOServer, Namespace as IONamespace, Socket as IOSocket } from "socket.io";

class Server {

    private io: IOServer;
    private readonly modules: Array<Module> = new Array();

    constructor(io: IOServer) {
        this.io = io;
    }

    public attachModule(module: Module) {
        this.modules.push(module);
    }

    public attachModules(modules: Array<Module>) {
        modules.forEach(this.attachModule);
    }

    public start() : void {
        this.modules.forEach(module => module.start(this.io));
    }

}

class Module {

    private namespace: string;
    private readonly handlers: Map<string, Handler> = new Map();

    constructor(namespace: string) {
        this.namespace = namespace;
    }

    public attachHandler(event: string, handler: Handler) {
        this.handlers.set(event, handler);
        return this;
    }

    public start(io: IOServer) {
        const ns = io.of(this.namespace);
        ns.on("connection", (socket: IOSocket) => {
            console.log("Connection");

            const ctx: Context = { io: ns, socket };
            this.handlers.forEach((handler, event) => {
                console.log(`Registering event '${ event }'`);
                socket.on(event, (...args: any[]) => {
                    // console.log(`event ${ event } occurred`);
                    // console.log(handler);
                    // // console.log(`client: ${ JSON.stringify(client) }`);
                    // console.log(`args: ${ JSON.stringify(args) } `);

                    handler(ctx, ...args);
                });
            });
        });
    }

}

type Handler = (client: Context, ...args: any[]) => void;

interface Context {
    io: IONamespace;
    socket: IOSocket;
}

interface Socket extends IOSocket {
    [index: string]: any;
}

class Store {

    private socket: Socket;

    // Factory method
    public static of(ctx: Context) {
        return new this(ctx.socket as Socket);
    }

    private constructor(socket: Socket) {
        this.socket = socket;
    }

    // Store is runtime dependent?
    public get(key: string): any {
        return this.socket[key];
    }

    public set(key: string, value: any) {
        this.socket[key] = value;
    }

}

// Used by servers for responses

interface Result {
    status: ResultStatus,
    body: any
};

enum ResultStatus {
    Success = 200,
    Error = 500
};

const success = (body: any): Result => {
    return {status: ResultStatus.Success, body};
}

const error = (body: any): Result => {
    return {status: ResultStatus.Error, body};
}





export {
    Server,
    Module, 
    Store,
    ResultStatus,
    success, error
};

export type {
    Context,
    Handler,
    Result, 
};
