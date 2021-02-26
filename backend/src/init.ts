import { Server } from "./Server";

import { chat } from "./modules/Chat";
import { signalling } from "./modules/Signalling";

import { Server as IOServer } from "socket.io";

const start = () => {
    
    const io = new IOServer(10000, {
        cors: {
            origin: "*"
        }
    });
    const server = new Server(io);

    console.log(`Attaching signalling module...`);
    server.attachModule(signalling);
    console.log(`Attaching chat module...`);
    server.attachModule(chat);

    server.start();
};

start();