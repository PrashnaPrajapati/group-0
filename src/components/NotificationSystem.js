"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { useRouter, usePathname } from "next/navigation";
import { getToken } from "@/lib/authStorage";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function NotificationSystem({ userId, userRole, onChatCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [socket, setSocket] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const dropdownId = "notifications-dropdown";
  const { i18n, t } = useTranslation();
  const languageCode = i18n.language || "en";
 
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const normalizeNotification = useCallback((n) => {
    if (!n) return n;
    return {
      ...n,
      relatedId: n.relatedId ?? n.related_id ?? null,
      isRead: Boolean(n.isRead ?? n.is_read ?? n.is_read === 1),
      createdAt: n.createdAt ?? n.created_at ?? n.createdAt,
    };
  }, []);

  const unreadCount = notifications.filter(
    (n) => !n.isRead && n.type !== "chat_message"
  ).length;

  useEffect(() => {
    if (!onChatCountChange) return;
    const chatUnread = notifications.filter(n => n.type === "chat_message" && !n.isRead).length;
    onChatCountChange(chatUnread);
  }, [notifications, onChatCountChange]);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = getToken();
      const response = await fetch(apiUrl("/notifications?limit=20"), {
        headers: { Authorization: `Bearer ${token}` },
      }); 
      if (response.ok) {
        const data = await response.json();
        setNotifications((Array.isArray(data) ? data : []).map(normalizeNotification));
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [normalizeNotification]);

  useEffect(() => {
    if (!userId) return;

    const newSocket = io(apiUrl(""));
    setSocket(newSocket);
 
    newSocket.emit("register_for_notifications", {
      userId: parseInt(userId),
      role: userRole,
    });
 
    newSocket.on("new_notification", (notification) => {
      const onChatPage =
        pathnameRef.current === "/chat" || pathnameRef.current === "/admin/chat";
      const shouldAutoReadChat = onChatPage && notification.type === "chat_message";
      const normalizedNotification = normalizeNotification({
        ...notification,
        isRead: shouldAutoReadChat ? true : notification.isRead,
      });

      setNotifications(prev => [normalizedNotification, ...prev]);

      if (shouldAutoReadChat) {
        newSocket.emit("mark_notification_read", { notificationId: notification.id });
      }

      if (notification.type !== "chat_message") {
        toast.info(notification.title, { position: "top-right", autoClose: 5000 });
      }
    });
 
    newSocket.on("chat_notifications_read", (data) => {
      const readIds = new Set(data.notificationIds || []);
      setNotifications(prev =>
        prev.map(n => (readIds.has(n.id) ? { ...n, isRead: true } : n))
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, [userId, userRole, normalizeNotification]); 
  useEffect(() => {
    if (!userId) return;
    fetchNotifications(); 
  }, [userId, fetchNotifications]);

  const markAsRead = (notificationId) => {
    if (socket) {
      socket.emit("mark_notification_read", { notificationId });
    } 
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    if (socket) {
      socket.emit("mark_all_notifications_read");
    }
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
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
    if (diffDays === 0) return date.toLocaleTimeString(languageCode, { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return t("notifications.yesterday");
    if (diffDays < 7) return t("notifications.daysAgo", { count: diffDays });
    return date.toLocaleDateString(languageCode);
  };

  return (
    <div className="relative"> 
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
        aria-label={unreadCount > 0 ? t("notifications.openWithCount", { count: unreadCount }) : t("notifications.open")}
        aria-haspopup="dialog"
        aria-expanded={showDropdown}
        aria-controls={dropdownId}
      >
        <Bell size={24} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold leading-none text-white ring-2 ring-white" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
 
      {showDropdown && (
        <div id={dropdownId} className="absolute right-0 mt-3 w-80 bg-white border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto" role="dialog" aria-labelledby="notifications-heading"> 
          <div className="flex justify-between items-center p-4 border-b">
            <h3 id="notifications-heading" className="font-semibold text-gray-800">{t("notifications.heading")}</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>
 
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">{t("notifications.empty")}</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`block w-full p-4 border-b text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-inset ${
                    !notification.isRead ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  aria-label={`${notification.title}. ${notification.message}. ${notification.isRead ? t("common.read") : t("common.unread")}`}
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
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-2" aria-hidden="true"></div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
 
          <div className="p-3 border-t text-center">
            <button
              onClick={() => setShowDropdown(false)}
              className="text-sm text-gray-600 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
 
      {showDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} aria-hidden="true" />
      )}
    </div>
  );
}
