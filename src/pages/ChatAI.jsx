import { useState, useRef, useEffect } from "react";
import api from "../api/api";
import "../ChatAI.css";

export default function ChatAI() {

  const [chats, setChats] = useState(() =>
    JSON.parse(localStorage.getItem("CHAT_AI_LIST")) || []
  );

  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveChats = (chatList) => {
    localStorage.setItem("CHAT_AI_LIST", JSON.stringify(chatList));
    setChats(chatList);
  };

  const openChat = (id) => {
    setCurrentChatId(id);
    const selected = chats.find(c => c.id === id);
    setMessages(selected?.messages || []);
  };

  const newChat = () => {
    const id = Date.now();
    const newChatObj = { id, title: "New Chat", messages: [] };
    const updatedList = [newChatObj, ...chats];
    saveChats(updatedList);
    setCurrentChatId(id);
    setMessages([]);
  };

  const deleteChat = (id, e) => {
    e.stopPropagation();
    const updated = chats.filter(c => c.id !== id);
    saveChats(updated);

    if (currentChatId === id) {
      setMessages([]);
      setCurrentChatId(null);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const msg = { sender: "user", text: input };
    const updated = [...messages, msg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/ai/chat", { prompt: input });
      const botReply = { sender: "bot", text: res.data.reply };

      const finalMessages = [...updated, botReply];
      setMessages(finalMessages);

      const updatedChats = chats.map(c =>
        c.id === currentChatId
          ? { ...c, title: updated[0]?.text.slice(0, 25), messages: finalMessages }
          : c
      );

      saveChats(updatedChats);

    } catch {
      setMessages(prev => [...prev, { sender: "bot", text: "⚠️ AI not responding." }]);
    }

    setLoading(false);
  };

  return (
    <div className="layout">
      
      {/* sidebar */}
      <aside className="sidebar">
        <button className="newChatBtn" onClick={newChat}>＋ New Chat</button>

        {chats.length === 0 && <p className="emptyText">No chats yet</p>}

        {chats.map(chat => (
          <div
            key={chat.id}
            className={`chatItem ${currentChatId === chat.id ? "active" : ""}`}
            onClick={() => openChat(chat.id)}
          >
            <span>{chat.title}</span>
            <button className="delBtn" onClick={(e) => deleteChat(chat.id, e)}>🗑</button>
          </div>
        ))}
      </aside>

      {/* main chat window */}
      <div className="gpt-wrapper">
        
        <header className="gpt-header">AI</header>

        <div className="gpt-chat-area">
          {messages.map((m, i) => (
            <div key={i} className={`gpt-message ${m.sender}`}>
              <div className="bubble">{m.text}</div>
            </div>
          ))}

          {loading && (
            <div className="gpt-message bot typing">
              <div className="bubble">Typing...</div>
            </div>
          )}

          <div ref={bottomRef}></div>
        </div>

        <footer className="gpt-input-box">
          <input
            placeholder="Send a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage}>➤</button>
        </footer>
      </div>
    </div>
  );
}
