import { useState, useEffect } from "react";
import io from "socket.io-client";

// Make sure the backend server URL matches where Socket.IO is hosted
const socket = io("http://localhost:5001"); // Pointing to the correct backend server

const Chat = ({ userId, isAdmin }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Emitting to the server when a user connects
    if (isAdmin) {
      socket.emit("register_admin", userId);  // Admin registration
    } else {
      socket.emit("register_user", userId);   // User registration
    }

    // Listening for incoming messages
    socket.on("receive_message", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, [userId, isAdmin]);

  const handleSendMessage = () => {
    if (message.trim()) {
      const receiverRole = isAdmin ? "users" : "admin"; // Sender and receiver roles

      socket.emit("send_message", {
        senderId: userId,
        receiverId: isAdmin ? "user123" : "admin123", // Example receiver ID
        senderRole: isAdmin ? "admin" : "users",
        message: message.trim(),
      });

      setMessages((prevMessages) => [...prevMessages, message]);
      setMessage(""); // Clear message input
    }
  };

  return (
    <div className="chat-container">
      <div className="messages-list">
        {messages.map((msg, index) => (
          <div key={index} className="message">{msg}</div>
        ))}
      </div>
      <div className="input-container">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSendMessage();
            }
          }}
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Chat;