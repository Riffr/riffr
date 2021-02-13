import { Server } from "./Server";
import { signallingModule } from "./Signalling";

import { Server as IOServer } from "socket.io";

const io = new IOServer(10000, {
    cors: {
        origin: "*"
    }
});
const server = new Server(io);

console.log(`Attaching signalling module...`);
server.attachModule(signallingModule);

server.start();
