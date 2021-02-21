import EventEmitter from "events";
import StrictEventEmitter from "strict-event-emitter-types"
import { v4 as uuidv4 } from "uuid";

interface Config {
    readonly id?: string,
    readonly initiator?: boolean,
    readonly rtcConfig?: RTCConfiguration,
};

// Signalling payloads

type SignalPayload = CandidatePayload | OfferPayload | AnswerPayload;
enum SignalPayloadType {
    Candidate   = "candidate",
    Offer       = "offer",
    Answer      = "answer",
}
interface CandidatePayload {
    readonly type: SignalPayloadType.Candidate;
    readonly candidate?: RTCIceCandidateInit;
};
interface OfferPayload {
    readonly type: SignalPayloadType.Offer;
    readonly sdp: string;
};
interface AnswerPayload {
    readonly type: SignalPayloadType.Answer;
    readonly sdp: string;
};


// Event Emitters

interface PeerEvents {
    signal: (peer: Peer, payload: SignalPayload) => void;
    connection: (peer: Peer, state: RTCIceConnectionState) => void;

    channelOpen: (peer: Peer, channel: RTCDataChannel) => void;
    channelData: (peer: Peer, channel: RTCDataChannel, data: any) => void;
    channelClose: (peer: Peer, channel: RTCDataChannel) => void;

    error: (peer: Peer, error: Error) => void;

    iceComplete: () => void;
};
type PeerEmitter = {new (): StrictEventEmitter<EventEmitter, PeerEvents>};

// Peer

class Peer extends (EventEmitter as PeerEmitter) {

    static ICE_SERVERS: Array<RTCIceServer> = [
        {
            urls: 'stun:stun.l.google.com:19302'
        },
        {
            urls: 'stun:global.stun.twilio.com:3478?transport=udp'
        }
    ];
    static CONFIG = {
        iceServers: Peer.ICE_SERVERS,
        sdpSemantics: 'unified-plan',
    };


    private readonly id: string;
    private readonly initiator: boolean;

    private channels: Map<string, RTCDataChannel> = new Map();
    private connection: RTCPeerConnection;

    // This is a hack to deal with asynchronous negotiations
    private negotiationCount : number = 0;

    constructor(config: Config = {}) {
        super();

        // Initialize private fields
        const { id, initiator, rtcConfig = {} } = config;
        this.id = id || uuidv4();
        this.initiator = initiator || false;
        
        // Initialize connection
        this.connection = new RTCPeerConnection({
            ...Peer.CONFIG,
            ...rtcConfig,
        })
        this.initConnection();
        this.addDataChannel("data");
    }


    private initConnection() {
        this.connection.onicecandidate = this.onIceCandidate;
        this.connection.oniceconnectionstatechange = this.onIceConnectionStateChange;
        this.connection.onnegotiationneeded = this.onNegotiationNeeded;
        this.connection.ondatachannel = this.onDataChannel;
    }

    // Arrow functions are used to avoid weird JS this. bindings
    private onIceCandidate = (event: RTCPeerConnectionIceEvent) => {
        const payload = { type: SignalPayloadType.Candidate, candidate: event.candidate } as CandidatePayload;
        this.emit("signal", this, payload);
    };

    private onIceConnectionStateChange = () => {
        const { iceConnectionState } = this.connection;
        switch (iceConnectionState) {
            // On any error state, we should close the peer connection. 
            // Error states are 'closed' and 'failed'
            case "closed":
            case "failed":
                this.close();
                break;
        }

        this.emit("connection", this, iceConnectionState);
    };


    private onNegotiationNeeded = async () => {
        // TODO: Add some form of renegotiation mechanism via the signalling server using an explicit internal message
        
        // Negotiation count is for avoiding stale offers, since we're dealing with async events
        const neg = ++this.negotiationCount;
        const offer = await this.connection.createOffer();
        if (neg !== this.negotiationCount) return;

        console.log("[onNegotiationNeeded] creating offer...")

        await this.connection.setLocalDescription(offer).catch(e => this.emit("error", this, e));

        console.log("[createOffer] offer created.");

        const { type, sdp } = offer;
        this.emit("signal", this, { type, sdp } as OfferPayload);
        console.log("[sendOffer] sending offer..."); 
    };


