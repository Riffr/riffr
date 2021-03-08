import { Server } from "./Server";

import { chat } from "./modules/Chat";
import { signalling } from "./modules/Signalling";

import { Server as IOServer } from "socket.io";

const start = () => {

    const fs = require('fs');

    const https = require("https");
    const secureServer = https.createServer({
            key: fs.readFileSync(".ssl/server.key"),
            cert: fs.readFileSync(".ssl/server.cert")
        });

    const io = new IOServer(secureServer, {
        cors: {
            origin: "*"
        }
    });
    io.listen(443);
    const server = new Server(io);

    console.log('Attaching signalling module...');
    server.attachModule(signalling);
    console.log('Attaching chat module...');
    server.attachModule(chat);

    server.start();
};

start();