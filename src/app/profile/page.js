"use client";

import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import TextInput from "@/components/TextInput";
import PasswordInput from "@/components/PasswordInput";
import Button from "@/components/Button";
import {User, Mail, Phone, MapPin, Lock} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
 
export default function ProfilePage() {
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    address: "",
    photoUrl: "", 
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [token, setToken] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
 
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) setToken(storedToken);
  }, []);
 
  useEffect(() => {
    if (!token) return;
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await fetch("http://localhost:5001/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || `Request failed with status ${res.status}`);
 
        if (data.photoUrl && !data.photoUrl.startsWith("http")) {
          data.photoUrl = `http://localhost:5001${data.photoUrl}`;
        }

        setProfile({
          fullName: data.fullName || "",
          email: data.email || "",
          phone: data.phone || "",
          gender: data.gender || "",
          address: data.address || "",
          photoUrl: data.photoUrl || "",});
              } catch (err) {
                toast.error("Failed to load profile");
                console.error(err);
              } finally {
                setLoadingProfile(false);
              }
            };
    fetchProfile();
  }, [token]);

  const handleProfileChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });
  const handlePasswordChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });

  const saveProfile = async () => {
    try {
      setLoadingProfile(true);
      const toastId = toast.info("Saving profile...", { autoClose: false });
      const res = await fetch("http://localhost:5001/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: profile.fullName, phone: profile.phone, address: profile.address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Request failed with status ${res.status}`);
      toast.update(toastId, { render: "Profile updated successfully!", type: "success", autoClose: 3000 });
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
      console.error(err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmNewPassword) {
      toast.error("All password fields are required");
      return;
    }
    if (passwords.newPassword !== passwords.confirmNewPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    try {
      setLoadingPassword(true);
      const toastId = toast.info("Changing password...", { autoClose: false });
      const res = await fetch("http://localhost:5001/profile/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(passwords),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Request failed with status ${res.status}`);
      toast.update(toastId, { render: "Password changed successfully!", type: "success", autoClose: 3000 });
      setPasswords({ currentPassword: "", newPassword: "" });
    } catch (err) {
      toast.error(err.message || "Failed to change password");
      console.error(err);
    } finally {
      setLoadingPassword(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await fetch("http://localhost:5001/profile/photo", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Upload failed with status ${res.status}`);

      setProfile({ ...profile, photoUrl: `http://localhost:5001${data.photoUrl}` });
      toast.success("Profile photo updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to upload photo");
      console.error("Photo upload error:", err);
    }
  };

return (
  <div className="flex">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      <div className={`flex-1 bg-gray-50 min-h-screen ${isOpen ? "md:ml-70" : "pl-16 md:pl-8"}`}>
      <Navbar />
      <div className="flex flex-col min-h-screen pt-20">
  <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center space-y-6">
    <ToastContainer position="top-center" />
 
    <div className="text-center space-y-2">
      <h1 className="text-4xl font-bold text-gray-800">My Profile</h1>
      <p className="text-gray-600 text-lg">Manage and Edit your personal information</p>
    </div>
 
    <div className="bg-white border border-pink-200 p-8 rounded-3xl shadow-lg w-full max-w-5xl flex flex-col md:flex-row md:items-center md:space-x-12 space-y-6 md:space-y-0">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-300">
          <img
            src={profile.photoUrl || "/default-avatar.png"}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
        <label className="cursor-pointer text-blue-600 hover:underline">
         Update Photo
          <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
        </label>
      </div>
      <div className="flex-1 space-y-4">
        <h2 className="font-semibold text-xl text-gray-800">Edit Profile</h2>
        <TextInput
          label="Full Name"
          name="fullName"
          placeholder="Enter full name"
          value={profile.fullName}
          onChange={handleProfileChange}
          disabled={loadingProfile}
          icon={User}
        />
        <TextInput
          label="Phone"
          name="phone"
          placeholder="Enter phone number"
          value={profile.phone}
          onChange={handleProfileChange}
          disabled={loadingProfile}
          icon={Phone}
        />
        <TextInput
          label="Address"
          name="address"
          placeholder="Enter address"
          value={profile.address || ""}
          onChange={handleProfileChange}
          disabled={loadingProfile}
          icon={MapPin}
        />
        <Button onClick={saveProfile} fullWidth disabled={loadingProfile}>
          {loadingProfile ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
 
    <div className="bg-white border border-pink-200 p-8 rounded-3xl shadow-lg w-full max-w-5xl flex flex-col md:flex-row md:space-x-8 space-y-4 md:space-y-0">
      <div className="flex-1 space-y-2">
        <h2 className="font-semibold text-xl text-gray-800">Personal Information</h2>
        <TextInput label="Full Name" value={profile.fullName} disabled icon={User} />
        <TextInput label="Email" value={profile.email} disabled icon={Mail} />
        <TextInput label="Phone" value={profile.phone} disabled icon={Phone} />
        <TextInput label="Gender" value={profile.gender} disabled icon={User} />
        <TextInput label="Address" value={profile.address || ""} disabled icon={MapPin} />
      </div>
    </div>
 
    <div className="bg-white border border-pink-200 p-8 rounded-3xl shadow-lg w-full max-w-5xl flex flex-col md:flex-row md:space-x-8 space-y-4 md:space-y-0">
      <div className="flex-1 space-y-4">
        <h2 className="font-semibold text-xl text-gray-800">Change Password</h2>
        <PasswordInput
          label="Current Password"
          name="currentPassword"
          placeholder="Enter current password"
          value={passwords.currentPassword}
          onChange={handlePasswordChange}
          disabled={loadingPassword}
          icon={Lock}
        />
        <PasswordInput
          label="New Password"
          name="newPassword"
          placeholder="Enter new password"
          value={passwords.newPassword}
          onChange={handlePasswordChange}
          disabled={loadingPassword}
          icon={Lock}
        />

        <PasswordInput
          label="Confirm New Password"
          name="confirmNewPassword"
          placeholder="Confirm new password"
          value={passwords.confirmNewPassword || ""}
          onChange={(e) => setPasswords({ ...passwords, confirmNewPassword: e.target.value })}
          disabled={loadingPassword}
          icon={Lock}
        />

        <Button onClick={changePassword} fullWidth disabled={loadingPassword}>
          {loadingPassword ? "Changing..." : "Change Password"}
        </Button>
      </div>
    </div>
    </div>
    </div>
  </div>
  </div>
);
}