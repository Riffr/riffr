import EventEmitter from 'events';
import StrictEventEmitter from "strict-event-emitter-types"
import { v4 as uuidv4 } from "uuid";

import { 
    SignalPayload, 
    SignalPayloadType,
    MeshPayload,
    MeshMessageType
} from '@riffr/backend/modules/signalling/Mesh';


import * as P from './Peer';
import { Peer } from './Peer';



interface MeshEvents {
    signal: (payload: SignalPayload) => void;
    connection: (peer: MeshedPeer, state: RTCIceConnectionState) => void;

    channelOpen: (peer: MeshedPeer, channel: RTCDataChannel) => void;
    channelData: (peer: MeshedPeer, channel: RTCDataChannel, data: any) => void;
    channelClose: (peer: MeshedPeer, channel: RTCDataChannel) => void;

    error: (peer: MeshedPeer, error: Error) => void;
};
type MeshEmitter = {new (): StrictEventEmitter<EventEmitter, MeshEvents>};


class MeshedPeer extends Peer {

    public meshId?: string;

    constructor(config: P.Config) {
        super(config);
    }

}

interface Config extends P.Config {
    maxPeers?: number
    roomId?: string
};

class Mesh extends (EventEmitter as MeshEmitter) {

    // 1-to-many relationship with peerIds
    private id: string;
    private peers : Map<string, MeshedPeer> = new Map();

    private maxPeers : number;

    private peerConfig : P.Config;

    constructor(config: Config = {}) {
        super();
        
        const { 
            id = uuidv4(),
            roomId = uuidv4(),
            maxPeers = 128, 
            ...peerConfig
        } = config;

        this.id = id;
        this.maxPeers = maxPeers;
        this.peerConfig = peerConfig;

        setTimeout(() => this.emit("signal", { type: SignalPayloadType.Init, meshId: id, roomId} as SignalPayload));

    }

    private createInitiator() {
        const id = uuidv4();
        const peer = this.createPeer({
            id,
            initiator: true,
            ...this.peerConfig
        });
        this.peers.set(id, peer);
    }

    private createPeer(config: P.Config) {
        const peer = new MeshedPeer(config);
        peer.on("signal", (peer : Peer, payload: P.SignalPayload) => {
            this.emit("signal", { ...payload, id: peer.id } as SignalPayload);
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
        })



        return peer;
    }

    public send(label: string, data: any) {
        this.peers.forEach(peer => peer.send(label, data));
    }

    public async dispatch(payload: MeshPayload) {
        switch (payload.type) {
            case P.SignalPayloadType.Offer:
            case P.SignalPayloadType.Answer:
            case P.SignalPayloadType.Candidate: {
                const { id: peerId, ...peerPayload } = payload;
                const peer = this.peers.get(peerId);
                peer?.dispatch(peerPayload as P.SignalPayload);
                break;
            }
            case MeshMessageType.PeerAcceptedPayload: {
                const { meshId, peerId } = payload;
                const peer = this.peers.get(peerId);
                if (peer) peer.meshId = meshId;
                break;
            }
            case MeshMessageType.RequestPeer:
                this.createInitiator();
                break;
            case MeshMessageType.AcceptPeer: {
                const { peer: {meshId, peerId, signals} } = payload;
                
                const peer = this.createPeer({
                    id: peerId,
                    ...this.peerConfig
                });
                peer.meshId = meshId;

                this.peers.set(peerId, peer);
                signals.forEach((signal: SignalPayload) => {
                    this.dispatch(signal);
                });

                break;
            }
            case MeshMessageType.ClosePeerPayload: {
                const peer = this.peers.get(payload.peerId);
                peer?.close();
                break;
            }

        }
    } 
}

export {
    Mesh,
};
