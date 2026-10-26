import raw from '@/data/research.json';
import places from '@/data/fm.json';

export type Filters = { uf: string; mu: string; from: number; to: number };
type Group = [string, number, number, number[][]];
export const research = raw as unknown as { fields: { code: string; label: string; categories: string[] }[]; rows: Group[]; source: string; note: string };
export const years = Array.from({ length: 13 }, (_, i) => 2013 + i);
export const states = places.ufs as Record<string, { n: string; s: string }>;
export const municipalities = places.mu as Record<string, { n: string }>;

export function validateFilters(f: Filters): Filters {
  if (!Number.isInteger(f.from) || !Number.isInteger(f.to) || f.from < 2013 || f.to > 2025 || f.from > f.to) throw new Error('Período inválido: escolha anos entre 2013 e 2025.');
  if (f.uf && !states[f.uf]) throw new Error('Estado inválido.');
  if (f.mu && (!f.uf || !f.mu.startsWith(f.uf) || !municipalities[f.mu])) throw new Error('Município incompatível com o estado.');
  return f;
}
export function filteredGroups(f: Filters) {
  validateFilters(f);
  return research.rows.filter(([m, y]) => y >= f.from && y <= f.to && (!f.uf || m.startsWith(f.uf)) && (!f.mu || m === f.mu));
}
export function evidence(f: Filters) {
  const rows = filteredGroups(f);
  const total = rows.reduce((s, r) => s + r[2], 0);
  const annual = years.filter(y => y >= f.from && y <= f.to).map(year => ({ ano: year, casos: rows.filter(r => r[1] === year).reduce((s, r) => s + r[2], 0) }));
  const variables = research.fields.map((field, i) => ({ variavel: field.label, codigo: field.code, valores: field.categories.map((categoria, j) => ({ categoria, fichas: rows.reduce((s, r) => s + (r[3][i]?.[j] ?? 0), 0) })) }));
  const deaths = variables[0]?.valores[1]?.fichas ?? 0;
  return { filtros: { estado: f.uf ? states[f.uf]?.n : 'Brasil', municipio: f.mu ? municipalities[f.mu]?.n : 'Todos', anoInicial: f.from, anoFinal: f.to, criterio: 'CLASSI_FIN=1; residência; ano de notificação' }, total, obitos: deaths, letalidade: total ? Math.round(deaths / total * 1000) / 10 : null, annual, variables, fonte: research.source, nota: research.note };
}
function cell(value: unknown) {
  let s = String(value ?? '');
  if (/^[=+@\-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function buildCsv(f: Filters) {
  const rows = filteredGroups(f);
  const headers = ['Estado de residência', 'Sigla do estado', 'Município de residência', 'Código IBGE (6 dígitos)', 'Ano de notificação', 'Casos confirmados', ...research.fields.flatMap(v => v.categories.map(c => `${v.label} — ${c}`)), 'Fonte', 'Nota sobre dados ausentes'];
  const output = rows.map(([m, y, n, counts]) => [states[m.slice(0, 2)]?.n ?? 'Não informado', states[m.slice(0, 2)]?.s ?? '', municipalities[m]?.n ?? `IBGE ${m}`, m, y, n, ...counts.flat(), research.source, research.note]);
  if (!output.length) output.push([f.uf ? states[f.uf]?.n ?? '' : 'Brasil', '', f.mu ? municipalities[f.mu]?.n ?? '' : 'Todos', f.mu, `${f.from}–${f.to}`, 0, ...research.fields.flatMap(v => v.categories.map(() => 0)), research.source, research.note]);
  return '\uFEFF' + [headers, ...output].map(row => row.map(cell).join(';')).join('\r\n');
}
export function downloadCsv(f: Filters) {
  const url = URL.createObjectURL(new Blob([buildCsv(f)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `febre-maculosa-${f.mu || f.uf || 'brasil'}-${f.from}-${f.to}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}