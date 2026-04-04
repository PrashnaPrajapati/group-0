"use client";

import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode"; 
import Chat from "@/components/Chat";

export default function UserChatPage() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔐 Chat page useEffect running...");
    
    const token = localStorage.getItem("token"); 
    
    console.log("📦 Token from localStorage:", token ? "✅ Found" : "❌ Not found");
    console.log("🔍 All localStorage keys:", Object.keys(localStorage));

    if (token) {
      try {
        console.log("🔓 Attempting to decode token...");
        const decodedToken = jwtDecode(token); 
        console.log("✅ Token decoded successfully");
        console.log("📋 Decoded token:", decodedToken);
        
        if (decodedToken.role === "users") {
          console.log("👤 User role confirmed, setting userId:", decodedToken.id);
          setUserId(decodedToken.id); 
        } else {
          console.warn("⚠️ User has admin role, not users role. Role:", decodedToken.role);
        }
      } catch (error) {
        console.error("❌ Error decoding token:", error.message);
        console.error("Full error:", error);
      }
    } else {
      console.warn("⚠️ No auth token found in localStorage");
    }
    setLoading(false);
  }, []); 

  if (loading) {
    return <p className="text-center mt-4">Loading...</p>;
  }

  if (!userId) {
    return (
      <div className="text-center mt-8">
        <p className="text-lg">Please log in to access chat.</p>
        <p className="text-sm text-gray-500 mt-2"><a href="/login" className="text-blue-500 hover:underline">Go to login</a></p>
      </div>
    );
  }

  return (
    <div>
      <Chat userId={userId} isAdmin={false} />
    </div>
  );
}