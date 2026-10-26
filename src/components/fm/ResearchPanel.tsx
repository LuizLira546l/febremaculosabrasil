import { useEffect, useRef, useState } from 'react';
import { Download, Send, Square, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { downloadCsv, evidence, years, type Filters } from '@/lib/research';

export function ResearchPanel({ uf, mu }: { uf: string; mu: string }) {
  const [from, setFrom] = useState(2013); const [to, setTo] = useState(2025);
  const [question, setQuestion] = useState(''); const [answer, setAnswer] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [facts, setFacts] = useState<ReturnType<typeof evidence> | null>(null);
  const abort = useRef<AbortController | null>(null);
  const filters: Filters = { uf, mu, from, to };
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => { abort.current?.abort(); setAnswer(''); setFacts(null); setError(''); }, [uf, mu, from, to]);
  async function ask() {
    const controller = new AbortController(); abort.current = controller;
    setBusy(true); setAnswer(''); setError(''); setFacts(null);
    try {
      const res = await fetch('/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, filters }), signal: controller.signal });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message ?? 'Não foi possível responder.'); }
      if (!res.body) throw new Error('Resposta vazia.');
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      while (true) {
        const part = await reader.read(); buffer += decoder.decode(part.value, { stream: !part.done });
        const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line);
          if (event.type === 'evidence') setFacts(event.data);
          if (event.type === 'text') setAnswer(a => a + event.text);
          if (event.type === 'error') setError(event.message);
        }
        if (part.done) break;
      }
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Erro ao consultar.'); }
    finally { if (abort.current === controller) { setBusy(false); abort.current = null; } }
  }
  return <div className="space-y-3 border-t border-border pt-5">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><FlaskConical className="h-4 w-4 text-primary" />Pesquisa · Lovable AI</h3>
    <div className="grid grid-cols-2 gap-2">
      <div><label className="text-xs text-muted-foreground">Ano inicial</label><Select value={String(from)} onValueChange={v => { const y = Number(v); setFrom(y); if (y > to) setTo(y); }}><SelectTrigger aria-label="Ano inicial"><SelectValue /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
      <div><label className="text-xs text-muted-foreground">Ano final</label><Select value={String(to)} onValueChange={v => { const y = Number(v); setTo(y); if (y < from) setFrom(y); }}><SelectTrigger aria-label="Ano final"><SelectValue /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <p className="text-xs text-muted-foreground">Recorte da pesquisa e CSV: {evidence(filters).filtros.estado} · {evidence(filters).filtros.municipio} · {from}–{to}</p>
    <Button variant="outline" className="w-full" onClick={() => downloadCsv(filters)}><Download />Exportar dados agregados · CSV</Button>
    <Textarea aria-label="Pergunta de pesquisa" placeholder="Qual ano teve mais casos neste recorte?" value={question} onChange={e => setQuestion(e.target.value)} maxLength={2000} rows={3} />
    <div className="flex gap-2"><Button disabled={busy || question.trim().length < 3} onClick={ask} className="flex-1"><Send />Consultar</Button>{busy && <Button variant="outline" size="icon" title="Interromper" aria-label="Interromper" onClick={() => abort.current?.abort()}><Square /></Button>}</div>
    {busy && <p role="status" className="text-xs text-muted-foreground">Analisando o recorte…</p>}
    {error && <p role="alert" className="text-sm text-destructive break-words">{error}</p>}
    {answer && <div className="whitespace-pre-wrap break-words text-sm leading-relaxed" aria-live="polite">{answer}</div>}
    {facts && <details className="text-xs"><summary className="cursor-pointer font-semibold">Filtros e valores de suporte</summary><div className="mt-2 space-y-2"><p>{facts.filtros.estado} · {facts.filtros.municipio} · {facts.filtros.anoInicial}–{facts.filtros.anoFinal}</p><p>CLASSI_FIN=1 · residência · ano de notificação</p><p>{facts.total} casos · {facts.obitos} óbitos por FM · letalidade {facts.letalidade ?? '—'}%</p><table className="w-full"><thead><tr><th className="text-left">Ano</th><th className="text-right">Casos</th></tr></thead><tbody>{facts.annual.map(r => <tr key={r.ano}><td>{r.ano}</td><td className="text-right">{r.casos}</td></tr>)}</tbody></table>{facts.variables.map(v => <details key={v.codigo}><summary className="cursor-pointer">{v.variavel}</summary>{v.valores.map(r => <div key={r.categoria} className="flex justify-between gap-2 py-1"><span>{r.categoria}</span><span>{r.fichas}</span></div>)}</details>)}<p>{facts.fonte}</p><p>{facts.nota}</p></div></details>}
    <p className="text-[11px] leading-relaxed text-muted-foreground">Dados ausentes/ignorados são separados de “Não”. Sem fichas individuais ou cruzamentos entre variáveis. 2025 pode estar incompleto. O painel e mapa acima mantêm o período completo 2013–2025.</p>
  </div>;
}