const target = process.env.TARGET || "dev";

let baseURL = "http://localhost:4100/api/v1"; // DEV (local backend in ../backend)
let siteURL = "https://pmis-apidev.wisdomcloud.net";
let versionDEV = "1.16.2";
let versionSTG = "1.16.2";
let versionUAT = "1.16.2";
let version = "";

switch (target) {
   case "dev":
      baseURL = process.env.NUXT_PUBLIC_API_BASE_URL || "http://localhost:4100/api/v1"; // DEV (local backend in ../backend)
      version = "DEV: " + versionDEV;
      siteURL = "/";
      break;
   case "stg":
      baseURL = "https://pmis-apistg.wisdomcloud.net/api/v1"; // STG
      version = "STG: " + versionSTG;
      siteURL = "/";
      break;
   case "prd":
      baseURL = ""; // PROD
      version = "PROD: " + versionUAT;
      siteURL = "/";
      break;
   case "uat":
      baseURL = "https://pmis-apiuat.wisdomcloud.net/api/v1"; // UAT
      version = "UAT: " + versionUAT;
      siteURL = "";
      break;
   case "test":
      baseURL = "https://pmis-test-api.wisdomvast.com/api/v1"; // TEST
      version = "TEST: " + versionUAT;
      siteURL = "";
      break;
   default:
      break;
}

export default {
   baseURL: baseURL,
   version: `(${version})`,
   target: target,
};
