import { research, states, municipalities, years } from './research';
export { years, states, municipalities };
export const fields = research.fields;
export const regions: Record<string, { name: string; states: string[] }> = {
  norte: { name: 'Norte', states: ['11','12','13','14','15','16','17'] },
  nordeste: { name: 'Nordeste', states: ['21','22','23','24','25','26','27','28','29'] },
  sudeste: { name: 'Sudeste', states: ['31','32','33','35'] },
  sul: { name: 'Sul', states: ['41','42','43'] },
  centro: { name: 'Centro-Oeste', states: ['50','51','52','53'] },
};
export type ProfileFilters = { region: string; uf: string; mu: string; from: number; to: number; categories: Record<string, number>; joint: string[] };
export const defaultProfileFilters: ProfileFilters = { region: '', uf: '', mu: '', from: 2013, to: 2025, categories: {}, joint: ['CS_SEXO','FAIXA','CAO_GATO'] };
export type ProfileRow = [string, number, number[], number];
export function validateProfileFilters(f: ProfileFilters) {
  if (f.from < 2013 || f.to > 2025 || f.from > f.to || !Number.isInteger(f.from) || !Number.isInteger(f.to)) throw new Error('Período inválido.');
  if (f.region && !regions[f.region]) throw new Error('Região inválida.');
  if (f.uf && (!states[f.uf] || (f.region && !regions[f.region]?.states.includes(f.uf)))) throw new Error('Estado fora da região.');
  if (f.mu && (!f.uf || !f.mu.startsWith(f.uf) || !municipalities[f.mu])) throw new Error('Município fora do estado.');
  if (f.joint.length < 1 || f.joint.length > 4 || new Set(f.joint).size !== f.joint.length || f.joint.some(k => !fields.some(v => v.code === k))) throw new Error('Selecione de uma a quatro variáveis.');
  for (const [k,v] of Object.entries(f.categories)) { const field = fields.find(x => x.code === k); if (!field || !Number.isInteger(v) || v < 0 || v >= field.categories.length) throw new Error('Categoria inválida.'); }
}
export function computeProfiles(source: ProfileRow[], f: ProfileFilters) {
  validateProfileFilters(f);
  const territory = source.filter(([m,y]) => y >= f.from && y <= f.to && (!f.region || regions[f.region]?.states.includes(m.slice(0,2))) && (!f.uf || m.startsWith(f.uf)) && (!f.mu || m === f.mu));
  const selected = territory.filter(r => Object.entries(f.categories).every(([k,v]) => r[2][fields.findIndex(x => x.code === k)] === v));
  const sum = (rows: ProfileRow[]) => rows.reduce((n,r) => n+r[3],0);
  const total = sum(selected); const territorialTotal = sum(territory);
  const distributions = fields.map((field,i) => {
    const counts = field.categories.map((label,j) => ({ label, value:j, count: selected.reduce((n,r) => n+(r[2][i]===j?r[3]:0),0) }));
    const known = counts.slice(0,-1); const max = Math.max(0,...known.map(r => r.count));
    return { ...field, counts, modes: known.filter(r => r.count === max && max > 0).map(r => r.label), valid: known.reduce((n,r) => n+r.count,0), missing: counts.at(-1)?.count ?? 0 };
  });
  const indices = f.joint.map(k => fields.findIndex(x => x.code === k));
  const combos = new Map<string,number>(); let complete = 0;
  for (const r of selected) {
    if (indices.some(i => r[2][i] === fields[i].categories.length-1)) continue;
    const key = indices.map(i => r[2][i]).join(','); combos.set(key,(combos.get(key) ?? 0)+r[3]); complete+=r[3];
  }
  const ranking = [...combos].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,5).map(([key,count]) => ({ count, values: key.split(',').map(Number), labels: key.split(',').map((v,j) => fields[indices[j]].categories[Number(v)]) }));
  const children = !f.region ? Object.entries(regions).map(([code,r]) => ({code,name:r.name,count:sum(selected.filter(row => r.states.includes(row[0].slice(0,2))))})) : !f.uf ? regions[f.region].states.map(code => ({code,name:states[code]?.n ?? code,count:sum(selected.filter(r => r[0].startsWith(code)))})) : !f.mu ? Object.entries(municipalities).filter(([m]) => m.startsWith(f.uf)).map(([code,p]) => ({code,name:p.n,count:sum(selected.filter(r => r[0] === code))})) : [];
  return { total, territorialTotal, distributions, ranking, complete, excluded:total-complete, tie:ranking.length>1 && ranking[0].count === ranking[1].count, children:children.sort((a,b) => b.count-a.count || a.name.localeCompare(b.name)) };
}