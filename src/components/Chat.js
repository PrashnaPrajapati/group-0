import { apiUrl } from "@/lib/apiConfig";
import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { getToken } from "@/lib/authStorage";
import { Inbox, MessageCircle, Send, Sparkles, UserRound, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";

let socket = null;

const Chat = ({ userId, isAdmin }) => {
  const { i18n, t } = useTranslation();
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
  const messagesEndRef = useRef(null);
  const selectedUserRef = useRef(null);
 
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
      setError(errData.message || t("chat.genericError"));
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
  }, [userId, isAdmin, t]);
 
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setReceiverId(user.id);
    setMessages([]);
    setLoading(true);
    setUnreadCounts((prev) => ({ ...prev, [user.id]: 0 }));
    socket.emit("request_history", { conversationUserId: user.id });
  };
 
  const handleSendMessage = () => {
    if (!message.trim()) {
      setError(t("chat.emptyMessage"));
      return;
    }

    const targetReceiverId = receiverId || (adminIds && adminIds.length > 0 ? adminIds[0] : 999999);

    if (!targetReceiverId) {
      setError(t("chat.unableToSend"));
      console.error("âŒ No receiver ID available");
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
     
    console.log("ðŸ“¤ Sending message to receiver " + targetReceiverId + (isSystemAdminFallback ? " (system admin fallback)" : " (real admin)"), {
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
      return date.toLocaleTimeString(i18n.language || "en", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getInitials = (name = t("common.user")) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  const renderMessages = (emptyText, emptySubtext = t("chat.replySoon")) => {
    if (loading) {
      return (
        <div className="flex h-full min-h-64 items-center justify-center text-sm text-gray-500">
          {t("chat.loadingMessages")}
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div className="flex h-full min-h-64 items-center justify-center px-6 text-center">
          <div>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pink-50 text-pink-500">
              <MessageCircle size={28} aria-hidden="true" />
            </div>
            <p className="font-semibold text-gray-800">{emptyText}</p>
            <p className="mt-1 text-sm text-gray-500">{emptySubtext}</p>
          </div>
        </div>
      );
    }

    return messages.map((msg, index) => {
      const isMine = msg.sender_id === userId;

      return (
        <div key={index} className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
          {!isMine && (
            <div className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-pink-500 shadow-sm ring-1 ring-pink-100">
              <UserRound size={17} aria-hidden="true" />
            </div>
          )}
          <div
            className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-md ${
              isMine
                ? "rounded-br-md bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white"
                : "rounded-bl-md border border-gray-100 bg-white text-gray-800"
            }`}
          >
            <p className="break-words">{msg.message_text}</p>
            <p className={`mt-1 text-[11px] ${isMine ? "text-pink-100" : "text-gray-400"}`}>
              {formatTime(msg.created_at)}
            </p>
          </div>
        </div>
      );
    });
  };

  const renderComposer = (compact = false) => (
    <div className={`${compact ? "p-4" : "p-4 sm:p-5"} border-t border-gray-100 bg-white`}>
      <div className="flex items-end gap-3">
        <label htmlFor="chat-message" className="sr-only">
          {t("chat.messageLabel")}
        </label>
        <textarea
          id="chat-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={t("chat.placeholder")}
          className="max-h-32 min-h-12 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-100"
          rows={compact ? "2" : "3"}
        />
        <button
          onClick={handleSendMessage}
          disabled={!message.trim()}
          aria-label={t("chat.send")}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-200 transition hover:from-pink-600 hover:to-fuchsia-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={19} aria-hidden="true" />
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
                <h2 className="text-xl font-bold text-gray-900">{t("chat.conversations")}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {t("chat.customerCount", { count: usersList.length })}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-500 ring-1 ring-pink-100">
                <UsersRound size={22} />
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="flex flex-1 items-center justify-center px-5 text-sm text-gray-500">
              {t("chat.loadingUsers")}
            </div>
          ) : usersList.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-pink-500 shadow-sm ring-1 ring-pink-100">
                  <Inbox size={26} aria-hidden="true" />
                </div>
                <p className="font-semibold text-gray-800">{t("chat.noUsers")}</p>
                <p className="mt-1 text-sm text-gray-500">{t("chat.newChatsAppear")}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {usersList.map((user) => {
                const isSelected = selectedUser?.id === user.id;
                const isOnline = onlineUsers.has(user.id);
                const unreadCount = unreadCounts[user.id] || 0;
                const displayName = user.fullName || `${t("common.user")} ${user.id}`;

                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    aria-pressed={isSelected}
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
                          {isOnline ? t("chat.onlineNow") : user.gender || t("chat.customer")}
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
                    {getInitials(selectedUser.fullName || `${t("common.user")} ${selectedUser.id}`)}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                        onlineUsers.has(selectedUser.id) ? "bg-emerald-400" : "bg-gray-300"
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-gray-900">
                      {selectedUser.fullName || `${t("common.user")} ${selectedUser.id}`}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {onlineUsers.has(selectedUser.id) ? t("chat.onlineNow") : t("chat.offline")}
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
 
              <div className="flex-1 overflow-y-auto bg-gradient-to-b from-pink-50/60 to-white p-5" role="log" aria-live="polite" aria-label={t("chat.conversationMessages")}>
                <div className="space-y-4">
                  {renderMessages(t("chat.noMessagesAdmin"), t("chat.nextMessageAppears"))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
 
              {error && (
                <div className="mx-5 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}
 
              {renderComposer(true)}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-pink-50/60 to-white px-6 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-pink-500 shadow-sm ring-1 ring-pink-100">
                  <MessageCircle size={30} aria-hidden="true" />
                </div>
                <p className="text-lg font-semibold text-gray-900">{t("chat.selectConversation")}</p>
                <p className="mt-1 text-sm text-gray-500">{t("chat.chooseCustomer")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
 
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-gradient-to-br from-rose-50 via-white to-fuchsia-50">
      <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white/85 backdrop-blur">
        <div className="border-b border-pink-100 bg-white py-4 pl-32 pr-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-md shadow-pink-200">
              <Sparkles size={22} aria-hidden="true" />
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900">{t("chat.withAdmin")}</h2>
              <p className="truncate text-sm text-gray-500">{t("chat.adminHelp")}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-pink-50/70 to-white p-4 sm:p-6" role="log" aria-live="polite" aria-label={t("chat.conversationMessages")}>
          <div className="space-y-4">
            {renderMessages(t("chat.noMessagesUser"))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {error && (
          <div className="mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6" role="alert">
            {error}
          </div>
        )}

        {renderComposer()}
      </div>
    </div>
  );
};

export default Chat;
