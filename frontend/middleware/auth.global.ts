import { UserTypeEnum } from "~/utils/enums/UserTypeEnum";
import { enterDemoSession, isNewTab, landingPathFor, markTabSeen, shouldSkipDemo, storedProfile } from "~/utils/demo";

// Pages reached from an e-mail link or a public token: never replaced by the demo entry
const PUBLIC_FLOWS = ["register", "verify-email", "forget-password", "change-password", "survey-answer", "survey-answer-mode", "survey-success", "survey-timeout", "accept-term", "first-login"];

const privatePath = [
   "index",
   "main",
   "request-form-create",
   "ship-entry-waiting",
   "ship-entry-entering-and-leaving",
   "manage-ship-list",
   "manage-ship-create",
   "manage-ship-view",
   "manage-ship-agents-list",
   "manage-ship-agents-mode",
   "manage-ship-agents-view",
   "master-data-vessel",
   "master-data-port",
   "master-data-products",
   "master-data-account",
   "request-form-list",
   "request-form-mode",
   "request-form-view",
   "vessel-awaiting-import-list",
   "vessel-awaiting-import-mode",
   "vessel-awaiting-import-view",
   "vessel-in-out-list",
   "vessel-in-out-mode",
   "vessel-in-out-view",
   "port-dues-invoice-list",
   "port-dues-save",
   "port-dues-list",
   "port-dues-view",
];
const keysToFilter = [
   "index",
   "main",
   "ship-entry-waiting",
   "ship-entry-entering-and-leaving",
   "manage-ship-list",
   "manage-ship-create",
   "manage-ship-view",
   "manage-ship-agents-list",
   "manage-ship-agents-mode",
   "manage-ship-agents-view",
   "master-data-vessel",
   "master-data-port",
   "master-data-products",
   "master-data-account",
   "request-form-list",
   "request-form-mode",
   "request-form-view",
   "vessel-awaiting-import-list",
   "vessel-awaiting-import-mode",
   "vessel-awaiting-import-view",
   "vessel-in-out-list",
   "vessel-in-out-mode",
   "vessel-in-out-view",
   "port-dues-invoice-list",
   "port-dues-save",
   "port-dues-list",
   "port-dues-view",
];

export default defineNuxtRouteMiddleware(async (to: any) => {
   if (import.meta.server) return;

   const routeName = String(to.name ?? "");
   const isPublicFlow = PUBLIC_FLOWS.includes(routeName) || String(to.path).startsWith("/survey/");
   let access_token = localStorage.getItem("access_token");
   let profileUser = storedProfile();

   // Demo entry: a visitor without a session, or a new tab whose stored session belongs to the shared
   // demo account, is signed in as the demo user. A logout in this tab switches it off (see utils/demo.ts).
   const needsDemo = !isPublicFlow && !shouldSkipDemo() && (!access_token || (isNewTab() && profileUser?.isDemo === true));
   if (needsDemo) {
      const { $api } = useNuxtApp();
      const demo = await enterDemoSession($api as any);
      if (demo.ok) {
         access_token = localStorage.getItem("access_token");
         profileUser = storedProfile();
         if (routeName === "login" || routeName === "index" || routeName === "main") {
            return navigateTo(demo.landing);
         }
      }
   }
   if (access_token) markTabSeen();

   if (access_token && Object.keys(profileUser).length !== 0 && privatePath.includes(routeName)) {
      if (profileUser.isFirstLogin) {
         return navigateTo("/first-login");
      }

      if (!profileUser.isAcceptedTerm) {
         return navigateTo("/accept-term");
      }

      if (profileUser.type === UserTypeEnum.Agency && !keysToFilter.includes(routeName)) {
         return navigateTo("/main");
      }
   }

   // The root route has no page of its own: a signed-in visitor (for example after refreshing "/")
   // continues to the same landing page the login picks for the role
   if (access_token && routeName === "index") {
      return navigateTo(landingPathFor(profileUser?.roleType));
   }

   if (!access_token && privatePath.includes(routeName)) {
      return navigateTo("/login");
   }
});
