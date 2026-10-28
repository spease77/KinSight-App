/**
 * Cache-bust query for HTML / manifest fetch only.
 * Do NOT put this in manifest `id` or `start_url` — changing those makes iOS
 * treat KinSight as a new Home Screen app and drop the calendar device cookie.
 * Contacts and calendar tokens live in Supabase and survive deploys.
 */
export const KINSIGHT_PWA_VERSION = "20261028h";
