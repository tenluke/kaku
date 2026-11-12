/*
 * The app's version, shown in the footer and the About box. It comes from package.json:
 * Vite replaces __APP_VERSION__ with it when the app is built (see vite.config.ts).
 */
declare const __APP_VERSION__: string;

export const APP_VERSION: string = __APP_VERSION__;
