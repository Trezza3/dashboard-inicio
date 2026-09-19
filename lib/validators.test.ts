import { describe, expect, it } from "vitest";
import { dedupe, sanitizeFeeds } from "@/lib/news";
import { parseProjects } from "@/lib/projects";
import { parseGridItems } from "@/lib/shortcuts";
import { parseTabGroups } from "@/lib/tab-groups";
import { parseLocation } from "@/lib/weather";

describe("parseProjects", () => {
  it("no es una lista → null (se usa el valor inicial)", () => {
    expect(parseProjects({})).toBeNull();
  });

  it("descarta proyectos rotos y normaliza el resto", () => {
    const result = parseProjects([
      null,
      { name: "" },
      {
        id: "p1",
        name: "Web",
        status: "cualquiera",
        accent: "red",
        monitorUrl: "javascript:alert(1)",
        links: [{ url: "https://web.app", label: "Sitio" }, { url: "javascript:void 0" }],
      },
    ]);
    expect(result).toEqual([
      {
        id: "p1",
        name: "Web",
        description: undefined,
        status: "building",
        accent: "var(--lime)",
        monitorUrl: undefined,
        links: [{ id: expect.any(String), url: "https://web.app", label: "Sitio" }],
      },
    ]);
  });
});

describe("parseGridItems", () => {
  it("acepta links sueltos (formato v2) y carpetas", () => {
    const result = parseGridItems([
      { name: "GitHub", url: "https://github.com", chip: "var(--ink)" },
      { kind: "folder", id: "f", name: "IA", items: [{ name: "Claude", url: "https://claude.ai", chip: "x" }, { url: 3 }] },
      { kind: "link", name: "Malo", url: "javascript:alert(1)", chip: "x" },
    ]);
    expect(result).toEqual([
      { kind: "link", name: "GitHub", url: "https://github.com", chip: "var(--ink)" },
      { kind: "folder", id: "f", name: "IA", items: [{ name: "Claude", url: "https://claude.ai", chip: "x" }] },
    ]);
  });
});

describe("parseTabGroups", () => {
  it("descarta espacios sin nombre, corrige el color y filtra links inválidos", () => {
    const result = parseTabGroups([
      { id: "a", name: "  ", links: [] },
      {
        id: "b",
        name: "Trabajo",
        color: "magenta",
        createdAt: 5,
        note: "llamar",
        links: [{ url: "https://mail.google.com", title: "Mail" }, { url: "chrome://settings" }],
      },
    ]);
    expect(result).toEqual([
      { id: "b", name: "Trabajo", color: "blue", createdAt: 5, note: "llamar", links: [{ url: "https://mail.google.com", title: "Mail" }] },
    ]);
  });

  it("acepta espacios vacíos (se crean antes de guardarles pestañas)", () => {
    expect(parseTabGroups([{ id: "k", name: "Kalma", createdAt: 1 }])).toEqual([
      { id: "k", name: "Kalma", color: "blue", createdAt: 1, links: [] },
    ]);
  });
});

describe("parseLocation", () => {
  it("valida coordenadas", () => {
    expect(parseLocation({ name: "Córdoba", lat: -31.42, lon: -64.18 })).toEqual({ name: "Córdoba", lat: -31.42, lon: -64.18 });
    expect(parseLocation({ name: "X", lat: 120, lon: 0 })).toBeNull();
    expect(parseLocation({ name: "X", lat: "1", lon: 0 })).toBeNull();
  });
});

describe("noticias", () => {
  it("sanitizeFeeds filtra URLs inválidas y limita a 20", () => {
    const feeds = [
      { name: "Ok", url: "https://a.com/rss" },
      { name: "Malo", url: "file:///etc/passwd" },
      { name: 3, url: "https://b.com/rss" },
      ...Array.from({ length: 30 }, (_, i) => ({ name: `F${i}`, category: "Tech", url: `https://f${i}.com/rss` })),
    ];
    const result = sanitizeFeeds(feeds);
    expect(result).toHaveLength(20);
    expect(result[0]).toEqual({ name: "Ok", category: "Otros", url: "https://a.com/rss" });
    expect(result.some((f) => f.url.startsWith("file:"))).toBe(false);
  });

  it("dedupe ignora query y hash al comparar", () => {
    const items = [
      { link: "https://a.com/nota?utm=x", title: "Hola" },
      { link: "https://a.com/nota#top", title: "HOLA" },
      { link: "https://a.com/otra", title: "Hola" },
    ];
    expect(dedupe(items)).toHaveLength(2);
  });
});
