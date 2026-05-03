import { jwtDecode } from "jwt-decode";

const LOGIN_CREDENTIALS_KEY = "savedLoginCredentials";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

export function isTokenValid(token) {
  if (!token) return false;

  try {
    const decoded = jwtDecode(token);
    if (!decoded.exp) return false;

    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getValidToken() {
  const token = getToken();

  if (!isTokenValid(token)) {
    clearAuthSession();
    return null;
  }

  return token;
}

export function getRole() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("role") || sessionStorage.getItem("role");
}

export function setAuthSession(token, role, rememberMe) {
  if (typeof window === "undefined") return;

  const primaryStorage = rememberMe ? localStorage : sessionStorage;
  const secondaryStorage = rememberMe ? sessionStorage : localStorage;

  primaryStorage.setItem("token", token);
  if (role) primaryStorage.setItem("role", role);

  secondaryStorage.removeItem("token");
  secondaryStorage.removeItem("role");
}

export function getSavedLoginCredentials() {
  if (typeof window === "undefined") return null;

  try {
    const savedCredentials = localStorage.getItem(LOGIN_CREDENTIALS_KEY);
    return savedCredentials ? JSON.parse(savedCredentials) : null;
  } catch {
    localStorage.removeItem(LOGIN_CREDENTIALS_KEY);
    return null;
  }
}

export function setSavedLoginCredentials(email, password) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    LOGIN_CREDENTIALS_KEY,
    JSON.stringify({
      email,
      password,
    })
  );
}

export function clearSavedLoginCredentials() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOGIN_CREDENTIALS_KEY);
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("role");
}
