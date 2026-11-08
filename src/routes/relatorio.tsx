import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import report from '@/data/report.json';

type Chart = { kind: 'bar' | 'line'; title: string; data: Record<string, string | number>[]; series: { key: string; name: string }[]; x: string; stacked: boolean; unit: string };
type Question = { id: number; group: string; area: string; question: string; answer: string; n: number; charts: Chart[] };
const QS = report.questions as unknown as Question[];
const AREAS = ['Todas', ...Array.from(new Set(QS.map(q => q.area)))];
const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--primary)', 'var(--destructive)', 'var(--muted-foreground)'];

export const Route = createFileRoute('/relatorio')({
  head: () => ({ meta: [
    { title: 'Relatório: 39 perguntas sobre febre maculosa · Febre Maculosa Brasil' },
    { name: 'description', content: 'Respostas às 39 perguntas epidemiológicas e de gestão sobre casos confirmados de febre maculosa 2013–2025, com gráficos interativos.' },
    { property: 'og:title', content: 'Relatório interativo: febre maculosa 2013–2025' },
    { property: 'og:description', content: 'Sazonalidade, intervalos de atendimento, fluxos entre municípios, perfil demográfico e exposições, com gráficos interativos.' },
    { property: 'og:type', content: 'article' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Report,
});

function ChartView({ c }: { c: Chart }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const many = c.data.length > 14;
  const fmt = (v: number) => `${v}${c.unit === '%' ? '%' : ''}`;
  const common = (
    <>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
      <XAxis dataKey={c.x} stroke="var(--muted-foreground)" fontSize={11} interval={many ? 'preserveStartEnd' : 0} angle={c.data.length > 6 && !many ? -25 : 0} textAnchor={c.data.length > 6 && !many ? 'end' : 'middle'} height={c.data.length > 6 && !many ? 70 : 30} />
      <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={fmt} />
      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', color: 'var(--popover-foreground)' }} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
      {c.series.length > 1 && <Legend onClick={(e) => { const k = String(e.dataKey); setHidden(h => h.includes(k) ? h.filter(x => x !== k) : [...h, k]); }} wrapperStyle={{ fontSize: 12, cursor: 'pointer' }} />}
    </>
  );
  return (
    <figure className="rounded-lg border border-border bg-card p-4">
      <figcaption className="mb-2 text-sm font-medium">{c.title}{c.series.length > 1 && <span className="ml-2 text-xs text-muted-foreground">(clique na legenda para ocultar séries)</span>}</figcaption>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {c.kind === 'line' ? (
            <LineChart data={c.data}>{common}{c.series.map((s, i) => <Line key={s.key} dataKey={s.key} name={s.name} hide={hidden.includes(s.key)} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />)}</LineChart>
          ) : (
            <BarChart data={c.data}>{common}{c.series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.name} hide={hidden.includes(s.key)} stackId={c.stacked ? 'a' : undefined} fill={COLORS[i % COLORS.length]} radius={c.stacked ? 0 : [3, 3, 0, 0]} />)}</BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function Report() {
  const [area, setArea] = useState('Todas');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number>(1);
  const list = useMemo(() => QS.filter(x => (area === 'Todas' || x.area === area) && (x.question + x.answer).toLowerCase().includes(q.toLowerCase())), [area, q]);
  const cur = QS.find(x => x.id === open) ?? QS[0];
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-5">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="mr-1 h-4 w-4" />Voltar ao mapa</Link></Button>
        <h1 className="mt-2 text-2xl font-semibold">Relatório: 39 perguntas sobre febre maculosa</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {report.total.toLocaleString('pt-BR')} casos confirmados (SINAN, 2013–2025), {report.deaths} óbitos por febre maculosa e {report.cures.toLocaleString('pt-BR')} curas. Respostas calculadas a partir das fichas, mostrando apenas números agregados.
        </p>
      </header>
      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-3">
          <Input placeholder="Buscar pergunta ou termo…" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar pergunta" />
          <div className="flex flex-wrap gap-1">
            {AREAS.map(a => <Button key={a} size="sm" variant={a === area ? 'default' : 'outline'} onClick={() => setArea(a)}>{a}</Button>)}
          </div>
          <nav className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
            {list.map(x => (
              <button key={x.id} onClick={() => setOpen(x.id)} className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${x.id === cur.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
                <span className="mr-2 font-semibold text-primary">{x.id}.</span>{x.question}
              </button>
            ))}
            {!list.length && <p className="text-sm text-muted-foreground">Nenhuma pergunta encontrada.</p>}
          </nav>
        </aside>
        <article className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{cur.group} · {cur.area} · n = {cur.n.toLocaleString('pt-BR')}</div>
          <h2 className="text-xl font-semibold">{cur.id}. {cur.question}</h2>
          <p className="rounded-lg border border-border bg-card p-4 leading-relaxed">{cur.answer}</p>
          <div className="grid gap-4 xl:grid-cols-2">
            {cur.charts.map((c, i) => <div key={`${cur.id}-${i}`} className={c.data.length > 14 || cur.charts.length === 1 ? 'xl:col-span-2' : ''}><ChartView c={c} /></div>)}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" disabled={cur.id === 1} onClick={() => setOpen(cur.id - 1)}>Anterior</Button>
            <Button variant="outline" disabled={cur.id === QS.length} onClick={() => setOpen(cur.id + 1)}>Próxima</Button>
          </div>
          <section className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <h3 className="mb-1 font-semibold text-foreground">Metodologia e ressalvas</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>Inclui só casos confirmados (classificação final = 1), por ano de notificação. Óbito = óbito por febre maculosa; letalidade = óbitos ÷ (óbitos + curas).</li>
              <li>Percentuais de "Sim" usam apenas quem respondeu Sim ou Não; ignorados e em branco aparecem à parte.</li>
              <li>Intervalos em dias excluem pares de datas faltantes e intervalos negativos (prováveis erros de digitação); usam mediana e intervalo interquartil.</li>
              <li>Município de hospitalização só existe em 2013–2017; zona de infecção não está preenchida nos confirmados.</li>
              <li>São contagens de casos notificados, não incidência; não permitem conclusões causais. 2025 pode estar incompleto.</li>
            </ul>
          </section>
        </article>
      </div>
    </main>
  );
}
