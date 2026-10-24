/**
 * DailyHub has no login, so a browser that can reach it can use it. DNS
 * rebinding turns that into "any website the user visits": the attacker's
 * domain is re-pointed at 127.0.0.1, the page becomes same-origin with the
 * local server, and Next's Server Action Origin check passes because Origin
 * and Host both name the attacker's domain.
 *
 * The defence is to refuse requests whose Host header is a name an attacker
 * could control. IP literals and names that never resolve through public DNS
 * are safe; any other name has to be listed in DAILYHUB_ALLOWED_HOSTS.
 */

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

// Suffixes resolved only on the local machine or network, never by public DNS.
const PRIVATE_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];

export function hostnameFromHostHeader(host: string): string {
  const value = host.trim().toLowerCase();
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    return end === -1 ? value : value.slice(0, end + 1);
  }
  const colon = value.lastIndexOf(":");
  return colon === -1 ? value : value.slice(0, colon);
}

export function parseAllowedHosts(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedHost(host: string | null, allowed: string[] = []): boolean {
  if (allowed.includes("*")) return true;
  if (!host) return false;

  const hostname = hostnameFromHostHeader(host);
  if (!hostname) return false;
  if (allowed.includes(hostname)) return true;

  if (hostname.startsWith("[") || IPV4.test(hostname)) return true;
  // A single-label name ("nas") cannot be registered publicly.
  if (!hostname.includes(".")) return true;
  return PRIVATE_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}
