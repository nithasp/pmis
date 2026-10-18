import type { AxiosInstance } from "axios";

// Demo entry for visitors (recruiters): every new browser tab is signed in automatically as the
// shared demo account through POST /auth/demo, exactly like a real login. The session is stored in
// localStorage the same way login.vue stores it, so every API call carries the access token.
//
// A logout sets a per-tab "skip" flag in sessionStorage so the visitor can log in or register
// normally in that tab; closing the tab clears the flag and the next visit starts the demo again.
const SKIP_KEY = "pmis_skip_demo";
const TAB_KEY = "pmis_tab_session";

export const shouldSkipDemo = (): boolean => {
   try {
      return sessionStorage.getItem(SKIP_KEY) === "1";
   } catch {
      return false;
   }
};

export const setSkipDemo = (skip: boolean): void => {
   try {
      if (skip) sessionStorage.setItem(SKIP_KEY, "1");
      else sessionStorage.removeItem(SKIP_KEY);
   } catch {
      // storage can be unavailable in private windows; the demo then simply starts on every visit
   }
};

export const isNewTab = (): boolean => {
   try {
      return !sessionStorage.getItem(TAB_KEY);
   } catch {
      return true;
   }
};

export const markTabSeen = (): void => {
   try {
      sessionStorage.setItem(TAB_KEY, String(Date.now()));
   } catch {}
};

export const storedProfile = (): any => {
   try {
      return JSON.parse(localStorage.getItem("profileUser") || "{}");
   } catch {
      return {};
   }
};

// Same destination as login.vue picks after a successful login
export const landingPathFor = (roleType: string | undefined): string => {
   switch (roleType) {
      case "Agency":
         return "/manage-ship/list?status=false";
      case "VTMS":
         return "/vt";
      case "StatOfficer":
         return "/vessel-awaiting-import/list";
      default:
         return "/request-form/list";
   }
};

export async function enterDemoSession($api: AxiosInstance): Promise<{ ok: boolean; landing: string }> {
   try {
      const response = await $api.post("/auth/demo");
      const { token, user } = response.data.data;
      localStorage.setItem("access_token", token.access_token);
      localStorage.setItem("refresh_token", token.refresh_token);
      localStorage.setItem("profileUser", JSON.stringify(user));
      localStorage.setItem("firstLogin", "true");
      let permissions: string[] = [];
      if (user.type === "User" && user.roleId) {
         const role = await $api.get(`/admin/roles/${user.roleId}`);
         permissions = role.data.data.permissions || [];
      }
      localStorage.setItem("permissions", btoa(permissions.join(",")));
      setSkipDemo(false);
      markTabSeen();
      return { ok: true, landing: landingPathFor(user.roleType) };
   } catch (error) {
      console.error("demo login failed:", error);
      return { ok: false, landing: "/login" };
   }
}
