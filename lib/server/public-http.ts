import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 4;
const DEFAULT_MAX_BYTES = 2_500_000;

type NextFetchInit = RequestInit & {
  next?: { revalidate?: number };
};

function ipv4IsPublic(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 0 && c === 0) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  if (a === 192 && b === 168) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function ipv6Hextets(address: string): number[] | null {
  let value = address.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];

  const ipv4Match = /(?:^|:)(\d+\.\d+\.\d+\.\d+)$/.exec(value);
  if (ipv4Match) {
    const octets = ipv4Match[1].split(".").map(Number);
    if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
    const replacement = `${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
    value = value.slice(0, -ipv4Match[1].length) + replacement;
  }

  const halves = value.split("::");
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;

  const raw = halves.length === 2 ? [...left, ...Array(missing).fill("0"), ...right] : left;
  const parsed = raw.map((part) => Number.parseInt(part, 16));
  if (parsed.length !== 8 || parsed.some((part) => !Number.isInteger(part) || part < 0 || part > 0xffff)) {
    return null;
  }
  return parsed;
}

function ipv6IsPublic(address: string): boolean {
  const parts = ipv6Hextets(address);
  if (!parts) return false;

  if (parts.every((part) => part === 0)) return false;
  if (parts.slice(0, 7).every((part) => part === 0) && parts[7] === 1) return false;
  if ((parts[0] & 0xfe00) === 0xfc00) return false;
  if ((parts[0] & 0xffc0) === 0xfe80) return false;
  if ((parts[0] & 0xff00) === 0xff00) return false;
  if (parts[0] === 0x2001 && parts[1] === 0x0db8) return false;

  const isIpv4Mapped = parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff;
  if (isIpv4Mapped) {
    const mapped = `${parts[6] >> 8}.${parts[6] & 255}.${parts[7] >> 8}.${parts[7] & 255}`;
    return ipv4IsPublic(mapped);
  }

  return true;
}

function addressIsPublic(address: string, family: number): boolean {
  if (family === 4 || isIP(address) === 4) return ipv4IsPublic(address);
  if (family === 6 || isIP(address) === 6) return ipv6IsPublic(address);
  return false;
}

export async function assertPublicHttpUrl(input: string): Promise<URL> {
  if (input.length > 2_048) throw new Error("url-too-long");

  const url = new URL(input);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported-protocol");
  if (url.username || url.password) throw new Error("credentials-not-allowed");
  if (url.port && !((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443"))) {
    throw new Error("non-standard-port");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname.endsWith(".home") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid") ||
    hostname.endsWith(".example") ||
    hostname.endsWith(".onion")
  ) {
    throw new Error("private-hostname");
  }

  const literalFamily = isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await lookup(hostname, { all: true, verbatim: true });

  if (!addresses.length || addresses.some(({ address, family }) => !addressIsPublic(address, family))) {
    throw new Error("private-address");
  }

  return url;
}

export async function fetchPublicHttp(input: string, init: NextFetchInit = {}): Promise<Response> {
  let url = await assertPublicHttpUrl(input);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(url, { ...init, redirect: "manual" });
    const location = response.headers.get("location");
    const isRedirect = response.status >= 300 && response.status < 400 && location;

    if (!isRedirect) return response;
    await response.body?.cancel();
    if (redirects === MAX_REDIRECTS) throw new Error("too-many-redirects");
    url = await assertPublicHttpUrl(new URL(location, url).toString());
  }

  throw new Error("too-many-redirects");
}

export async function readTextWithLimit(response: Response, maxBytes = DEFAULT_MAX_BYTES): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel();
    throw new Error("response-too-large");
  }

  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("response-too-large");
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}
