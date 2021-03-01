import * as P from './Peer';

type Meshed<T> = T & { id: string };

type CandidatePayload = Meshed<P.CandidatePayload>;
type AnswerPayload = Meshed<P.AnswerPayload>;
type OfferPayload = Meshed<P.OfferPayload>;

enum SignalPayloadType {
    Init    = "init",
    Close   = "close"
};

interface InitPayload {
    readonly type: SignalPayloadType.Init
    readonly meshId: string
};

interface ClosePayload {
    readonly type: SignalPayloadType.Close
};

type PeerSignalPayload = 
    | CandidatePayload
    | AnswerPayload
    | OfferPayload;

type MeshSignalPayload = 
    | InitPayload
    | ClosePayload;

type SignalPayload = PeerSignalPayload | MeshSignalPayload;

enum MeshMessageType {
    PeerAccepted    = "mesh/peer_accepted",
    RequestPeer     = "mesh/request_peer",
    AcceptPeer      = "mesh/accept_peer",
    ClosePeer       = "mesh/close_peer"
};

interface PeerAcceptedPayload {
    readonly type: MeshMessageType.PeerAccepted,
    readonly meshId: string,
    readonly peerId: string
};

interface RequestPeerPayload {
    readonly type: MeshMessageType.RequestPeer
};

interface Peer {
    meshId: string;
    peerId: string; 
    signals: Array<OfferPayload | CandidatePayload>;
};

interface AcceptPeerPayload {
    readonly type: MeshMessageType.AcceptPeer,
    readonly peer: Peer
};

interface ClosePeerPayload {
    readonly type: MeshMessageType.ClosePeer,
    readonly peerId: string
};

type MeshMessagePayload = 
    | PeerAcceptedPayload
    | RequestPeerPayload
    | AcceptPeerPayload
    | ClosePeerPayload;

type MeshPayload = 
    | PeerSignalPayload
    | MeshMessagePayload;


export {
    CandidatePayload,
    OfferPayload,
    AnswerPayload,
    SignalPayloadType,
    InitPayload, 
    ClosePayload,
    PeerSignalPayload,
    MeshMessagePayload,
    SignalPayload,
    MeshMessageType,
    PeerAcceptedPayload,
    RequestPeerPayload,
    Peer,
    AcceptPeerPayload,
    ClosePeerPayload,
    MeshSignalPayload,
    MeshPayload,
};