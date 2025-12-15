import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export default function ChatBox({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    socket.emit("joinRoom", roomId);

    socket.on("message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => socket.disconnect();
  }, [roomId]);

  const sendMessage = () => {
    if (!text) return;
    socket.emit("sendMessage", { room: roomId, text });
    setText("");
  };

  return (
    <div className="bg-white p-4 rounded shadow-md my-4">
      <h2 className="text-xl font-bold mb-2">Chat</h2>
      <div className="h-64 overflow-y-scroll border p-2 mb-2">
        {messages.map((m, i) => (
          <p key={i} className="mb-1">{m.text}</p>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          className="border p-2 flex-1 rounded"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
