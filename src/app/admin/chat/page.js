"use client"; // Add this to mark the component as a Client Component

import { useState, useEffect } from "react";
import * as jwt_decode from "jwt-decode"; // Correct way to import jwt-decode
import Chat from "@/components/Chat";

export default function AdminChatPage() {
  const [adminId, setAdminId] = useState(null);

  useEffect(() => {
    // Get the JWT token from localStorage (or cookies)
    const token = localStorage.getItem("authToken");

    if (token) {
      // Decode the JWT token
      const decodedToken = jwt_decode(token);  // Decode the token

      // Extract the admin ID from the decoded token
      if (decodedToken.role === "admin") {
        setAdminId(decodedToken.userId);  // Set the admin ID if the role is 'admin'
      }
    }
  }, []); // This effect runs once after the component mounts

  return (
    <div>
      <h1 className="text-3xl text-center my-4">Admin Chat</h1>
      {adminId && <Chat userId={adminId} isAdmin={true} />}  {/* Only render Chat if adminId is fetched */}
    </div>
  );
}