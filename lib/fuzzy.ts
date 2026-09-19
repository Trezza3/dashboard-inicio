// Búsqueda tolerante para el buscador Ctrl+K: sin tildes, sin mayúsculas y
// por palabras (todas tienen que aparecer, en cualquier orden).

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Puntaje de `query` contra un título (y opcionalmente un texto secundario,
 * como la URL). 0 = no coincide. Más alto = mejor: pesa más que la palabra
 * esté en el título, al principio de una palabra o al principio del título.
 */
export function score(query: string, title: string, secondary = ""): number {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  const t = normalize(title);
  const s = normalize(secondary);

  let total = 0;
  for (const token of tokens) {
    const inTitle = t.indexOf(token);
    if (inTitle >= 0) {
      let points = 10;
      if (inTitle === 0) points += 8;
      else if (/[\s\-_/.·|:]/.test(t[inTitle - 1])) points += 5;
      total += points;
      continue;
    }
    const inSecondary = s.indexOf(token);
    if (inSecondary < 0) return 0;
    total += inSecondary === 0 || /[\s\-_/.]/.test(s[inSecondary - 1]) ? 5 : 3;
  }
  // A igual coincidencia, gana el título más corto (más específico).
  return total + Math.max(0, 3 - t.length / 40);
}
