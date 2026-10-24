import { describe, expect, it } from "vitest";
import { hostnameFromHostHeader, isAllowedHost, parseAllowedHosts } from "./allowed-hosts";

describe("hostnameFromHostHeader", () => {
  it("drops the port", () => {
    expect(hostnameFromHostHeader("127.0.0.1:9999")).toBe("127.0.0.1");
    expect(hostnameFromHostHeader("Localhost:9999")).toBe("localhost");
    expect(hostnameFromHostHeader("example.com")).toBe("example.com");
  });

  it("keeps IPv6 literals whole", () => {
    expect(hostnameFromHostHeader("[::1]:9999")).toBe("[::1]");
    expect(hostnameFromHostHeader("[::1]")).toBe("[::1]");
  });
});

describe("parseAllowedHosts", () => {
  it("splits, trims and lowercases", () => {
    expect(parseAllowedHosts(" Tasks.Example.com, ,nas.tail1234.ts.net ")).toEqual([
      "tasks.example.com",
      "nas.tail1234.ts.net",
    ]);
    expect(parseAllowedHosts(undefined)).toEqual([]);
  });
});

describe("isAllowedHost", () => {
  it("allows loopback and IP literals", () => {
    expect(isAllowedHost("localhost:9999")).toBe(true);
    expect(isAllowedHost("127.0.0.1:9999")).toBe(true);
    expect(isAllowedHost("[::1]:9999")).toBe(true);
    expect(isAllowedHost("192.168.1.20:9999")).toBe(true);
  });

  it("allows names that public DNS never resolves", () => {
    expect(isAllowedHost("nas:9999")).toBe(true);
    expect(isAllowedHost("dailyhub.localhost:9999")).toBe(true);
    expect(isAllowedHost("nas.local")).toBe(true);
    expect(isAllowedHost("box.home.arpa")).toBe(true);
  });

  it("rejects public names a rebinding attacker could control", () => {
    expect(isAllowedHost("evil.example:9999")).toBe(false);
    expect(isAllowedHost("127.0.0.1.nip.io:9999")).toBe(false);
    expect(isAllowedHost("localhost.evil.example")).toBe(false);
  });

  it("rejects a missing Host header", () => {
    expect(isAllowedHost(null)).toBe(false);
    expect(isAllowedHost("")).toBe(false);
  });

  it("allows names listed in DAILYHUB_ALLOWED_HOSTS", () => {
    const allowed = parseAllowedHosts("tasks.example.com");
    expect(isAllowedHost("tasks.example.com", allowed)).toBe(true);
    expect(isAllowedHost("Tasks.Example.com:443", allowed)).toBe(true);
    expect(isAllowedHost("other.example.com", allowed)).toBe(false);
  });

  it("turns the check off with *", () => {
    expect(isAllowedHost("evil.example", ["*"])).toBe(true);
  });
});
