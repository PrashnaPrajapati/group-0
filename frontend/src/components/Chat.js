import { apiUrl } from "@/lib/apiConfig";
import { useCallback, useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { getToken } from "@/lib/authStorage";
import { Inbox, MessageCircle, MessageSquareReply, Send, Sparkles, UserRound, UsersRound, X } from "lucide-react";
 
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
  const [unreadCounts, setUnreadCounts] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [highlightedMessageKey, setHighlightedMessageKey] = useState(null);
  const messagesEndRef = useRef(null);
  const selectedUserRef = useRef(null);

  const encodeReplyMeta = (meta) => encodeURIComponent(JSON.stringify(meta));

  const decodeReplyMeta = useCallback((value) => {
    try {
      return JSON.parse(decodeURIComponent(value));
    } catch {
      return null;
    }
  }, []);

  const parseMessageText = useCallback((text = "") => {
    const match = String(text).match(/^\[\[reply:([^\]]+)\]\]\n?/);
    if (!match) return { reply: null, text };

    return {
      reply: decodeReplyMeta(match[1]),
      text: String(text).slice(match[0].length),
    };
  }, [decodeReplyMeta]);

  const moveUserConversationToTop = useCallback((conversationUserId, messageData) => {
    if (!isAdmin || !conversationUserId) return;

    setUsersList((current) => {
      const index = current.findIndex((user) => Number(user.id) === Number(conversationUserId));
      if (index === -1) return current;

      const updated = [...current];
      const [conversation] = updated.splice(index, 1);
      updated.unshift({
        ...conversation,
        lastMessageAt: messageData?.created_at || messageData?.timestamp || new Date().toISOString(),
        lastMessage: parseMessageText(messageData?.message_text || "").text,
      });

      return updated;
    });
  }, [isAdmin, parseMessageText]);

  const getMessageKey = (msg, index) => msg.id || `${msg.sender_id}-${msg.created_at}-${index}`;

  const focusRepliedMessage = (reply) => {
    if (!reply) return;

    const targetKey =
      reply.messageKey ||
      messages
        .map((msg, index) => {
          const parsed = parseMessageText(msg.message_text);
          return { key: getMessageKey(msg, index), text: parsed.text };
        })
        .find((item) => item.text === reply.text)?.key;

    if (!targetKey) return;

    const target = document.querySelector(`[data-message-key="${CSS.escape(String(targetKey))}"]`);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageKey(targetKey);
    window.setTimeout(() => {
      setHighlightedMessageKey((current) => (current === targetKey ? null : current));
    }, 1800);
  };
 
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchUnreadCounts = async () => {
      try {
        const token = getToken();
        const res = await fetch(apiUrl("/admin/messages/unread-per-user"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCounts(data);
        }
      } catch (err) {
        console.error("Error fetching unread counts:", err);
      }
    };
    fetchUnreadCounts();
  }, [isAdmin]);

  useEffect(() => {
    if (!socket) {
      socket = io(apiUrl(""));
    }


    const token = getToken();

    const loadingTimeout = setTimeout(() => {
      console.warn("â±ï¸ Loading timeout reached");
      setLoading(false);
    }, 5000);

    socket.on("message_history", (data) => {
      console.log("ðŸ“œ Received message_history:", data);
      setMessages(data.messages || []);
      setLoading(false);
      clearTimeout(loadingTimeout);
    });

    socket.on("admin_list", (data) => {
      console.log("ðŸ”” Received admin_list event. isAdmin:", isAdmin, "data:", data);
      if (!isAdmin) {
        const adminIds = (data && Array.isArray(data.adminIds)) ? data.adminIds : [];
        console.log("ðŸ“‹ Admin IDs from backend:", adminIds);

        let validAdminIds = adminIds;
        if (adminIds.length === 0) {
          console.warn("âš ï¸ No real admins found, using system admin 999999");
          validAdminIds = [999999];
        }

        const firstAdmin = validAdminIds[0];
        console.log("âœ… Setting receiver to:", firstAdmin, "(real admin" + (firstAdmin !== 999999 ? "" : " - system fallback") + ")");

        setAdminIds(validAdminIds);
        setReceiverId(firstAdmin);
        setSelectedUser({ id: firstAdmin, fullName: "Admin" });
        setLoading(false);
        socket.emit("request_history", { conversationUserId: firstAdmin });
      }
    });

    socket.on("receive_message", (messageData) => {
      setMessages((prev) => [...prev, messageData]);
      const current = selectedUserRef.current;
      const conversationUserId = messageData.sender_id;
      moveUserConversationToTop(conversationUserId, messageData);
      if (current && current.id === conversationUserId) {
        socket.emit("mark_as_read", { conversationUserId });
      }
      if (isAdmin && messageData.sender_role === "users") {
        if (!current || current.id !== messageData.sender_id) {
          setUnreadCounts((prev) => ({
            ...prev,
            [messageData.sender_id]: (prev[messageData.sender_id] || 0) + 1,
          }));
        }
      }
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
      if (isAdmin) {
        moveUserConversationToTop(messageData.receiver_id, messageData);
      }
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
  }, [userId, isAdmin, moveUserConversationToTop]);
 
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setReceiverId(user.id);
    setMessages([]);
    setReplyTo(null);
    setLoading(true);
    setUnreadCounts((prev) => ({ ...prev, [user.id]: 0 }));
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
      console.error("âŒ No receiver ID available");
      return;
    }

    setError(null);

    const isSystemAdminFallback = targetReceiverId === 999999;
    const outgoingText = replyTo
      ? `[[reply:${encodeReplyMeta(replyTo)}]]\n${message.trim()}`
      : message.trim();
    
    const optimisticMessage = {
      sender_id: userId,
      receiver_id: targetReceiverId,
      sender_role: isAdmin ? "admin" : "users",
      message_text: outgoingText,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
     
    console.log("ðŸ“¤ Sending message to receiver " + targetReceiverId + (isSystemAdminFallback ? " (system admin fallback)" : " (real admin)"), {
      senderId: userId,
      receiverId: targetReceiverId,
      senderRole: isAdmin ? "admin" : "users",
      message: outgoingText,
    });

    socket.emit("send_message", {
      receiverId: targetReceiverId,
      message: outgoingText,
      senderId: userId,
      senderRole: isAdmin ? "admin" : "users",
    });
 
    socket.emit("mark_as_read", { conversationUserId: targetReceiverId });

    setMessage("");
    setReplyTo(null);
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

  const getInitials = (name = "User") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  const renderMessages = (emptyText, emptySubtext = "We usually reply as soon as an admin is available.") => {
    if (loading) {
      return (
        <div className="flex h-full min-h-64 items-center justify-center text-sm text-gray-500">
          Loading messages...
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div className="flex h-full min-h-64 items-center justify-center px-6 text-center">
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pink-50 text-pink-500">
              <MessageCircle size={28} />
            </div>
            <p className="font-semibold text-gray-800">{emptyText}</p>
            <p className="mt-1 text-sm text-gray-500">{emptySubtext}</p>
          </div>
        </div>
      );
    }

    return messages.map((msg, index) => {
      const isMine = msg.sender_id === userId;
      const parsedMessage = parseMessageText(msg.message_text);
      const replyText = parsedMessage.reply?.text || "";
      const plainText = parsedMessage.text || "";
      const messageKey = getMessageKey(msg, index);

      return (
        <div
          key={messageKey}
          data-message-key={messageKey}
          className={`group flex items-center gap-2 rounded-2xl transition ${
            isMine ? "justify-end" : "justify-start"
          } ${highlightedMessageKey === messageKey ? "bg-amber-100/70 px-2 py-1" : ""}`}
        >
          {!isMine && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-pink-500 shadow-sm ring-1 ring-pink-100">
              <UserRound size={17} />
            </div>
          )}
          {isMine && (
            <button
              type="button"
              onClick={() =>
                setReplyTo({
                  sender: isMine ? "You" : selectedUser?.fullName || "Admin",
                  text: plainText,
                  messageKey,
                })
              }
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rose-100 bg-white text-gray-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              title="Reply"
            >
              <MessageSquareReply size={15} />
            </button>
          )}
          <div
            className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-md ${
              isMine
                ? "rounded-br-md bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
                : "rounded-bl-md border border-gray-100 bg-white text-gray-800"
            }`}
          >
            {replyText && (
              <button
                type="button"
                onClick={() => focusRepliedMessage(parsedMessage.reply)}
                className={`mb-2 block w-full rounded-lg border-l-4 px-2.5 py-1.5 text-left text-xs transition hover:opacity-80 ${
                isMine
                  ? "border-white/60 bg-white/15 text-pink-50"
                  : "border-pink-300 bg-pink-50 text-gray-600"
              }`}>
                <p className="font-semibold">{parsedMessage.reply?.sender || "Reply"}</p>
                <p className="mt-1 line-clamp-2 break-words">{replyText}</p>
              </button>
            )}
            <p className="break-words">{plainText}</p>
            <p className={`mt-1 text-[11px] ${isMine ? "text-pink-100" : "text-gray-400"}`}>
              {formatTime(msg.created_at)}
            </p>
          </div>
          {!isMine && (
            <button
              type="button"
              onClick={() =>
                setReplyTo({
                  sender: selectedUser?.fullName || "Admin",
                  text: plainText,
                  messageKey,
                })
              }
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rose-100 bg-white text-gray-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              title="Reply"
            >
              <MessageSquareReply size={15} />
            </button>
          )}
        </div>
      );
    });
  };

  const renderComposer = (compact = false) => (
    <div className={`${compact ? "p-3" : "p-3 sm:p-4"} border-t border-rose-200 bg-white`}>
      {replyTo && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-rose-600">
              Replying to {replyTo.sender || "message"}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-gray-600">{replyTo.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-white hover:text-rose-600"
            title="Cancel reply"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-3">
        <label htmlFor="chat-message" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message..."
          className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 transition placeholder:text-gray-400"
          rows="1"
        />
        <button
          onClick={handleSendMessage}
          disabled={!message.trim()} 
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-200 transition hover:from-pink-600 hover:to-fuchsia-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={19} />
        </button>
      </div>
    </div>
  );
 
  if (isAdmin) {
    return (
      <div className="flex h-[calc(100vh-9rem)] min-h-[620px] overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-xl shadow-pink-100/60">
        <div className="flex w-80 shrink-0 flex-col border-r border-pink-100 bg-gradient-to-b from-white to-pink-50/70">
          <div className="border-b border-pink-100 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Conversations</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {usersList.length} {usersList.length === 1 ? "customer" : "customers"}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-500 ring-1 ring-pink-100">
                <UsersRound size={22} />
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex flex-1 items-center justify-center px-5 text-sm text-gray-500">
              Loading users...
            </div>
          ) : usersList.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-pink-500 shadow-sm ring-1 ring-pink-100">
                  <Inbox size={26} />
                </div>
                <p className="font-semibold text-gray-800">No users available</p>
                <p className="mt-1 text-sm text-gray-500">New customer chats will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {usersList.map((user) => {
                const isSelected = selectedUser?.id === user.id;
                const isOnline = onlineUsers.has(user.id);
                const unreadCount = unreadCounts[user.id] || 0;
                const displayName = user.fullName || `User ${user.id}`;

                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)} 
                    className={`w-full rounded-xl px-3 py-3 text-left transition ${
                      isSelected
                        ? "bg-white shadow-md shadow-pink-100 ring-1 ring-pink-100"
                        : "hover:bg-white/80 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600 text-sm font-bold text-white">
                        {getInitials(displayName)}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                            isOnline ? "bg-emerald-400" : "bg-gray-300"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-semibold text-gray-900">{displayName}</p>
                          {unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1.5 text-xs font-bold text-white">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-gray-500">
                          {user.lastMessage || (isOnline ? "Online now" : user.gender || "Customer")}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
 
        <div className="flex min-w-0 flex-1 flex-col bg-white">
          {selectedUser ? (
            <> 
              <div className="border-b border-pink-100 bg-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600 text-sm font-bold text-white shadow-md shadow-pink-100">
                    {getInitials(selectedUser.fullName || `User ${selectedUser.id}`)}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                        onlineUsers.has(selectedUser.id) ? "bg-emerald-400" : "bg-gray-300"
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-gray-900">
                      {selectedUser.fullName || `User ${selectedUser.id}`}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {onlineUsers.has(selectedUser.id) ? "Online now" : "Offline"}
                    </p>
                    <p className="hidden">
                      {onlineUsers.has(selectedUser.id) ? (
                        <span className="text-green-600">â— Online</span>
                      ) : (
                        <span className="text-gray-500">â— Offline</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
 
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-pink-50/60 to-white p-5">
                <div className="space-y-4">
                  {renderMessages("No messages yet. Start a conversation!", "The next message in this conversation will appear here.")}
                  <div ref={messagesEndRef} />
                </div>
              </div>
 
              {error && (
                <div className="mx-5 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
 
              {renderComposer(true)}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-pink-50/60 to-white px-6 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-pink-500 shadow-sm ring-1 ring-pink-100">
                  <MessageCircle size={30} />
                </div>
                <p className="text-lg font-semibold text-gray-900">Select a conversation</p>
                <p className="mt-1 text-sm text-gray-500">Choose a customer from the left to view messages.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
 
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 px-4 pb-6 pt-5 sm:px-6">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-xl shadow-pink-100/60">
        <div className="border-b border-pink-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-md shadow-pink-200">
                <Sparkles size={22} />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900">Chat with Admin</h2>
                <p className="truncate text-sm text-gray-500">
                  Message admin about bookings, packages, and services
                </p>
              </div>
            </div>
            <div className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 sm:block">
              Admin chat
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-pink-50/70 to-white p-4 sm:p-6">
          <div className="mx-auto max-w-3xl space-y-3">
            {messages.length > 0 && (
              <div className="flex justify-center">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-500 shadow-sm ring-1 ring-rose-100">
                  Today
                </span>
              </div>
            )}
            {renderMessages("No messages yet. Send a message to get started!")}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {error && (
          <div className="mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6">
            {error}
          </div>
        )}

        <div className="mx-auto w-full max-w-3xl">
          {renderComposer()}
        </div>
      </div>
    </div>
  );
};

export default Chat;
