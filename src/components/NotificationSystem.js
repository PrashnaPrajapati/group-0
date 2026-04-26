"use client";

import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/authStorage";

export default function NotificationSystem({ userId, userRole, onChatCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [socket, setSocket] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  // Keep pathname in a ref so socket event handlers always see the latest value
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const normalizeNotification = (n) => {
    if (!n) return n;
    return {
      ...n,
      relatedId: n.relatedId ?? n.related_id ?? null,
      isRead: Boolean(n.isRead ?? n.is_read ?? n.is_read === 1),
      createdAt: n.createdAt ?? n.created_at ?? n.createdAt,
    };
  };

  // Report chat unread count to parent whenever notifications change
  useEffect(() => {
    if (!onChatCountChange) return;
    const chatUnread = notifications.filter(n => n.type === "chat_message" && !n.isRead).length;
    onChatCountChange(chatUnread);
  }, [notifications, onChatCountChange]);

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;

    const newSocket = io("http://localhost:5001");
    setSocket(newSocket);
 
    newSocket.emit("register_for_notifications", {
      userId: parseInt(userId),
      role: userRole,
    });
 
    newSocket.on("new_notification", (notification) => {
      setNotifications(prev => [normalizeNotification(notification), ...prev]);
      setUnreadCount(notification.unreadCount);

      // Suppress chat toast when the user is already on a chat page
      const onChatPage =
        pathnameRef.current === "/chat" || pathnameRef.current === "/admin/chat";
      if (!onChatPage || notification.type !== "chat_message") {
        toast.info(notification.title, { position: "top-right", autoClose: 5000 });
      }
    });
 
    newSocket.on("notification_count_updated", (data) => {
      setUnreadCount(data.unreadCount);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [userId, userRole]);

  // Fetch initial notifications
  useEffect(() => {
    if (!userId) return;
    fetchNotifications(); 
    fetchUnreadCount();
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const token = getToken();
      const response = await fetch("http://localhost:5001/notifications?limit=20", {
        headers: { Authorization: `Bearer ${token}` },
      }); 
      if (response.ok) {
        const data = await response.json();
        setNotifications((Array.isArray(data) ? data : []).map(normalizeNotification));
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = getToken();
      const response = await fetch("http://localhost:5001/notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      }); 
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const markAsRead = (notificationId) => {
    if (socket) {
      socket.emit("mark_notification_read", { notificationId });
    } 
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    if (socket) {
      socket.emit("mark_all_notifications_read");
    }
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.type === "chat_message") {
      setShowDropdown(false);
      router.push(userRole === "admin" ? "/admin/chat" : "/chat");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(Math.abs(now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative text-2xl p-2 hover:bg-gray-100 rounded-full"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-3 w-80 bg-white border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No notifications yet</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    !notification.isRead ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">{notification.title}</p>
                      <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-2"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t text-center">
            <button
              onClick={() => setShowDropdown(false)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Overlay */}
      {showDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
      )}
    </div>
  );
}
