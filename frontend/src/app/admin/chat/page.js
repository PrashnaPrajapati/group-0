"use client"; 

import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import Chat from "@/components/Chat";
import AdminSidebar from "@/components/AdminSidebar";
import Link from "next/link";
import { getToken } from "@/lib/authStorage";

export default function AdminChatPage() {
  const [adminId, setAdminId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🔐 Admin chat page useEffect running...");
     
    const token = getToken();
    
    console.log("📦 Token from localStorage:", token ? "✅ Found" : "❌ Not found");
    console.log("🔍 All localStorage keys:", Object.keys(localStorage));

    if (token) {
      try {
        console.log("🔓 Attempting to decode token...");
        const decodedToken = jwtDecode(token);  
        console.log("✅ Token decoded successfully");
        console.log("📋 Decoded token:", decodedToken);
 
        if (decodedToken.role === "admin") {
          console.log("👤 Admin role confirmed, setting adminId:", decodedToken.id);
          setAdminId(decodedToken.id);  
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
  }, []); 

  if (loading) {
    return <p className="text-center mt-4">Loading...</p>;
  }

  if (!adminId) {
    return (
      <div className="text-center mt-8">
        <p className="text-lg">Admin access required.</p>
        <p className="text-sm text-gray-500 mt-2"><Link href="/login" className="text-blue-500 hover:underline">Go to login</Link></p>
      </div>
    );
  }

  return (
    <AdminSidebar>
      <div className="pl-16">
        <Chat userId={adminId} isAdmin={true} />
      </div>
    </AdminSidebar>
  );
}
