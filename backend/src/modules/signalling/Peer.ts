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

export {
    SignalPayload,
    SignalPayloadType,
    CandidatePayload,
    OfferPayload,
    AnswerPayload
};