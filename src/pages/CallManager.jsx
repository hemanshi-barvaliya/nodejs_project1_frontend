import React, { useState, useRef, useEffect } from "react";
import { getSocket } from "../socket";

export default function CallManager({ me, activeUser }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [outgoingCall, setOutgoingCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [error, setError] = useState(null);

  const remoteAudioRef = useRef();
  const localAudioRef = useRef();
  const peerRef = useRef();

  const socket = getSocket();

  // -------------------- GET MICROPHONE STREAM --------------------
  const getMicrophoneStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Microphone access denied or failed:", err);
      setError("Microphone access is required to make a call.");
      return null;
    }
  };

  // -------------------- START CALL --------------------
  const handleCall = async () => {
    if (!activeUser) return;

    setOutgoingCall(true);

    const stream = await getMicrophoneStream();
    if (!stream) {
      setOutgoingCall(false);
      return;
    }

    const peer = new RTCPeerConnection();
    peerRef.current = peer;

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    socket.emit("call_user", {
      to: activeUser._id,
      from: me._id,
      name: me.name,
      signal: offer,
    });
  };

  // -------------------- ACCEPT INCOMING CALL --------------------
  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    const stream = await getMicrophoneStream();
    if (!stream) return;

    const peer = new RTCPeerConnection();
    peerRef.current = peer;

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));

    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    socket.emit("answer_call", {
      to: incomingCall.from,
      from: me._id,
      signal: answer,
    });

    setCallActive(true);
    setIncomingCall(null);
    setOutgoingCall(false);
  };

  // -------------------- REJECT INCOMING CALL --------------------
  const handleRejectCall = () => {
    if (incomingCall) {
      socket.emit("reject_call", {
        to: incomingCall.from,
        from: me._id,
      });
    }
    setIncomingCall(null);
    setOutgoingCall(false);
  };

  // -------------------- END CALL --------------------
  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    if (activeUser) {
      socket.emit("end_call", { to: activeUser._id });
    }

    setCallActive(false);
    setOutgoingCall(false);
    setIncomingCall(null);
  };

  // -------------------- SOCKET EVENTS --------------------
  useEffect(() => {
    if (!socket) return;

    socket.on("incoming_call", ({ from, signal, name }) => {
      console.log("📞 Incoming call from", name);
      setIncomingCall({ from, signal, name });
      setOutgoingCall(false);
      setCallActive(false);
    });

    socket.on("call_answered", async ({ signal }) => {
      if (!peerRef.current) return;
      await peerRef.current.setRemoteDescription(
        new RTCSessionDescription(signal)
      );
      setCallActive(true);
      setOutgoingCall(false);
    });

    socket.on("call_ended", () => {
      console.log("📴 Call ended");
      endCall();
    });

    socket.on("call_rejected", () => {
      console.log("🚫 Call rejected");
      setOutgoingCall(false);
    });

    return () => {
      socket.off("incoming_call");
      socket.off("call_answered");
      socket.off("call_ended");
      socket.off("call_rejected");
    };
  }, [socket]);

  // -------------------- UI --------------------
  return (
    <>
      {error && <div className="call-error">{error}</div>}

      {(activeUser || incomingCall || callActive || outgoingCall) && (
        <div className="call-modal-overlay">
          <div className="call-modal">
            {outgoingCall && !incomingCall && !callActive && (
              <>
                <p>Calling {activeUser.name}...</p>
                <button className="end-call-btn" onClick={endCall}>
                  End Call
                </button>
              </>
            )}

            {incomingCall && !callActive && (
              <>
                <p>{incomingCall.name || "Someone"} is calling...</p>
                <button className="recivec" onClick={handleAcceptCall}>Accept</button>
                <button className="end-call-btn" onClick={handleRejectCall}>Reject</button>
              </>
            )}

            {callActive && (
              <>
                <p>
                  Call in progress with{" "}
                  {activeUser?.name || incomingCall?.name || "user"}
                </p>
                <button className="end-call-btn" onClick={endCall}>
                  End Call
                </button>
              </>
            )}

            {!callActive &&
              !incomingCall &&
              !outgoingCall &&
              activeUser && (
                <>
                  <p>Call {activeUser.name}</p>
                  <button className="call-btn" onClick={handleCall}>
                    Call
                  </button>
                </>
              )}
          </div>
        </div>
      )}

      <audio ref={remoteAudioRef} autoPlay />
      {localStream && <audio ref={localAudioRef} autoPlay muted />}
    </>
  );
}
