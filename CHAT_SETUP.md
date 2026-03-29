# Chat Integration Setup Guide

## Overview

The chat system has been completely rebuilt with the following features:

✅ **Database Persistence** - All messages are stored in MySQL
✅ **Message History** - Users and admins can see previous conversations
✅ **JWT Authentication** - Socket.io events require valid authentication tokens
✅ **Online Status Tracking** - See which users are currently online
✅ **Real-time Messaging** - Socket.io based instant message delivery
✅ **Read Receipts** - Track which messages have been read
✅ **Error Handling** - Comprehensive error messages and validation

---

## Setup Instructions

### 1. Create Database Tables

Run the following SQL in your MySQL client or database management tool:

```sql
-- Create messages table for chat system
CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  sender_role ENUM('users', 'admin') NOT NULL,
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_conversation (sender_id, receiver_id),
  INDEX idx_created_at (created_at),
  INDEX idx_is_read (is_read)
);

-- Create conversations table to track active conversations
CREATE TABLE IF NOT EXISTS conversations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  admin_id INT NOT NULL,
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_conversation (user_id, admin_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_id (admin_id)
);
```

### 2. Environment Variables

Ensure your `.env` file in the backend directory contains:

```env
JWT_SECRET=your_secret_key_here
```

### 3. Files Modified/Created

**New Files:**
- `backend/chatHandler.js` - Socket.io event handlers with database integration
- `backend/migrations/create_messages_table.sql` - Database schema

**Modified Files:**
- `backend/index.js` - Integrated new chat handler
- `src/components/Chat.js` - Complete rewrite with message history and proper UI
- `src/app/chat/page.js` - Enhanced with error handling
- `src/app/admin/chat/page.js` - Enhanced with error handling

### 4. Start/Restart Backend

```bash
cd backend
npm install  # If you haven't installed dependencies yet
node index.js
```

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────┐
│            Frontend (Next.js)               │
├─────────────────────────────────────────────┤
│  User Chat Page          │  Admin Chat Page│
│  (src/app/chat)          │  (src/app/admin/chat)
└────────────┬──────────────┬────────────────┘
             │ Socket.io    │
             └──────┬───────┘
                    │
        ┌───────────┴────────────┐
        │                        │
    ┌───────────────────────────────────┐
    │  Backend (Express + Socket.io)    │
    │  (backend/chatHandler.js)         │
    └────────────┬────────────────────┘
                 │
        ┌────────┴──────────┐
        │                   │
    ┌───────────┐     ┌──────────────┐
    │  MySQL    │     │ In-Memory    │
    │           │     │ Online Users │
    │ messages  │     │ Online Admins│
    │ table     │     │              │
    └───────────┘     └──────────────┘
```

### User Flow

1. **User Connects**
   - User navigates to `/chat`
   - Extracts JWT token from localStorage
   - Sends `register_user` with userId and token
   - Backend verifies token and stores user's socket connection

2. **Message History Load**
   - User emits `request_history` event
   - Backend queries messages table for conversation
   - Sends back up to 100 most recent messages

3. **Send Message**
   - User types message and clicks Send
   - Message is saved to MySQL
   - If admin/receiver is online, message is delivered in real-time
   - User receives confirmation with message ID

4. **Receive Message**
   - Backend emits `receive_message` to recipient's socket
   - messages are marked as read when user opens conversation

### Admin Flow

1. **Admin Connects**
   - Admin navigates to `/admin/chat`
   - Sends `register_admin` with adminId and token
   - Backend verifies token and requests users list

2. **View Users List**
   - Backend returns list of all users
   - Admin sees which users are online (green dot)
   - Click on user to open conversation

3. **Chat with User**
   - Same as user flow but reversed roles
   - Admin can see all messages with specific user
   - Can respond in real-time

---

## Event Reference

### Client → Server Events

| Event | Data | Purpose |
|-------|------|---------|
| `register_user` | `{ userId, token }` | Register user for chat |
| `register_admin` | `{ adminId, token }` | Register admin for chat |
| `request_history` | `{ conversationUserId }` | Load previous messages |
| `send_message` | `{ receiverId, message }` | Send new message |
| `mark_as_read` | `{ conversationUserId }` | Mark messages as read |
| `get_users` | None | Get list of users (admin only) |

### Server → Client Events

| Event | Data | Purpose |
|-------|------|---------|
| `message_history` | `{ messages, conversationUserId }` | Historical messages |
| `receive_message` | Message object | New incoming message |
| `message_sent` | Message object | Confirmation message was saved |
| `users_list` | `{ users, onlineUsers }` | List of users (admin) |
| `user_online` | `{ userId, isOnline }` | User online status changed |
| `error` | `{ message }` | Error occurred |

---

## Message Object Format

```javascript
{
  id: 123,                          // Database ID
  sender_id: 5,                     // User ID who sent
  receiver_id: 1,                   // User ID who receives
  sender_role: "users",             // "users" or "admin"
  message_text: "Hello there!",     // Message content
  is_read: false,                   // Whether viewed
  created_at: "2024-01-15T10:30:00Z"  // ISO timestamp
}
```

---

## Testing Checklist

- [ ] Create database tables using SQL above
- [ ] Start backend server
- [ ] Login as a regular user
- [ ] Navigate to `/chat`
- [ ] See message input ready
- [ ] Send a message
- [ ] Login as admin in different browser/incognito
- [ ] Navigate to `/admin/chat`
- [ ] See list of users with online status
- [ ] Click on the user you sent message as
- [ ] See message history (including the message sent)
- [ ] Send reply as admin
- [ ] Check user received message in real-time
- [ ] Refresh user chat page
- [ ] Verify message history persisted

---

## Troubleshooting

### Messages Not Sending

1. Check browser console for errors
2. Verify backend is running (`node backend/index.js`)
3. Check JWT token is valid (hasn't expired)
4. Look at server terminal for error messages

### Database Connection Error

1. Verify MySQL is running
2. Check credentials in `backend/db.js`
3. Verify database name is correct
4. Run the SQL migration to create tables

### Socket.io Connection Failed

1. Check backend URL is correct (http://localhost:5001)
2. Verify CORS is not blocked
3. Check firewall isn't blocking port 5001

### Online Status Not Updating

1. Make sure socket connection is established
2. Try refreshing the page
3. Check browser console for errors

---

## Next Improvements

Consider these enhancements:

1. **Message Attachments** - Allow users to upload images/files
2. **Typing Indicators** - Show "Admin is typing..."
3. **Delivery Status** - Show message sent/delivered/read indicators
4. **Search Messages** - Search through conversation history
5. **Notifications** - Desktop/email notifications for new messages
6. **Message Reactions** - Emoji reactions to messages
7. **Conversation Archiving** - Archive old conversations
8. **Admin Availability Status** - Set admin as busy/away/offline

---

## File Locations

- **Frontend Components**: `src/components/Chat.js`, `src/app/chat/page.js`, `src/app/admin/chat/page.js`
- **Backend Chat Logic**: `backend/chatHandler.js`
- **Backend Entry Point**: `backend/index.js`
- **Database Schema**: `backend/migrations/create_messages_table.sql`
- **Documentation**: This file (`CHAT_SETUP.md`)
