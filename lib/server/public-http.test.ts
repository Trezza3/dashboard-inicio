import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl, ipv4IsPublic, ipv6IsPublic } from "@/lib/server/public-http";

describe("ipv4IsPublic", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254", // metadata de clouds
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "198.18.0.1",
    "203.0.113.5",
  ])("rechaza %s", (address) => {
    expect(ipv4IsPublic(address)).toBe(false);
  });

  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "76.76.21.21"])("acepta %s", (address) => {
    expect(ipv4IsPublic(address)).toBe(true);
  });

  it("rechaza direcciones mal formadas", () => {
    expect(ipv4IsPublic("256.1.1.1")).toBe(false);
    expect(ipv4IsPublic("1.2.3")).toBe(false);
  });
});

describe("ipv6IsPublic", () => {
  it.each([
    "::1",
    "::",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
    "::ffff:127.0.0.1", // IPv4 mapeada a loopback
    "::ffff:192.168.0.1",
    "[::1]",
  ])("rechaza %s", (address) => {
    expect(ipv6IsPublic(address)).toBe(false);
  });

  it.each(["2606:4700:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8"])("acepta %s", (address) => {
    expect(ipv6IsPublic(address)).toBe(true);
  });
});

describe("assertPublicHttpUrl", () => {
  it.each([
    "ftp://example.com/",
    "http://user:pass@example.com/",
    "http://example.com:8080/",
    "http://localhost/",
    "http://app.localhost/",
    "http://printer.local/",
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data",
  ])("rechaza %s", async (url) => {
    await expect(assertPublicHttpUrl(url)).rejects.toThrow();
  });

  it("acepta una IP pública literal sin resolver DNS", async () => {
    await expect(assertPublicHttpUrl("https://1.1.1.1/")).resolves.toBeInstanceOf(URL);
  });
});
