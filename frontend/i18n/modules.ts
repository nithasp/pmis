/**
 * Translation files are split per page / module. `i18n/<locale>.json` holds the
 * global wording shared across the project (actions, table headers, validation
 * messages, common field labels) and every folder below holds the wording that
 * only its own page uses.
 *
 * Register a new page here after adding `i18n/<page>/en.json` and
 * `i18n/<page>/th.json`. Keys stay flat and are merged into a single catalogue,
 * so a page may use any global key without importing anything.
 */
export const I18N_MODULES = [
   "ais",
   "auth",
   "manage-ship-agents",
   "manage-warehouse",
   "master-data",
   "permission-management",
   "port-dues",
   "report",
   "request-form",
   "settings",
   "ship-entry",
   "ship-table",
   "users-management",
   "vtms",
] as const;

/** Global wording first, then every page module, as `@nuxtjs/i18n` expects. */
export const i18nLocaleFiles = (locale: string): string[] => [
   `${locale}.json`,
   ...I18N_MODULES.map((module) => `${module}/${locale}.json`),
];
