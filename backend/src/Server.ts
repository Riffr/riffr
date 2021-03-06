import { Server as IOServer, Namespace as IONamespace, Socket as IOSocket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";

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


type Middleware = (s: IOSocket, next: (err?: ExtendedError) => void) => void;

class Module {

    private namespace: string;
    private readonly handlers: Map<string, Set<Handler>> = new Map();
    private readonly middleware: Array<Middleware> = new Array();

    constructor(namespace: string) {
        this.namespace = namespace;
    }

    public use(middleware: Middleware) {
        this.middleware.push(middleware);
    }


    public on(event: string, handler: Handler) {
        if (!this.handlers.has(event)) this.handlers.set(event, new Set());
        this.handlers.get(event)?.add(handler);
    }

    public start(io: IOServer) {
        const ns = io.of(this.namespace);
        this.middleware.forEach(m => ns.use(m));

        ns.on("connection", (socket: IOSocket) => {
            console.log(`[Module] Connection`);

            const ctx: Context = { io: ns, socket };
            
            console.log(`[Module] Registering events`);
            this.handlers.forEach((handlers, event) => {
                socket.on(event, (...args: any[]) => {
                    console.log(`[Module] Event ${ event } occurred. Socket ${ socket.id }`);
                    handlers.forEach(handler => handler(ctx, ...args));
                });
            });
        });
    }
}

interface Socket<T> extends IOSocket {
    store: T;
};

class Store<T> {

    public static middleware = <T>(constructor: { new (...args: any[]): T }, ...args: any[]) => {
        return (s: IOSocket, next: (err?: ExtendedError) => void) => {
            const socket = (s as Socket<T>);
            socket.store = new constructor(...args);
            next();
        };
    } 

    // Nasty but... does the job. TODO: Refactor later
    public static of<T>(ctx: Context): T {
        // const isContext = (x: Context | Socket<T>): x is Context => 'io' in x;
        const socket = ctx.socket as Socket<T>;
        return socket.store;
    }

}

type Handler = (client: Context, ...args: any[]) => void;

interface Context {
    io: IONamespace;
    socket: IOSocket;
}

class Context {
    public static of(ctx: Context, socketId: string) {
        const socket = ctx.io.sockets.get(socketId);
        if (!socket) return;

        return { io: ctx.io, socket } as Context;
    }
}


type Indexable<T> = { [index: string]: T };
type StoreSocket = IOSocket & Indexable<any>;
type StoreNamespace = IONamespace & Indexable<any>;


interface StoreContext extends Context {
    io: StoreNamespace;
    socket: StoreSocket;
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
    Context,
    ResultStatus,
    success, error
};

export type {
    Handler,
    Result, 
};
