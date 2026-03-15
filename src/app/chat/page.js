"use client"; // Mark as a client-side component

import { useState, useEffect } from "react";
import * as jwt_decode from "jwt-decode"; // Decode JWT token
import Chat from "@/components/Chat";

export default function UserChatPage() {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken"); // Retrieve token from localStorage

    if (token) {
      const decodedToken = jwt_decode(token); // Decode the JWT token
      if (decodedToken.role === "users") {
        setUserId(decodedToken.userId); // Set the user ID if role is 'user'
      }
    }
  }, []); // Runs once after component mounts

  return (
    <div>
      <h1 className="text-3xl text-center my-4">User Chat</h1>
      {userId ? (
        <Chat userId={userId} isAdmin={false} /> // Only render Chat if userId is set
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}