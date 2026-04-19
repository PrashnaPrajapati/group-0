import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

let socket = null;

const Chat = ({ userId, isAdmin }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [receiverId, setReceiverId] = useState(null);
  const [adminIds, setAdminIds] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
 
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
 
  useEffect(() => {
    if (!socket) {
      socket = io("http://localhost:5001");
    }


    const token = localStorage.getItem("token");
  
    // Set a timeout to clear loading after 5 seconds
    const loadingTimeout = setTimeout(() => {
      console.warn("⏱️ Loading timeout reached");
      setLoading(false);
    }, 5000);

    socket.on("message_history", (data) => {
      console.log("📜 Received message_history:", data);
      setMessages(data.messages || []);
      setLoading(false);
      clearTimeout(loadingTimeout);
    });
 
    socket.on("admin_list", (data) => {
      console.log("🔔 Received admin_list event. isAdmin:", isAdmin, "data:", data);
      if (!isAdmin) {
        const adminIds = (data && Array.isArray(data.adminIds)) ? data.adminIds : [];
        console.log("📋 Admin IDs from backend:", adminIds);
        
        // Only use system admin ID 999999 if NO real admins exist
        let validAdminIds = adminIds;
        if (adminIds.length === 0) {
          console.warn("⚠️ No real admins found, using system admin 999999");
          validAdminIds = [999999];
        }
        
        const firstAdmin = validAdminIds[0];
        console.log("✅ Setting receiver to:", firstAdmin, "(real admin" + (firstAdmin !== 999999 ? "" : " - system fallback") + ")");
        
        setAdminIds(validAdminIds);
        setReceiverId(firstAdmin);
        setSelectedUser({ id: firstAdmin, fullName: "Admin" });
        setLoading(false);
        socket.emit("request_history", { conversationUserId: firstAdmin });
      }
    });
 
    socket.on("receive_message", (messageData) => {
      setMessages((prev) => [...prev, messageData]);
    });
 
    socket.on("users_list", (data) => {
      setUsersList(data.users || []);
      setOnlineUsers(new Set(data.onlineUsers || []));
      setLoading(false);
    });
 
    socket.on("user_online", (data) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        if (data.isOnline) {
          updated.add(data.userId);
        } else {
          updated.delete(data.userId);
        }
        return updated;
      });
    });
 
    socket.on("error", (errData) => {
      setError(errData.message || "An error occurred");
      console.error("Socket error:", errData);
    });
 
    socket.on("message_sent", (messageData) => { 
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message_text === messageData.message_text && !msg.id
            ? messageData
            : msg
        )
      );
    });
 
    if (isAdmin) {
      socket.emit("register_admin", { adminId: userId, token }); 
      socket.emit("get_users");
    } else {
      socket.emit("register_user", { userId, token });
    }

    return () => { 
      clearTimeout(loadingTimeout);
      socket.off("message_history");
      socket.off("admin_list");
      socket.off("receive_message");
      socket.off("users_list");
      socket.off("user_online");
      socket.off("error");
      socket.off("message_sent");
    };
  }, [userId, isAdmin]);
 
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setReceiverId(user.id);
    setMessages([]); 
    setLoading(true);
     
    socket.emit("request_history", { conversationUserId: user.id });
  };
 
  const handleSendMessage = () => {
    if (!message.trim()) {
      setError("Message cannot be empty");
      return;
    }

    const targetReceiverId = receiverId || (adminIds && adminIds.length > 0 ? adminIds[0] : 999999);

    if (!targetReceiverId) {
      setError("Unable to send message. Please reload the page.");
      console.error("❌ No receiver ID available");
      return;
    }

    setError(null);

    const isSystemAdminFallback = targetReceiverId === 999999;
    
    const optimisticMessage = {
      sender_id: userId,
      receiver_id: targetReceiverId,
      sender_role: isAdmin ? "admin" : "users",
      message_text: message.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
     
    console.log("📤 Sending message to receiver " + targetReceiverId + (isSystemAdminFallback ? " (system admin fallback)" : " (real admin)"), {
      senderId: userId,
      receiverId: targetReceiverId,
      senderRole: isAdmin ? "admin" : "users",
      message: message.trim(),
    });

    socket.emit("send_message", {
      receiverId: targetReceiverId,
      message: message.trim(),
      senderId: userId,
      senderRole: isAdmin ? "admin" : "users",
    });
 
    socket.emit("mark_as_read", { conversationUserId: targetReceiverId });

    setMessage("");
    setError(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };
 
  if (isAdmin) {
    return (
      <div className="flex h-screen bg-gray-100"> 
        <div className="w-1/4 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Conversations</h2>
          </div>
          
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading users...</div>
          ) : usersList.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No users available</div>
          ) : (
            <div>
              {usersList.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
                    selectedUser?.id === user.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{user.fullName}</p>
                      <p className="text-sm text-gray-500">{user.gender}</p>
                    </div>
                    {onlineUsers.has(user.id) && (
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
 
        <div className="w-3/4 flex flex-col bg-white">
          {selectedUser ? (
            <> 
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{selectedUser.fullName}</h2>
                    <p className="text-sm text-gray-500">
                      {onlineUsers.has(selectedUser.id) ? (
                        <span className="text-green-600">● Online</span>
                      ) : (
                        <span className="text-gray-500">● Offline</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
 
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                  <div className="text-center text-gray-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500">No messages yet. Start a conversation!</div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.sender_id === userId
                            ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        <p className="break-words">{msg.message_text}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender_id === userId ? "text-blue-100" : "text-gray-500"
                        }`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
 
              {error && (
                <div className="px-4 py-2 bg-red-100 text-red-700 border border-red-300 rounded">
                  {error}
                </div>
              )}
 
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex gap-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none placeholder:text-gray-500 focus:placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                    rows="3"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:bg-gradient-to-r hover:from-pink-600 hover:to-purple-600 transition font-semibold min-w-fit"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <p>Select a user to start chatting</p>
            </div>
          )}
        </div>
      </div>
    );
  }
 
  return (
    <div className="flex flex-col h-screen w-full bg-white"> 
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto text-left pr-4">
          <h2 className="text-lg font-bold text-gray-800">Chat with Admin</h2>
          <p className="text-sm text-gray-500">Get help with your bookings and services</p>
        </div>
      </div>
 
      <div className="flex-1 overflow-y-auto p-4 space-y-4 w-full max-w-5xl mx-auto">
        {loading ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500">No messages yet. Send a message to get started!</div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.sender_id === userId 
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                <p className="break-words">{msg.message_text}</p>
                <p className={`text-xs mt-1 ${
                  msg.sender_id === userId ? "text-blue-100" : "text-gray-500"
                }`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
 
      {error && (
        <div className="px-4 py-2 bg-red-100 text-red-700 border border-red-300 rounded">
          {error}
        </div>
      )}
 
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2 ">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none placeholder-gray-500 focus:placeholder-gray-400 text-gray-700 focus:ring-2 focus:ring-pink-500"
            rows="3"
          />
          <button
            onClick={handleSendMessage}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:bg-gradient-to-r hover:from-pink-600 hover:to-purple-600 transition font-semibold min-w-fit"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;