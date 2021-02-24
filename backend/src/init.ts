import { Server } from "./Server";
import { signallingModule, chatModule } from "./Modules";

import { Server as IOServer } from "socket.io";

const start = () => {
    
    const io = new IOServer(10000, {
        cors: {
            origin: "*"
        }
    });
    const server = new Server(io);

    console.log(`Attaching signalling module...`);
    server.attachModule(signallingModule);
    console.log(`Attaching chat module...`);
    server.attachModule(chatModule);

    server.start();
};

start();