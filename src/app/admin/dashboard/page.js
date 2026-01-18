"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminDashboardUI from "../../../components/AdminDashboardUI"; // <-- import your component

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
      router.replace("/login"); // redirect to login if not logged in
      return;
    }

    if (role !== "admin") {
      router.replace("/dashboard"); // redirect non-admin users
      return;
    }
  }, [router]);

  return (
    <div>
      <AdminDashboardUI />  {/* <-- your component goes here */}
    </div>
  );
}
