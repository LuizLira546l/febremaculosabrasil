import { useState, useTransition } from 'react';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProfileComparison } from '@/lib/profiles.functions';
import { regions, states, municipalities, fields, type ProfileFilters, type ProfileTerritory, type ProfileMetrics } from '@/lib/profiles';

function Choice({ label, value, items, onChange }: { label: string; value: string; items: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <div className="min-w-0"><label className="mb-1 block text-xs text-muted-foreground">{label}</label><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>;
}
const name = (t: ProfileTerritory) => t.mu ? municipalities[t.mu]?.n ?? t.mu : t.uf ? states[t.uf]?.n ?? t.uf : regions[t.region]?.name ?? 'Brasil';
const pct = (value: number | null) => value === null ? 'Não calculável' : `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`;
function TerritoryChoice({ slot, territory, onChange }: { slot: string; territory: ProfileTerritory; onChange: (value: ProfileTerritory) => void }) {
  return <div className="min-w-0 space-y-3">
    <h3 className="font-semibold">Território {slot}</h3>
    <Choice label={`Região ${slot}`} value={territory.region || 'all'} items={[{ value: 'all', label: 'Brasil' }, ...Object.entries(regions).map(([value,r]) => ({ value, label:r.name }))]} onChange={region => onChange({ region:region === 'all' ? '' : region, uf:'', mu:'' })} />
    {territory.region && <Choice label={`Estado ${slot}`} value={territory.uf || 'all'} items={[{ value:'all',label:'Toda a região' }, ...(regions[territory.region]?.states ?? []).map(value => ({value,label:states[value]?.n ?? value}))]} onChange={uf => onChange({...territory, uf:uf === 'all' ? '' : uf, mu:''})} />}
    {territory.uf && <Choice label={`Município ${slot}`} value={territory.mu || 'all'} items={[{value:'all',label:'Todo o estado'}, ...Object.entries(municipalities).filter(([m]) => m.startsWith(territory.uf)).sort((a,b) => a[1].n.localeCompare(b[1].n)).map(([value,m]) => ({value,label:m.n}))]} onChange={mu => onChange({...territory,mu:mu === 'all' ? '' : mu})} />}
  </div>;
}
type ComparisonRow = { key: string; labels: string[]; missing?: boolean; a: ProfileMetrics; b: ProfileMetrics; difference: {count:number;points:number|null} };
function Metric({ metric, missing }: { metric: ProfileMetrics; missing?: boolean }) {
  return <><div className="font-semibold tabular-nums">{metric.count.toLocaleString('pt-BR')} fichas</div><div className="mt-1 text-primary tabular-nums">{pct(metric.percent)} do território</div><div className="mt-1 text-xs text-muted-foreground">{metric.valid.toLocaleString('pt-BR')} fichas válidas</div>{!missing && <div className="mt-1 text-xs text-muted-foreground">{pct(metric.validPercent)} entre válidas</div>}</>;
}
function ComparisonTable({ rows, a, b, caption }: { rows: ComparisonRow[]; a:string; b:string; caption:string }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[640px] table-fixed text-left text-sm"><caption className="sr-only">{caption}</caption><thead><tr className="border-b border-border text-xs text-muted-foreground"><th scope="col" className="w-[28%] py-3 pr-3">Perfil</th><th scope="col" className="w-[26%] px-2 py-3 break-words">A · {a}</th><th scope="col" className="w-[26%] px-2 py-3 break-words">B · {b}</th><th scope="col" className="w-[20%] px-2 py-3">Diferença B − A</th></tr></thead><tbody>{rows.map(r => <tr key={r.key} className="border-b border-border align-top"><th scope="row" className="py-4 pr-3 font-normal break-words">{r.labels.join(' · ')}{r.missing && <span className="mt-1 block text-xs text-muted-foreground">Fora das fichas válidas</span>}</th><td className="px-2 py-4"><Metric metric={r.a} missing={r.missing} /></td><td className="px-2 py-4"><Metric metric={r.b} missing={r.missing} /></td><td className="px-2 py-4 tabular-nums"><div>{signed(r.difference.count)} fichas</div><div className="mt-1 text-xs text-muted-foreground">{r.difference.points === null ? 'Não calculável' : `${signed(r.difference.points)} p.p.`}</div></td></tr>)}</tbody></table></div>;
}
export function ProfileComparison({ filters }: { filters: ProfileFilters }) {
  const [a,setA] = useState<ProfileTerritory>({region:filters.region || 'sul',uf:filters.uf,mu:filters.mu});
  const [b,setB] = useState<ProfileTerritory>({region:filters.region === 'sudeste' ? 'sul' : 'sudeste',uf:'',mu:''});
  const [view,setView] = useState('CS_SEXO');
  const [pending,startTransition] = useTransition();
  const input = { filters, a, b };
  const { data } = useSuspenseQuery(queryOptions({queryKey:['profile-comparison',input],queryFn:() => getProfileComparison({data:input})}));
  const update = (slot: string, value: ProfileTerritory) => startTransition(() => slot === 'A' ? setA(value) : setB(value));
  return <section className="space-y-6" aria-label="Comparação de perfis" aria-busy={pending}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-semibold">Comparação de perfis</h2><Button variant="outline" size="sm" onClick={() => startTransition(() => { setA(b);setB(a); })}><ArrowLeftRight />Inverter territórios</Button></div>
    <div className="grid gap-6 sm:grid-cols-2"><TerritoryChoice slot="A" territory={a} onChange={t => update('A',t)} /><TerritoryChoice slot="B" territory={b} onChange={t => update('B',t)} /></div>
    {pending && <p role="status" className="text-xs text-muted-foreground">Atualizando comparação…</p>}
    <p className="text-sm text-muted-foreground">{filters.from}–{filters.to} · {Object.keys(filters.categories).length ? fields.filter(v => filters.categories[v.code] !== undefined).map(v => `${v.label}: ${v.categories[filters.categories[v.code] ?? 0]}`).join(' · ') : 'Todas as categorias'}</p>
    <div className="grid gap-6 border-y border-border py-4 sm:grid-cols-2">{(['a','b'] as const).map((key,i) => <div key={key} data-testid={`comparison-summary-${key}`}><h3 className="font-semibold">{i === 0 ? 'A' : 'B'} · {name(i === 0 ? a : b)}</h3><p className="mt-2 text-sm"><strong>{data[key].territorialTotal.toLocaleString('pt-BR')}</strong> casos no território</p><p className="mt-1 text-xs text-muted-foreground">{data[key].total.toLocaleString('pt-BR')} após filtros · {data[key].complete.toLocaleString('pt-BR')} fichas válidas para a combinação · {data[key].excluded.toLocaleString('pt-BR')} ausentes/ignoradas na combinação</p></div>)}</div>
    {JSON.stringify(a) === JSON.stringify(b) && <p className="text-xs text-risk-mid">Os dois lados representam o mesmo território.</p>}
    <p className="text-xs leading-relaxed text-muted-foreground">Percentual do território = fichas do perfil ÷ total de casos do território no período, antes dos filtros por categoria. Percentual entre válidas usa apenas fichas filtradas com todas as variáveis da combinação preenchidas, ou respostas válidas da variável. Diferenças percentuais são pontos percentuais (p.p.), não variação relativa. Contato com animais não comprova transmissão.</p>
    <div><h3 className="font-semibold">Combinações observadas</h3><p className="mt-1 text-xs text-muted-foreground">{filters.joint.map(k => fields.find(v => v.code === k)?.label).join(' + ')} · Cinco mais frequentes de cada território, com contagem exata em ambos.</p>{data.combinations.length ? <ComparisonTable rows={data.combinations} a={name(a)} b={name(b)} caption="Comparação das combinações observadas" /> : <p className="mt-4 text-sm text-muted-foreground">Nenhuma combinação com fichas válidas nos territórios selecionados.</p>}</div>
    <div className="border-t border-border pt-5"><div className="mb-3 max-w-sm"><Choice label="Variável comparada" value={view} items={fields.map(v => ({value:v.code,label:v.label}))} onChange={setView} /></div>{data.distributions.filter(v => v.code === view).map(v => <ComparisonTable key={v.code} rows={v.rows} a={name(a)} b={name(b)} caption={`Comparação por ${v.label}`} />)}</div>
    <p className="text-xs text-muted-foreground">Fonte: SINAN · casos confirmados por residência · 2013–2025. Ignorado não significa “Não”. Totais pequenos são instáveis; 2025 pode estar incompleto. Percentual não calculável quando o denominador é zero.</p>
  </section>;
}