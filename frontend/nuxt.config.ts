// https://nuxt.com/docs/api/configuration/nuxt-config
import { i18nLocaleFiles } from "./i18n/modules";

export default defineNuxtConfig({
   ssr: false,

   app: {
      head: {
         htmlAttrs: {
            lang: "en",
         },
         title: "PMIS Upgrade",
      },
   },

   devtools: { enabled: true },
   components: false,
   css: ["~/assets/css/main.scss"],

   modules: [
      "@nuxt/ui",
      "@pinia/nuxt",
      '@nuxtjs/svg-sprite',
      [
         "@nuxtjs/i18n",
         {
            vueI18n: "./i18n.config.ts",
            langDir: "./i18n",
            locales: [
               { code: "en", iso: "en-US", name: "English", files: i18nLocaleFiles("en") },
               { code: "th", iso: "th-TH", name: "ไทย", files: i18nLocaleFiles("th") },
            ],
            defaultLocale: "th",
            strategy: "no_prefix",
            // a few confirmation messages carry an inline <br>
            compilation: { strictMessage: false },
         },
      ],
      'nuxt-icons',
   ],

   runtimeConfig: {
      public: {
         apiBaseUrl: "http://localhost:4100/api/v1", // overridden by NUXT_PUBLIC_API_BASE_URL
         version: "DEV: 1.16.2", // overridden by NUXT_PUBLIC_VERSION
      },
   },

   hooks: {
      "nitro:init"(nitro) {
         // `nuxt generate` writes the API URL into the static files, so it must never fall back to localhost there
         if (nitro.options.static && !process.env.NUXT_PUBLIC_API_BASE_URL) {
            throw new Error("NUXT_PUBLIC_API_BASE_URL is not set: copy .env.example to .env (or to .env.prd for npm run generate:prd)");
         }
      },
   },

   devServer: {
      host: "0.0.0.0",
   },

   tailwindcss: {
      viewer: false,
   },
   colorMode: {
      preference: "light",
   },

   compatibilityDate: "2024-08-13",
   plugins: [
      '~/plugins/axios.js',
      '~/plugins/autoNumeric.ts',
   ],
   
});