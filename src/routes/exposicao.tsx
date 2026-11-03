import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, ShieldAlert, ShieldCheck, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import fm from '@/data/fm.json';
import { attentionLevel, behavioralScore, recentCases, territorialScore, type ExposureAnswers } from '@/lib/exposure';

type Area = { y: number[]; d: number; sx: number[]; ag: number[]; n: string };
const ufs = fm.ufs as Record<string, { s: string; n: string }>;
const ufData = fm.uf as unknown as Record<string, Area>;
const muData = fm.mu as unknown as Record<string, Area>;
const AGES = ['0–9', '10–19', '20–39', '40–59', '60+'];
const NONE = 'none';

export const Route = createFileRoute('/exposicao')({
  head: () => ({ meta: [
    { title: 'Check de exposição à febre maculosa · Febre Maculosa Brasil' },
    { name: 'description', content: 'Avaliação educativa do nível de atenção à febre maculosa conforme território, ambiente e contato com carrapatos, com orientações de prevenção.' },
    { property: 'og:title', content: 'Check de exposição à febre maculosa' },
    { property: 'og:description', content: 'Nível de atenção educativo baseado em casos confirmados 2021–2025 e exposição a carrapatos.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Exposure,
});

function Place({ label, uf, mu, setUf, setMu }: { label: string; uf: string; mu: string; setUf: (v: string) => void; setMu: (v: string) => void }) {
  const mus = Object.entries(muData).filter(([c]) => c.startsWith(uf)).sort((a, b) => a[1].n.localeCompare(b[1].n));
  return <fieldset className="space-y-2"><legend className="mb-1 text-sm font-semibold">{label}</legend>
    <Select value={uf || NONE} onValueChange={v => { setUf(v === NONE ? '' : v); setMu(''); }}><SelectTrigger aria-label={`${label}: estado`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>Selecione o estado</SelectItem>{Object.entries(ufs).sort((a, b) => a[1].n.localeCompare(b[1].n)).map(([c, u]) => <SelectItem key={c} value={c}>{u.n}</SelectItem>)}</SelectContent></Select>
    {uf && <Select value={mu || NONE} onValueChange={v => setMu(v === NONE ? '' : v)}><SelectTrigger aria-label={`${label}: município`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>Município sem casos registrados / não listado</SelectItem>{mus.map(([c, m]) => <SelectItem key={c} value={c}>{m.n}</SelectItem>)}</SelectContent></Select>}
  </fieldset>;
}

const QUESTIONS: [keyof ExposureAnswers, string][] = [
  ['tickBite', 'Encontrei carrapato preso ao corpo nas últimas semanas'],
  ['ticksSeen', 'Vejo carrapatos em mim, na roupa ou em animais'],
  ['vegetation', 'Frequento mata, pasto, trilhas ou área rural'],
  ['water', 'Frequento margens de rios, lagos, represas ou pesqueiros'],
  ['capybara', 'Há capivaras onde moro, trabalho ou passeio'],
  ['horses', 'Tenho contato com cavalos ou gado'],
];

function Exposure() {
  const [uf, setUf] = useState(''); const [mu, setMu] = useState('');
  const [wuf, setWuf] = useState(''); const [wmu, setWmu] = useState('');
  const [sex, setSex] = useState(NONE); const [age, setAge] = useState(NONE);
  const [a, setA] = useState<ExposureAnswers>({ tickBite: false, ticksSeen: false, vegetation: false, water: false, capybara: false, horses: false });
  const [done, setDone] = useState(false);

  const places = [[uf, mu, 'Residência'], [wuf, wmu, 'Trabalho/atividades']].filter(p => p[0]).map(([u, m, label]) => {
    const area = m ? muData[m] : undefined; const recent = area ? recentCases(area.y) : 0;
    return { label, name: area ? `${area.n} (${ufs[u]?.s})` : `Município não listado (${ufs[u]?.s})`, recent, state: recentCases(ufData[u]?.y ?? []), stateName: ufs[u]?.n, area };
  });
  const t = Math.max(0, ...places.map(p => territorialScore(p.recent)));
  const b = behavioralScore(a);
  const level = attentionLevel(t, b, a.tickBite);
  const main = places[0]?.area;
  const LV = { rotina: { label: 'Atenção de rotina', Icon: ShieldCheck, cls: 'text-primary' }, moderada: { label: 'Atenção moderada', Icon: Shield, cls: 'text-primary' }, reforcada: { label: 'Atenção reforçada', Icon: ShieldAlert, cls: 'text-destructive' } }[level];

  return <div className="min-h-screen bg-background">
    <header className="border-b border-border px-5 py-5 lg:px-10"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4"><div><h1 className="font-display text-2xl font-semibold">Check de exposição</h1><p className="mt-1 text-sm text-muted-foreground">Ferramenta educativa · não é diagnóstico nem probabilidade individual</p></div><Button variant="outline" asChild><Link to="/"><ArrowLeft />Mapa</Link></Button></div></header>
    <div className="mx-auto grid max-w-5xl gap-8 px-5 py-6 lg:grid-cols-2 lg:px-10">
      <form className="space-y-6" onSubmit={e => { e.preventDefault(); setDone(true); }}>
        <Place label="Onde você mora" uf={uf} mu={mu} setUf={setUf} setMu={setMu} />
        <Place label="Onde você trabalha ou faz atividades (opcional)" uf={wuf} mu={wmu} setUf={setWuf} setMu={setWmu} />
        <fieldset className="space-y-3"><legend className="mb-1 text-sm font-semibold">Ambiente e contato</legend>
          {QUESTIONS.map(([k, q]) => <label key={k} className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={a[k]} onCheckedChange={c => setA(o => ({ ...o, [k]: c === true }))} />{q}</label>)}
        </fieldset>
        <fieldset className="grid grid-cols-2 gap-3"><legend className="mb-1 text-sm font-semibold">Sobre você (só para contexto)</legend>
          <Select value={sex} onValueChange={setSex}><SelectTrigger aria-label="Sexo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>Sexo (opcional)</SelectItem><SelectItem value="0">Masculino</SelectItem><SelectItem value="1">Feminino</SelectItem></SelectContent></Select>
          <Select value={age} onValueChange={setAge}><SelectTrigger aria-label="Faixa etária"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NONE}>Idade (opcional)</SelectItem>{AGES.map((g, i) => <SelectItem key={g} value={String(i)}>{g} anos</SelectItem>)}</SelectContent></Select>
        </fieldset>
        <Button type="submit" className="w-full" disabled={!uf}>Ver resultado</Button>
      </form>

      <section aria-live="polite" className="space-y-5">
        {!done ? <p className="text-sm text-muted-foreground">Preencha o formulário e clique em “Ver resultado”.</p> : <>
          <div className="rounded-lg border border-border bg-card p-5"><div className={`flex items-center gap-3 ${LV.cls}`}><LV.Icon className="h-8 w-8" /><h2 className="font-display text-2xl font-semibold" data-testid="attention-level">{LV.label}</h2></div>
            <p className="mt-3 text-sm text-muted-foreground">Combina casos confirmados por residência em 2021–2025 no local informado com o seu relato de exposição a carrapatos e ambientes. Sexo e idade não alteram o nível.</p></div>
          <div className="space-y-2"><h3 className="font-semibold">Casos na sua localidade</h3>{places.map(p => <p key={p.label} className="text-sm"><strong>{p.label}:</strong> {p.name} — <span className="tabular-nums">{p.recent}</span> caso(s) confirmado(s) em 2021–2025; {p.stateName}: {p.state}.</p>)}
            {main && (sex !== NONE || age !== NONE) && (() => { const tot = main.sx[0] + main.sx[1]; return <p className="text-sm text-muted-foreground">Entre os {tot} casos de 2013–2025 em {main.n}{sex !== NONE && <>, {main.sx[+sex]} eram do sexo {sex === '0' ? 'masculino' : 'feminino'}</>}{age !== NONE && <>, {main.ag[+age]} tinham {AGES[+age]} anos</>}. Isso descreve notificações, não seu risco.</p>; })()}
            {places.some(p => p.recent === 0) && <p className="text-xs text-muted-foreground">Ausência de casos registrados não garante ausência de carrapatos infectados nem de subnotificação.</p>}</div>
          <div className="space-y-2"><h3 className="font-semibold">Prevenção</h3><ul className="list-disc space-y-1 pl-5 text-sm"><li>Use roupas claras, calças compridas e meias por cima da barra da calça em mata, pasto e margens de rios.</li><li>Use repelente com DEET, icaridina ou IR3535 conforme o rótulo.</li><li>Examine o corpo a cada 2–3 horas; carrapatos presos por menos tempo transmitem menos.</li><li>Retire com pinça, rente à pele, puxando devagar — sem esmagar, queimar ou torcer.</li><li>Controle carrapatos em cães e cavalos com orientação veterinária.</li></ul></div>
          <div className="rounded-lg border border-destructive/50 p-4"><h3 className="font-semibold text-destructive">Sinais de alerta</h3><p className="mt-1 text-sm">Febre alta repentina, dor de cabeça, dores musculares ou manchas vermelhas na pele até 2 semanas após contato com carrapatos ou mata: procure uma UBS/UPA imediatamente e conte sobre a exposição. O tratamento precoce salva vidas.</p></div>
          <p className="text-xs text-muted-foreground">Ferramenta educativa baseada em casos notificados ao SINAN. Não mede probabilidade individual de infecção e não substitui avaliação médica.</p>
        </>}
      </section>
    </div>
  </div>;
}
