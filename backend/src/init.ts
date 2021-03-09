import { Server } from "./Server";

import { chat } from "./modules/Chat";
import { signalling } from "./modules/Signalling";

import { Server as IOServer } from "socket.io";

// import { } from 'fs';
// import { createServer } from 'http';

const start = () => {

    // const fs = require('fs');

    // const https = require("https");
    // const secureServer = https.createServer({
    //         key: fs.readFileSync(".ssl/server.key"),
    //         cert: fs.readFileSync(".ssl/server.cert")
    //     });

    // const httpServer = createServer((req, res) => {
    //     if (req.method == "GET" && req.url == "/health") {
    //         res.writeHead(200);
    //         res.end("Hello World");
    //     }

    //     res.writeHead(200);
    //     res.end()
    // });
    // httpServer.listen(9999);

    const io = new IOServer(10000, {
        cors: {
            origin: "*"
        }
    });
    const server = new Server(io);

    console.log('Attaching signalling module...');
    server.attachModule(signalling);
    console.log('Attaching chat module...');
    server.attachModule(chat);

    server.start();
};

start();