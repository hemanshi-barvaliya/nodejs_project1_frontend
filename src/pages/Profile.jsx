import React, { useEffect, useState, useRef } from "react";
import api from "../api/api";
import { getSocket, initSocket } from "../socket";
import "./Profile.css";
import bg from "../assets/1610823099_44-p-fon-chata-whatsapp-57.jpg";

export default function Profile() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const scrollerRef = useRef();

  // --- Call States ---
  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const peerRef = useRef();
  const remoteAudioRef = useRef();
  const localAudioRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/auth/profile");
        setMe(res.data);
      } catch (err) {
        console.error("Profile load failed:", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!me) return;
    (async () => {
      try {
        const res = await api.get("/users");
        setUsers(res.data.filter((u) => u._id !== me._id));
      } catch (err) {
        console.error("Users load failed:", err);
      }
    })();
  }, [me]);

  /* ---------------- SOCKET SETUP ---------------- */
  useEffect(() => {
    const socket = initSocket();
    if (!socket) return;

    const handleUserOnline = (userId) => {
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, online: true } : u))
      );
      if (userId === activeUser?._id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.to === userId && m.status === "sent"
              ? { ...m, status: "delivered" }
              : m
          )
        );
      }
    };

    const handleUserOffline = (userId) =>
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, online: false } : u))
      );

    const handlePrivateMessage = (msg) => {
      const msgToId = msg.to?._id || msg.to;
      const msgFromId = msg.from?._id || msg.from;
      if (msgToId === me?._id || msgFromId === me?._id) {
        msg.status = msg.delivered ? (msg.read ? "read" : "delivered") : "sent";
        socket.emit("mark_as_read", { from: activeUser._id });
        setMessages((prev) => [...prev, msg]);
      }
    };

    const handleMessageDelivered = (msgId) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msgId && m.status === "sent"
            ? { ...m, status: "delivered" }
            : m
        )
      );
    };

    const handleMessagesRead = ({ from, to }) => {
      if (from === me._id && to === activeUser?._id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.to === to && (m.status === "delivered" || m.status === "sent")
              ? { ...m, status: "read" }
              : m
          )
        );
      }
    };

    const handleMessageDeleted = (deletedId) => {
      setMessages((prev) => prev.filter((m) => m._id !== deletedId));
    };

    // --- CALL SOCKET EVENTS ---
    const handleIncomingCall = ({ from, signal, name }) => {
      setIncomingCall({ from, signal, name });
      setOutgoingCall(false);
      setCallActive(false);
    };

    const handleCallAnswered = ({ signal }) => {
      if (!peerRef.current) return;
      peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      setCallActive(true);
      setOutgoingCall(false);
    };

    const handleCallEnded = () => endCall();
    const handleCallRejected = () => setOutgoingCall(false);

    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("private_message", handlePrivateMessage);
    socket.on("message_delivered", handleMessageDelivered);
    socket.on("messages_read", handleMessagesRead);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_answered", handleCallAnswered);
    socket.on("call_ended", handleCallEnded);
    socket.on("call_rejected", handleCallRejected);

    return () => {
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("private_message", handlePrivateMessage);
      socket.off("message_delivered", handleMessageDelivered);
      socket.off("messages_read", handleMessagesRead);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_answered", handleCallAnswered);
      socket.off("call_ended", handleCallEnded);
      socket.off("call_rejected", handleCallRejected);
    };
  }, [me, activeUser]);

  useEffect(() => {
    if (!activeUser || !me) return;
    (async () => {
      try {
        const res = await api.get(`/messages/${me._id}/${activeUser._id}`);
        const msgs = res.data.map((m) => ({
          ...m,
          status: m.read ? "read" : m.delivered ? "delivered" : "sent",
        }));
        setMessages(msgs);
        setTimeout(
          () => scrollerRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );

        const socket = getSocket();
        if (socket && socket.connected) {
          socket.emit("mark_as_read", { from: activeUser._id });
        }
      } catch (err) {
        console.error("Messages load failed:", err);
      }
    })();
  }, [activeUser, me]);

  /* ---------------- CHAT FUNCTIONS ---------------- */
  const handleSend = async (e) => {
    e.preventDefault();
    const socket = getSocket();
    if (!socket || !socket.connected || !activeUser) return;
    if (!text.trim() && selectedImages.length === 0 && selectedFiles.length === 0)
      return;

    try {
      if (selectedImages.length > 0 || selectedFiles.length > 0) {
        const formData = new FormData();
        formData.append("from", me._id);
        formData.append("to", activeUser._id);
        if (text.trim()) formData.append("content", text.trim());

        [...selectedImages, ...selectedFiles].forEach((file) =>
          formData.append("attachments", file)
        );

        const res = await api.post("/messages/multiple", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const updatedMsgs = res.data.map((m) => ({
          ...m,
          status: activeUser.online ? "delivered" : "sent",
        }));
        socket.emit("mark_as_read", { from: activeUser._id });

        setMessages((prev) => [...prev, ...updatedMsgs]);
        setText("");
        setSelectedImages([]);
        setSelectedFiles([]);

        setTimeout(
          () => scrollerRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );
      } else {
        const messageData = { from: me._id, to: activeUser._id, content: text.trim() };
        socket.emit("private_message", messageData);
        const newMsg = {
          ...messageData,
          _id: `temp-${Date.now()}`,
          createdAt: new Date().toISOString(),
          status: activeUser.online ? "delivered" : "sent",
        };
        socket.emit("mark_as_read", { from: activeUser._id });
        setMessages((prev) => [...prev, newMsg]);
        setText("");
        setTimeout(
          () => scrollerRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );
      }
    } catch (err) {
      console.error("Message send failed:", err);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await api.delete(`/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));

      const socket = getSocket();
      if (socket && socket.connected) socket.emit("delete_message", msgId);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleLogout = () => {
    const socket = getSocket();
    if (socket) socket.disconnect();
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  /* ---------------- CALL FUNCTIONS ---------------- */
  const getMicrophoneStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      if (localAudioRef.current) localAudioRef.current.srcObject = stream;
      return stream;
    } catch (err) {
      console.error("Microphone access denied:", err);
      return null;
    }
  };

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
    peer.ontrack = (event) => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0]; };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    getSocket()?.emit("call_user", { to: activeUser._id, from: me._id, name: me.name, signal: offer });
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    const stream = await getMicrophoneStream();
    if (!stream) return;

    const peer = new RTCPeerConnection();
    peerRef.current = peer;
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peer.ontrack = (event) => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0]; };

    await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);

    getSocket()?.emit("answer_call", { to: incomingCall.from, from: me._id, signal: answer });
    setCallActive(true);
    setIncomingCall(null);
    setOutgoingCall(false);
  };

  const handleRejectCall = () => {
    if (incomingCall) getSocket()?.emit("reject_call", { to: incomingCall.from, from: me._id });
    setIncomingCall(null);
    setOutgoingCall(false);
  };

  const endCall = () => {
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    peerRef.current?.close();
    peerRef.current = null;
    setLocalStream(null);
    setCallActive(false);
    setOutgoingCall(false);
    setIncomingCall(null);
  };

  if (!me)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        Loading...
      </div>
    );

  return (
    <div className="profile-container">
      {/* LEFT PANEL */}
      <div className="profile-left">
        <div className="profile-header">
          <div className="d-flex align-items-center gap-2">
            <img
              src={
                me?.image
                  ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${
                      me.image.startsWith("/") ? "" : "/"
                    }${me.image}`
                  : "/default-avatar.png"
              }
              alt="Profile"
              className="profile-avatar"
            />
            <h5 className="m-0"> {me.username || me.name}</h5>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div className="user-list">
          <h6 className="user-list-title">All Users</h6>
          {users.map((u) => (
            <div
              key={u._id}
              className={`user-item ${activeUser?._id === u._id ? "active" : ""}`}
              onClick={() => setActiveUser(u)}
            >
              <img
                src={
                  u?.image
                    ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${
                        u.image.startsWith("/") ? "" : "/"
                      }${u.image}`
                    : "/default-avatar.png"
                }
                alt={u.name || "User"}
                className="profile-avatar"
              />
              <div className="user-info">
                <strong>{u.name}</strong>
                <div className={`user-status ${u.online ? "online" : ""}`}>
                  {u.online ? "🟢" : "⚫"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="chat-panel">
        {activeUser ? (
          <>
            <div className="chat-header d-flex align-items-center justify-content-between px-2 py-1">
              <div className="d-flex align-items-center gap-2">
                <img
                  src={
                    activeUser?.image
                      ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}${
                          activeUser.image.startsWith("/") ? "" : "/"
                        }${activeUser.image}`
                      : "/default-avatar.png"
                  }
                  alt="User"
                  className="profile-avatar"
                />
                <strong>{activeUser.name || activeUser.username}</strong>
              </div>

              {/* CALL ICON */}
              <div
                className="call-emoji"
                style={{ cursor: "pointer", fontSize: "1.5rem", color: "green" }}
                title="Call User"
                onClick={handleCall}
              >
                <i className="fa-solid fa-phone"></i>
              </div>
            </div>

            {/* CHAT MESSAGES */}
            <div
              className="chat-messages"
              style={{
                background: `url(${bg})`,
                backgroundRepeat: "repeat",
                backgroundSize: "cover",
              }}
            >
              {messages.map((msg) => {
                const mine = msg.from === me._id || msg.from?._id === me._id;
                const isAttachment = msg.image || msg.file;
                const fileUrl = msg.image || msg.file;

                const finalUrl =
                  fileUrl && fileUrl.startsWith("http")
                    ? fileUrl
                    : fileUrl
                    ? `http://localhost:5000${fileUrl}`
                    : "";

                return (
                  <div
                    key={msg._id || Math.random()}
                    className={`message-row ${mine ? "mine" : ""}`}
                  >
                    <div className={`message-bubble ${mine ? "mine" : ""}`}>
                      {mine && (
                        <button
                          className="message-delete"
                          onClick={() => handleDeleteMessage(msg._id)}
                        >
                          🗑️
                        </button>
                      )}
                      {isAttachment ? (
                        /\.(jpg|jpeg|png|gif)$/i.test(fileUrl) ? (
                          <img src={finalUrl} alt="sent" className="message-img" />
                        ) : (
                          <a
                            href={finalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="message-file"
                          >
                            📎 {fileUrl.split("/").pop()}
                          </a>
                        )
                      ) : (
                        <div>{msg.content}</div>
                      )}
                      <div className="message-meta">
                        <span className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                        {mine && (
                          <span
                            className={`message-tick ${msg.status === "read" ? "blue" : ""}`}
                          >
                            {msg.status === "sent" && "✔"}
                            {msg.status === "delivered" && "✔✔"}
                            {msg.status === "read" && "✔✔"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollerRef}></div>
            </div>

            {/* INPUT AREA */}
            <div className="chat-input">
              {(selectedImages.length > 0 || selectedFiles.length > 0) && (
                <div className="file-preview">
                  {selectedImages.map((img) => (
                    <img
                      key={img.name + img.lastModified}
                      src={URL.createObjectURL(img)}
                      alt="preview"
                      className="preview-image"
                    />
                  ))}
                  {selectedFiles.map((file) => (
                    <div key={file.name + file.lastModified}>📎 {file.name}</div>
                  ))}
                  <button
                    className="clear-preview-btn"
                    onClick={() => {
                      setSelectedImages([]);
                      setSelectedFiles([]);
                    }}
                  >
                    ✖
                  </button>
                </div>
              )}

              <div className="chat-controls">
                <input
                  type="file"
                  id="imageInput"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) =>
                    setSelectedImages((prev) => [...prev, ...Array.from(e.target.files)])
                  }
                />
                <input
                  type="file"
                  id="fileInput"
                  multiple
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                  style={{ display: "none" }}
                  onChange={(e) =>
                    setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files)])
                  }
                />
                <button
                  className="icon-btn"
                  onClick={() => document.getElementById("imageInput").click()}
                >
                  📷
                </button>
                <button
                  className="icon-btn"
                  onClick={() => document.getElementById("fileInput").click()}
                >
                  📎
                </button>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type a message..."
                  className="message-input"
                />
                <button className="send-btn" type="submit" onClick={handleSend}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="white"
                    className="send-icon"
                  >
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, background: "#fdfdfd" }}></div>
        )}

        {/* AUDIO ELEMENTS FOR CALL */}
        <audio ref={remoteAudioRef} autoPlay />
        {localStream && <audio ref={localAudioRef} autoPlay muted />}
{incomingCall && (
  <div
    className="d-flex justify-content-center align-items-center"
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.5)",
              zIndex: 1050,
            }}
          >
            <div className="call-modal">
              <p>{incomingCall.name} is calling...</p>
              <button className="call-btn" onClick={handleAcceptCall}>
                Accept
              </button>
              <button className="end-call-btn" onClick={handleRejectCall}>
                Reject
              </button>
            </div>
          </div>
        )}

          {outgoingCall && !callActive && (
            <div
              className="d-flex justify-content-center align-items-center"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.5)",
                zIndex: 1050,
              }}
            >
              <div className="call-modal">
                <p>Calling {activeUser.name || activeUser.username}...</p>
                <button className="end-call-btn" onClick={endCall}>
                  Cancel
                </button>
              </div>
            </div>
          )}

        {callActive && (
          <div
            className="d-flex justify-content-center align-items-center"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.5)",
              zIndex: 1050,
            }}
          >
            <div className="call-modal">
              <p>In Call with {activeUser.name || activeUser.username}</p>
              <button className="end-call-btn" onClick={endCall}>
                End Call
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
