import { Server } from "./Server";
import { signallingModule } from "./Signalling";

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

    server.start();

    console.log(`Listening on port ${ 10000 }`);
    io.listen(10000);

};

start();