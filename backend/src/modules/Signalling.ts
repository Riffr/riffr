
import { Context, error, Handler, Store } from '../Server';
import { User } from './Chat';
import { inRoom, room, Room, RoomState } from './Room';

import { SignalPayloadType as PeerSignalPayloadType } from './signalling/Peer'; 
import { 
    Peer, 
    MeshMessageType, 
    PeerAcceptedPayload,
    AcceptPeerPayload,
    CandidatePayload,
    OfferPayload,
    AnswerPayload,
    InitPayload,
    ClosePeerPayload,

    SignalPayload,
    SignalPayloadType as MeshSignalPayloadType 
} from './signalling/Mesh';



interface Mesh {
    id: string,

    // A map map from peerIds to socketIds. 
    peers: Map<string, string>,

    // pending connections requests (socketIds)
    peerRequestBuffer: Array<string>;

    // Connections buffer. This stores connections that will
    // later be dispatched to newly initialized mesh clients. 
    peerBuffer: Array<Peer>;
};



enum SignalEvent {
    Signal = "signal/signal",
};

class SignalState extends RoomState<User>() {
    public mesh?: Mesh;
};

const hasMesh = (f: (mesh: Mesh) => Handler) => {
    return (ctx: Context, ...args: any[]) => {
        const mesh = Store.of<SignalState>(ctx).mesh;
        if (!mesh) return;
        return f(mesh)(ctx, ...args);
    }
}

const acceptPeer = inRoom((room: Room<string>) => 
    (ctx: Context, peer: Peer, requestor: string) => {
        const { peerId } = peer;

        const rctx = Context.of(ctx, requestor)!;
        const rmesh = Store.of<SignalState>(rctx).mesh;
        if (!rmesh) return;

        // Accepting mesh must be notified that the peer is accepted
        ctx.socket.emit(SignalEvent.Signal, { 
            type: MeshMessageType.PeerAccepted,
            meshId: rmesh.id, 
            peerId: peerId,
        } as PeerAcceptedPayload);

        // Requesting mesh accepts the peer
        room.unicast(ctx, requestor, SignalEvent.Signal, { 
            type: MeshMessageType.AcceptPeer,
            peer: peer, 
        } as AcceptPeerPayload);

        // Associate peerId with requestor (socketId)
        rmesh.peers.set(peerId, requestor);
    });

const handleCandidate = inRoom((room: Room<string>) => hasMesh((mesh: Mesh) => 
    (ctx: Context, payload: CandidatePayload) => {
        const { id } = payload;
        const to = mesh.peers.get(id);

        if (to) {
            room.unicast(ctx, to, SignalEvent.Signal, payload);
        } else {
            mesh.peerBuffer.find((x) => x.peerId == id)?.signals.push(payload);
        }
    }));

const handleOffer = inRoom((room: Room<string>) => hasMesh((mesh: Mesh) => 
    (ctx: Context, payload: OfferPayload) => {

        const { id } = payload;
        const to = mesh.peers.get(id);

        if (to) {
            room.unicast(ctx, to, SignalEvent.Signal, payload);
            return;
        } 

        const peer = mesh.peerBuffer.find((x) => x.peerId == id);
        if (peer) {
            peer.signals.push(payload);
            return;
        } 
        mesh.peerBuffer.push({ meshId: mesh.id, peerId: id, signals: [payload] });
        const requestor = mesh.peerRequestBuffer.pop();
        if (requestor) {
            const peer = mesh.peerBuffer.pop()!
            acceptPeer(ctx, peer, requestor);
        }
    }));

const handleAnswer = inRoom((room: Room<string>) => hasMesh((mesh: Mesh) =>
    (ctx: Context, payload: AnswerPayload) => {

        const { id } = payload;
        const to = mesh.peers.get(id);

        if (to) {
            room.unicast(ctx, to, SignalEvent.Signal, payload);
        }
    }));



const handleInit = inRoom((room: Room<string>) => 
    (ctx: Context, payload: InitPayload, callback: any) => {
        const { meshId } = payload;

        // If meshId is registered, ignore
        if (Array.from(room.members.values()).filter(x => x == meshId)) 
            callback(error(`Mesh with id ${ meshId } already initialized in room ${ room.id }`));

        // initialize mesh state
        Store.of<SignalState>(ctx).mesh = { 
            id: meshId, 
            peers: new Map(), 
            peerRequestBuffer: [], 
            peerBuffer: []
        };


        // now request connections
        Array.from(room.members.values()).forEach(socketId => {
            // Ignore current context. Requesting a connection from oneself is nonsensical
            if (socketId == ctx.socket.id) return;

            const handle = hasMesh((mesh: Mesh) => (rctx: Context) => {
                const peer = mesh.peerBuffer.pop();
                if (!peer) {
                    // No available peers yet, so we buffer the request
                    mesh.peerRequestBuffer.push(ctx.socket.id);
                } else {
                    acceptPeer(rctx, peer, ctx.socket.id);
                }
            });

            const rctx = Context.of(ctx, socketId)!; 
            return handle(rctx);
        });

    });

const handleClose = inRoom((room: Room<string>) => hasMesh((mesh: Mesh) => 
    (ctx: Context) => {
        const { peers } = mesh;

        peers.forEach((socketId, peerId) => {
            room.unicast(ctx, socketId, SignalEvent.Signal, {
                type: MeshMessageType.ClosePeer,
                peerId
            } as ClosePeerPayload);
        });

    }));
    
const signalling = room<User>("/signalling", SignalState);

signalling.on(SignalEvent.Signal, (ctx: Context, payload: SignalPayload) => {
    switch (payload.type) {
        case PeerSignalPayloadType.Answer:
            handleAnswer(ctx, payload);
            break;
        case PeerSignalPayloadType.Candidate: 
            handleCandidate(ctx, payload);
            break;
        case PeerSignalPayloadType.Offer: 
            handleOffer(ctx, payload);
            break;  
        case MeshSignalPayloadType.Init:
            handleInit(ctx, payload);
            break;
        case MeshSignalPayloadType.Close:
            handleClose(ctx);
            break;
    }
});

export {
    signalling,
    SignalEvent
};

