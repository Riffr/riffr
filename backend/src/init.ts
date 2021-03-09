import {Server} from "./Server";

import {chat} from "./modules/Chat";
import {signalling} from "./modules/Signalling";

import {Server as IOServer} from "socket.io";

const start = () => {

    const fs = require('fs');

    const https = require("https");
    const secureServer = https.createServer({
        key: fs.readFileSync("server.key"),
        cert: fs.readFileSync("server.cert"),
        requestCert: false,
        rejectUnauthorized: false
    });

    secureServer.listen(443);

    var io = require('socket.io')(secureServer, {
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