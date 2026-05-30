import { notify } from "./notify";
import { clearAuthSession } from "./authStorage";
 
export function createSafeFetch(router) {
  const ensureAuth = (status) => {
    if (status === 401 || status === 403) {
      notify.error("Session expired or unauthorized. Please login again.");
      clearAuthSession();
      router.replace("/login");
      return false;
    }
    return true;
  };

  const safeFetch = async (url, token) => {
    try {
      const res = await fetch(url, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });

      if (res.status === 401 || res.status === 403) {
        ensureAuth(res.status);
        return [];
      }

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.message || json?.error || `Request failed (${res.status})`;
        notify.error(msg);
        console.error("safeFetch:", url, res.status, json);
        return [];
      }

      if (Array.isArray(json)) return json;
      if (json && Array.isArray(json.data)) return json.data;
      if (json && typeof json === "object" && Object.keys(json).length === 0) return [];
      return [];
    } catch (err) {
      notify.error("Network error. Please check your connection.");
      console.error("safeFetch network error:", err);
      return [];
    }
  };

  return { safeFetch, ensureAuth };
}
