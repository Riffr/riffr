
import { Context, error, Handler, Store, success } from '../Server';
import { UserProps } from './Chat';
import { inRoom, room, Room, RoomContext, RoomState, User } from './Room';

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
    SignalPayloadType as MeshSignalPayloadType, 
    MeshMessagePayload
} from './signalling/Mesh';


////////////////////////////////////////////////////////////////////////////////////////////////

interface Mesh {
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

class SignalState extends RoomState<UserProps>() {
    public mesh?: Mesh;
};

const hasMesh = (f: (mesh: Mesh) => Handler) => {
    return (ctx: Context, ...args: any[]) => {
        const mesh = Store.of<SignalState>(ctx).mesh;
        if (!mesh) return;
        return f(mesh)(ctx, ...args);
    }
}

const acceptPeer = inRoom((room: Room<UserProps>, user: User<UserProps>) => hasMesh((mesh: Mesh) => 
    (ctx: Context, peer: Peer, requestor: string) => {
        const { peerId } = peer;

        const rctx = Context.of(ctx, requestor)!;
        const rmesh = Store.of<SignalState>(rctx).mesh;
        if (!rmesh) return;

        // Accepting mesh must be notified that the peer is accepted
        ctx.socket.emit(SignalEvent.Signal, { 
            type: MeshMessageType.PeerAccepted,
            userId: user.id, 
            peerId: peerId,
        } as PeerAcceptedPayload);
        mesh.peers.set(peerId, requestor);

        // Requesting mesh accepts the peer
        room.unicast(ctx, requestor, SignalEvent.Signal, { 
            type: MeshMessageType.AcceptPeer,
            peer: peer, 
        } as AcceptPeerPayload);

        // Associate peerId with requestor (socketId)
        rmesh.peers.set(peerId, ctx.socket.id);
    }));

const handleCandidate = inRoom((room: Room<UserProps>) => hasMesh((mesh: Mesh) => 
    (ctx: Context, payload: CandidatePayload) => {
        const { id } = payload;
        const to = mesh.peers.get(id);

        if (to) {
            room.unicast(ctx, to, SignalEvent.Signal, payload);
        } else {
            mesh.peerBuffer.find((x) => x.peerId == id)?.signals.push(payload);
        }
    }));

const handleOffer = inRoom((room: Room<UserProps>, user: User<UserProps>) => hasMesh((mesh: Mesh) => 
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
        mesh.peerBuffer.push({ userId: user.id, peerId: id, signals: [payload] });
        const requestor = mesh.peerRequestBuffer.pop();
        if (requestor) {
            const peer = mesh.peerBuffer.pop()!
            acceptPeer(ctx, peer, requestor);
        }
    }));

const handleAnswer = inRoom((room: Room<UserProps>) => hasMesh((mesh: Mesh) =>
    (ctx: Context, payload: AnswerPayload) => {

        const { id } = payload;
        const to = mesh.peers.get(id);

        if (to) {
            room.unicast(ctx, to, SignalEvent.Signal, payload);
        }
    }));



const handleInit = inRoom((room: Room<UserProps>, user: User<UserProps>) => 
    (ctx: Context, payload: InitPayload) => {


        console.log(`[Init] Initializing mesh for user ${ user }`);

        // initialize mesh state
        Store.of<SignalState>(ctx).mesh = {  
            peers: new Map(), 
            peerRequestBuffer: [], 
            peerBuffer: []
        };


        console.log(`[Init] Requesting connections`)

        // now request connections
        Array.from(room.members.keys()).forEach(socketId => {
            // Ignore current context. Requesting a connection from oneself is nonsensical
            if (socketId == ctx.socket.id) return;

            console.log(`[Init] Requesting connection from socket ${ JSON.stringify(socketId) }`);

            const handle = hasMesh((mesh: Mesh) => (rctx: Context) => {
                console.log(`Mesh: ${ JSON.stringify(mesh) }`);

                const peer = mesh.peerBuffer.pop();
                console.log(`Peer: ${ JSON.stringify(peer) }`);
                if (!peer) {
                    console.log(`Pushing to request buffer...`);
                    // No available peers yet, so we buffer the request
                    mesh.peerRequestBuffer.push(ctx.socket.id);
                } else {
                    console.log(`Accepting peer...`)
                    acceptPeer(rctx, peer, ctx.socket.id);
                }
                rctx.socket.emit(SignalEvent.Signal, { type: MeshMessageType.RequestPeer } as MeshMessagePayload);
            });

            const rctx = Context.of(ctx, socketId)!; 
            return handle(rctx);
        });

    });

const handleClose = inRoom((room: Room<UserProps>) => hasMesh((mesh: Mesh) => 
    (ctx: Context) => {
        const { peers } = mesh;

        peers.forEach((socketId, peerId) => {
            room.unicast(ctx, socketId, SignalEvent.Signal, {
                type: MeshMessageType.ClosePeer,
                peerId
            } as ClosePeerPayload);
        });

    }));
    
const signalling = room<UserProps>("/signalling", SignalState);

signalling.on(SignalEvent.Signal, (ctx: Context, payload: SignalPayload) => {
    console.log(`Signal Payload: ${ JSON.stringify(payload.type) }`);
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