    private handleCandidate = async (candidateInit?: RTCIceCandidateInit) => {
        if (!candidateInit) return;

        console.log("[handleCandidate] Handling candidate...");
        const candidate = new RTCIceCandidate(candidateInit);
        await this.connection.addIceCandidate(candidate).catch(e => this.emit("error", this, e));
    };

    private handleOffer = async (sdpInit : RTCSessionDescriptionInit) => {
        console.log("[handleCandidate] Handling offer...");
        
        const remoteDesc = new RTCSessionDescription(sdpInit);
        await this.connection.setRemoteDescription(remoteDesc).catch(e => this.emit("error", this, e));

        console.log("[handleOffer] Set remote description...");
        
        // this.pendingIceCandidates.forEach(this.addCandidate);
        // this.pendingIceCandidates = [];

        // console.log("[handleOffer] handling pending candidates")

        const answer = await this.connection.createAnswer();

        console.log("[handleOffer] Set local description...");
        await this.connection.setLocalDescription(answer);

        const { type, sdp } = answer;
        console.log("[handleOffer] Sending Answer..."); 
        this.emit("signal", this, { type, sdp } as AnswerPayload);
    };

    private handleAnswer = async (sdpInit : RTCSessionDescriptionInit) => {
        // this.pendingIceCandidates.forEach(this.addCandidate);
        // this.pendingIceCandidates = [];

        console.log("[handleAnswer] handling pending candidates")

        console.log("[handleAnswer] Handling answer...");
        
        const desc = new RTCSessionDescription(sdpInit);
        await this.connection.setRemoteDescription(desc).catch(e => this.emit("error", this, e));
    };


    // Channel methods

    public addDataChannel(label: string, channelInit?: RTCDataChannelInit) {
        if (!this.connection) return;

        if (this.initiator) {
            const channel = this.connection.createDataChannel(label, channelInit);
            this.initChannel(channel);
        } 
    }

    private onDataChannel = (event: RTCDataChannelEvent) => {
        const channel = event.channel;
        this.initChannel(channel);
    }

    private initChannel = (channel: RTCDataChannel) => {
        channel.onmessage = (event: MessageEvent) => {
            this.emit("channelData", this, channel, event.data);
        };

        channel.onopen = () => {
            this.channels.set(channel.label, channel);
            this.emit("channelOpen", this, channel);
        };

        channel.onclose = () => {
            this.emit("channelClose", this, channel);
        }
    };


    public close() {
        if (!this.connection) return;

        // Nullifying the handlers prevents buffered events triggering handlers while connection is closing
        this.connection.onicecandidate = null;
        this.connection.oniceconnectionstatechange = null;
        this.connection.onnegotiationneeded = null;
        this.connection.ondatachannel = null;

        this.channels.forEach((channel: RTCDataChannel) => {
            channel.onmessage = null;
        })
        this.channels = new Map();

        this.connection.close();
    }

    public send(label: string, data: any) {
        this.channels.get(label)?.send(data);
    }

    public async dispatch(payload: SignalPayload) {
        switch (payload.type) {
            case SignalPayloadType.Offer:
                console.log("Offer payload received....");
                await this.handleOffer(payload);
                break;
            case SignalPayloadType.Candidate:
                console.log("Candidate payload received....");
                await this.handleCandidate(payload.candidate);
                break;
            case SignalPayloadType.Answer:
                console.log("Answer payload received....");
                this.handleAnswer(payload);
                break;
        }
    }

}

export {
    Peer, 
    SignalPayloadType,
};

export type {
    Config,
    SignalPayload,
    CandidatePayload,
    OfferPayload,
    AnswerPayload,
    PeerEvents,
    PeerEmitter,
};

