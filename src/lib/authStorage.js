export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("token");
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

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("role");
}
