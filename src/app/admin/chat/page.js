"use client"; // Add this to mark the component as a Client Component

import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode"; // Correct way to import jwt-decode
import Chat from "@/components/Chat";

export default function AdminChatPage() {
  const [adminId, setAdminId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔐 Admin chat page useEffect running...");
    
    // Get the JWT token from localStorage (or cookies)
    const token = localStorage.getItem("token");
    
    console.log("📦 Token from localStorage:", token ? "✅ Found" : "❌ Not found");
    console.log("🔍 All localStorage keys:", Object.keys(localStorage));

    if (token) {
      try {
        console.log("🔓 Attempting to decode token...");
        // Decode the JWT token
        const decodedToken = jwtDecode(token);  // Decode the token
        console.log("✅ Token decoded successfully");
        console.log("📋 Decoded token:", decodedToken);

        // Extract the admin ID from the decoded token
        if (decodedToken.role === "admin") {
          console.log("👤 Admin role confirmed, setting adminId:", decodedToken.id);
          setAdminId(decodedToken.id);  // Use 'id' from token, not 'userId'
        } else {
          console.warn("⚠️ User does not have admin role. Role:", decodedToken.role);
        }
      } catch (error) {
        console.error("❌ Error decoding token:", error.message);
        console.error("Full error:", error);
      }
    } else {
      console.warn("⚠️ No auth token found in localStorage");
    }
    setLoading(false);
  }, []); // This effect runs once after the component mounts

  if (loading) {
    return <p className="text-center mt-4">Loading...</p>;
  }

  if (!adminId) {
    return (
      <div className="text-center mt-8">
        <p className="text-lg">Admin access required.</p>
        <p className="text-sm text-gray-500 mt-2"><a href="/login" className="text-blue-500 hover:underline">Go to login</a></p>
      </div>
    );
  }

  return (
    <div>
      <Chat userId={adminId} isAdmin={true} />
    </div>
  );
}