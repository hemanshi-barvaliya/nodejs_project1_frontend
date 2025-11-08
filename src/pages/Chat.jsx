import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { socket } from "../socket";

function Chat() {
  const { roomId } = useParams();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.emit("join-room", roomId);

    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => socket.off("receive-message");
  }, [roomId]);

  const sendMessage = () => {
    if (message.trim() !== "") {
      socket.emit("send-message", { roomId, sender: "user1", receiver: "user2", text: message });
      setMessage("");
    }
  };

  return (
    <div>
      <h2>Room: {roomId}</h2>
      <div style={{ border: "1px solid gray", height: "300px", overflowY: "scroll" }}>
        {messages.map((msg, idx) => (
          <div key={idx}>{msg.text}</div>
        ))}
      </div>
      <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message" />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default Chat;
