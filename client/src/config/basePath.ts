/**
 * basePath.ts
 * ───────────
 * Returns the base path for all assets, respecting Vite's `base` config.
 * In development: "" (empty string, root-relative paths work)
 * On GitHub Pages: "/Nasa-hackathon-project"
 *
 * Usage:
 *   import { assetUrl } from "../config/basePath";
 *   img.src = assetUrl("/assets/logo.png");
 *   // → "/Nasa-hackathon-project/assets/logo.png" on GitHub Pages
 *   // → "/assets/logo.png" in dev
 */

// Vite injects import.meta.env.BASE_URL from the `base` config (always ends with "/")
const rawBase = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
// Remove trailing slash so we can write assetUrl("/assets/foo.png") without double slashes
const BASE = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

/**
 * Prepend the deployment base path to an absolute asset path.
 * @param path - Must start with "/" e.g. "/assets/logo.png"
 */
export function assetUrl(path: string): string {
  return `${BASE}${path}`;
}
