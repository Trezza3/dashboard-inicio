import { describe, expect, it } from "vitest";
import { normalize, score } from "@/lib/fuzzy";

describe("normalize", () => {
  it("saca tildes y mayúsculas", () => {
    expect(normalize("Canción ÑANDÚ")).toBe("cancion nandu");
  });
});

describe("score", () => {
  it("no coincide si falta alguna palabra", () => {
    expect(score("kalma ads", "Kalma · Instagram", "instagram.com")).toBe(0);
    expect(score("", "Gmail")).toBe(0);
  });

  it("encuentra palabras en cualquier orden, sin tildes", () => {
    expect(score("meta kalma", "Kalma — Administrador de Meta", "business.facebook.com")).toBeGreaterThan(0);
    expect(score("cancion", "Canción nueva")).toBeGreaterThan(0);
  });

  it("puede coincidir por la URL", () => {
    expect(score("vercel", "Dashboard", "https://vercel.com/dashboard")).toBeGreaterThan(0);
  });

  it("prefiere el título al principio antes que en el medio o en la URL", () => {
    const start = score("git", "GitHub");
    const middle = score("git", "Mi repo en github");
    const url = score("git", "Repositorio", "github.com/trezza3");
    expect(start).toBeGreaterThan(middle);
    expect(middle).toBeGreaterThan(url);
  });
});
