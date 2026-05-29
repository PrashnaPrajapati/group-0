"use client";

import { apiUrl } from "@/lib/apiConfig";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import TextInput from "@/components/TextInput";
import PasswordInput from "@/components/PasswordInput";
import Button from "@/components/Button";
import {Camera, Trash2, User, Mail, Phone, MapPin, Lock} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { getToken } from "@/lib/authStorage";
 
export default function ProfilePage() {
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    address: "",
    photoUrl: "",
    hasPhoto: false,
    hasPassword: true,
    created_at: "",
    role: "",
    isEmailVerified: false,
  });
  const [savedProfile, setSavedProfile] = useState({
    fullName: "",
    phone: "",
    address: "",
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [token, setToken] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showPhotoActions, setShowPhotoActions] = useState(false);
  const photoActionsRef = useRef(null);
 
  useEffect(() => {
    const storedToken = getToken();
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!showPhotoActions) return;

    const closePhotoActions = (event) => {
      if (event.key === "Escape") {
        setShowPhotoActions(false);
        return;
      }

      if (
        event.type === "mousedown" &&
        photoActionsRef.current &&
        !photoActionsRef.current.contains(event.target)
      ) {
        setShowPhotoActions(false);
      }
    };

    document.addEventListener("mousedown", closePhotoActions);
    document.addEventListener("keydown", closePhotoActions);

    return () => {
      document.removeEventListener("mousedown", closePhotoActions);
      document.removeEventListener("keydown", closePhotoActions);
    };
  }, [showPhotoActions]);
 
  useEffect(() => {
    if (!token) return;
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await fetch(apiUrl("/profile"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || `Request failed with status ${res.status}`);
 
        const hasPhoto = Boolean(data.photoUrl);
        if (hasPhoto && !data.photoUrl.startsWith("http")) {
          data.photoUrl = apiUrl(`${data.photoUrl}`);
        }

        const nextProfile = {
          fullName: data.fullName || "",
          email: data.email || "",
          phone: data.phone || "",
          gender: data.gender || "",
          address: data.address || "",
          photoUrl: data.photoUrl || "",
          hasPhoto,
          hasPassword: Boolean(data.hasPassword),
          created_at: data.created_at || "",
          role: data.role || "",
          isEmailVerified: Boolean(data.isEmailVerified),
        };

        setProfile(nextProfile);
        setSavedProfile({
          fullName: nextProfile.fullName,
          phone: nextProfile.phone,
          address: nextProfile.address,
        });
              } catch (err) {
                toast.error("Failed to load profile");
                console.error(err);
              } finally {
                setLoadingProfile(false);
              }
            };
    fetchProfile();
  }, [token]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: name === "phone" ? value.replace(/\D/g, "").slice(0, 10) : value,
    });
  };
  const handlePasswordChange = (e) => setPasswords({ ...passwords, [e.target.name]: e.target.value });
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString()
    : "Unavailable";
  const hasProfileChanges =
    profile.fullName.trim() !== savedProfile.fullName ||
    profile.phone !== savedProfile.phone ||
    (profile.address || "").trim() !== (savedProfile.address || "");
  const isProfileIncomplete = !profile.phone || !profile.address;

  const saveProfile = async () => {
    const trimmedName = profile.fullName.trim();
    const phoneDigits = profile.phone.replace(/\D/g, "");

    if (!/^[A-Za-z]+([ '-][A-Za-z]+)+$/.test(trimmedName)) {
      toast.error("Full name must include at least two words and letters only.");
      return;
    }

    if (!/^\d{10}$/.test(phoneDigits)) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }

    try {
      setLoadingProfile(true);
      const toastId = toast.info("Saving profile...", { autoClose: false });
      const res = await fetch(apiUrl("/profile"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: trimmedName, phone: phoneDigits, address: profile.address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Request failed with status ${res.status}`);
      setSavedProfile({
        fullName: trimmedName,
        phone: phoneDigits,
        address: profile.address || "",
      });
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
      const res = await fetch(apiUrl("/profile/change-password"), {
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
      const res = await fetch(apiUrl("/profile/photo"), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Upload failed with status ${res.status}`);

      setProfile({ ...profile, photoUrl: apiUrl(`${data.photoUrl}`), hasPhoto: true });
      setShowPhotoActions(false);
      toast.success("Profile photo updated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to upload photo");
      console.error("Photo upload error:", err);
    }
  };

  const removePhoto = async () => {
    if (!profile.hasPhoto) return;
    if (!window.confirm("Remove your profile photo? Your default avatar will be shown instead.")) {
      return;
    }

    try {
      const res = await fetch(apiUrl("/profile/photo"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Remove failed with status ${res.status}`);

      setProfile({ ...profile, photoUrl: "", hasPhoto: false });
      setShowPhotoActions(false);
      toast.success("Profile photo removed successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to remove photo");
      console.error("Photo remove error:", err);
    }
  };

return (
  <div className="flex">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      <div className={`flex-1 bg-gray-50 min-h-screen ${isOpen ? "md:ml-70" : "pl-16 md:pl-8"}`}>
      <Navbar />
      <div className="flex flex-col min-h-screen pt-20">
  <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center space-y-6">
    <div className="text-center space-y-2">
      <h1 className="text-4xl font-bold text-gray-800">My Profile</h1>
      <p className="text-gray-600 text-lg">Manage and Edit your personal information</p>
    </div>
 
    <div className="bg-white border border-pink-200 p-8 rounded-3xl shadow-lg w-full max-w-5xl flex flex-col md:flex-row md:items-center md:space-x-12 space-y-6 md:space-y-0">
      <div className="flex flex-col items-center space-y-3">
        <div className="relative" ref={photoActionsRef}>
          <button
            type="button"
            onClick={() => setShowPhotoActions((open) => !open)}
            className="group relative h-32 w-32 overflow-hidden rounded-full border-4 border-gray-300 focus:outline-none focus:ring-4 focus:ring-pink-100"
            aria-label="Open profile photo actions"
          >
            <img
              src={profile.photoUrl || "/default-avatar.png"}
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition group-hover:opacity-100">
              <Camera size={24} />
            </span>
          </button>
          {showPhotoActions && (
            <div className="absolute left-1/2 top-full z-20 mt-3 w-48 -translate-x-1/2 overflow-hidden rounded-xl border border-rose-100 bg-white shadow-lg">
              <label className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-rose-50">
                <Camera size={16} className="text-rose-600" />
                Update Photo
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
              {profile.hasPhoto && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  Remove Photo
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-center text-xs font-medium text-gray-500">
          Click photo to manage picture
        </p>
      </div>
      <div className="flex-1 space-y-4">
        <h2 className="font-semibold text-xl text-gray-800">Edit Profile</h2>
        {isProfileIncomplete && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Complete your profile to make booking faster.
          </div>
        )}
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
        <Button onClick={saveProfile} fullWidth disabled={loadingProfile || !hasProfileChanges}>
          {loadingProfile ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
 
    <div className="bg-white border border-pink-200 p-8 rounded-3xl shadow-lg w-full max-w-5xl flex flex-col md:flex-row md:space-x-8 space-y-4 md:space-y-0">
      <div className="flex-1 space-y-2">
        <h2 className="font-semibold text-xl text-gray-800">Personal Information</h2>
        <TextInput label="Email" value={profile.email} disabled icon={Mail} />
        <TextInput label="Gender" value={profile.gender} disabled icon={User} />
        <TextInput
          label="Login Method"
          value={profile.hasPassword ? "Email and password" : "Google sign-in"}
          disabled
          icon={Lock}
        />
        <TextInput
          label="Account Status"
          value={profile.isEmailVerified ? "Verified" : "Not verified"}
          disabled
          icon={User}
        />
        <TextInput label="Member Since" value={memberSince} disabled icon={User} />
      </div>
    </div>
 
    <div className="bg-white border border-pink-200 p-8 rounded-3xl shadow-lg w-full max-w-5xl flex flex-col md:flex-row md:space-x-8 space-y-4 md:space-y-0">
      <div className="flex-1 space-y-4">
        <h2 className="font-semibold text-xl text-gray-800">Change Password</h2>
        {profile.hasPassword ? (
          <>
            <p className="text-sm text-gray-500">
              Password must be at least 8 characters with uppercase, lowercase, and number.
            </p>
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
          </>
        ) : (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">This account uses Google sign-in.</p>
            <p className="mt-2">
              To create a password for email login, use Forgot Password from the login page.
            </p>
          </div>
        )}
      </div>
    </div>
    </div>
    </div>
  </div>
  </div>
);
}
