import EventEmitter from 'events';
import StrictEventEmitter from "strict-event-emitter-types";
import { v4 as uuidv4 } from "uuid";

import { 
    Peer as P,
    Mesh as M,
} from '@riffr/backend';

import { Peer, Config as PeerConfig } from './Peer';



interface MeshEvents {
    signal: (payload: M.SignalPayload) => void;
    connection: (peer: MeshedPeer, state: RTCIceConnectionState) => void;

    channelOpen: (peer: MeshedPeer, channel: RTCDataChannel) => void;
    channelData: (peer: MeshedPeer, channel: RTCDataChannel, data: any) => void;
    channelClose: (peer: MeshedPeer, channel: RTCDataChannel) => void;

    error: (peer: MeshedPeer, error: Error) => void;
}
type MeshEmitter = {new (): StrictEventEmitter<EventEmitter, MeshEvents>};


class MeshedPeer extends Peer {

    public userId?: string;

    constructor(config: PeerConfig) {
        super(config);
    }

}

interface Config extends PeerConfig {
    maxPeers?: number;
    peerBufferSize?: number;
}

class Mesh extends (EventEmitter as MeshEmitter) {

    // 1-to-many relationship with peerIds
    // public id: string;
    private peers : Map<string, MeshedPeer> = new Map();

    private maxPeers : number;
    private peerBufferSize: number;

    private peerConfig : PeerConfig;

    constructor(config: Config = {}) {
        super();
        
        const { 
            // id = uuidv4(),
            maxPeers = 128,
            peerBufferSize = 1, 
            ...peerConfig
        } = config;

        // this.id = id;
        this.maxPeers = maxPeers;
        this.peerBufferSize = peerBufferSize; 
        this.peerConfig = peerConfig;


        setTimeout(() => {
            this.emit("signal", { type: M.SignalPayloadType.Init } as M.SignalPayload);
            for (let i = 0; i < this.peerBufferSize; i++) {
                this.createInitiator();
            }
        });

    }

    private createInitiator() {
        const peer = this.createPeer({
            initiator: true,
            ...this.peerConfig
        });
        this.peers.set(peer.id, peer);
    }

    private createPeer(config: PeerConfig) {
        const peer = new MeshedPeer(config);
        peer.on("signal", (peer : Peer, payload: P.SignalPayload) => {
            this.emit("signal", { ...payload, id: peer.id } as M.SignalPayload);
        });

        peer.on("connection", (peer: MeshedPeer, state: RTCIceConnectionState) => {
            this.emit("connection", peer, state);
        });

        peer.on("channelOpen", (peer: MeshedPeer, channel: RTCDataChannel) => {
            this.emit("channelOpen", peer, channel);
        });

        peer.on("channelClose", (peer: MeshedPeer, channel: RTCDataChannel) => {
            this.emit("channelClose", peer, channel);
        });

        peer.on("channelData", (peer : MeshedPeer, channel: RTCDataChannel, data) => {
            this.emit("channelData", peer, channel, data);
        });

        peer.on("error", (peer : Peer, error: Error) => {
            this.emit("error", peer, error);
        });



        return peer;
    }

    public addDataChannel(label: string, channelInit?: RTCDataChannelInit) {
        this.peers.forEach(peer => peer.addDataChannel(label, channelInit));
    }

    public send(label: string, data: any) {
        this.peers.forEach(peer => peer.send(label, data));
    }

    public close() {
        this.peers.forEach(peer => peer.close());
        this.peers = new Map();
    }

    public async dispatch(payload: M.MeshPayload) {
        switch (payload.type) {
            case P.SignalPayloadType.Offer:
            case P.SignalPayloadType.Answer:
            case P.SignalPayloadType.Candidate: {
                const { id: peerId, ...peerPayload } = payload;
                const peer = this.peers.get(peerId);
                peer?.dispatch(peerPayload as P.SignalPayload);
                break;
            }
            case M.MeshMessageType.PeerAccepted: {
                const { userId, peerId } = payload;
                const peer = this.peers.get(peerId);
                if (peer) peer.userId = userId;
                break;
            }
            case M.MeshMessageType.RequestPeer:
                this.createInitiator();
                break;
            case M.MeshMessageType.AcceptPeer: {
                const { peer: { userId, peerId, signals } } = payload;
                
                const peer = this.createPeer({
                    id: peerId,
                    ...this.peerConfig
                });
                peer.userId = userId;
                this.peers.set(peerId, peer);

                signals.forEach((signal: M.PeerSignalPayload) => {
                    this.dispatch(signal);
                });

                break;
            }
            case M.MeshMessageType.ClosePeer: {
                const peer = this.peers.get(payload.peerId);
                peer?.close();
                break;
            }

        }
    } 
}

export {
    Mesh,
    MeshedPeer,
};
