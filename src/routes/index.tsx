import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bug, MapPin, X } from "lucide-react";
import raw from "@/data/fm.json";
import { BrazilMap } from "@/components/fm/BrazilMap";
import { ResearchPanel } from "@/components/fm/ResearchPanel";
import { GuidedTour, type TourStep } from "@/components/fm/GuidedTour";

const HOME_TOUR: TourStep[] = [
  { target: "map", title: "O mapa", body: "As cores mostram quantos casos confirmados houve entre 2013 e 2025: quanto mais escuro, mais casos. Clique em um estado para ver seus municípios." },
  { target: "select", title: "Escolha o local", body: "Você também pode escolher o estado e o município aqui. Só aparecem municípios com pelo menos um caso confirmado." },
  { target: "stats", title: "Casos, óbitos e letalidade", body: "Letalidade é a porcentagem de casos confirmados que terminaram em óbito. Em locais com poucos casos, ela muda muito com um único óbito." },
  { target: "years", title: "Casos por ano", body: "Mostra a evolução de 2013 a 2025. O ano de 2025 pode estar incompleto, pois as fichas ainda estão sendo digitadas." },
  { target: "forecast", title: "Previsão 2026", body: "Uma linha de tendência sobre os anos anteriores estima os casos de 2026. O selo de risco compara este local com os outros do mesmo nível — não é a chance de uma pessoa adoecer." },
  { target: "profile", title: "Quem foram os pacientes", body: "Sexo, idade e contato com carrapato ou animais registrados nas fichas. As porcentagens de contato consideram só quem respondeu Sim ou Não." },
  { target: "research", title: "Pergunte aos dados", body: "Escreva uma pergunta em português e a IA responde mostrando os números usados. Aqui também dá para baixar os dados do recorte em planilha (CSV)." },
  { target: "nav", title: "Vá além", body: "Explore os perfis mais comuns por região, estado e município, compare territórios lado a lado ou faça o check educativo de exposição." },
];
import { Button } from "@/components/ui/button";
import { forecastNext, lethality, riskLevel, type Risk } from "@/lib/forecast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Febre Maculosa · Brasil — casos 2013–2025" },
      {
        name: "description",
        content:
          "Mapa de casos confirmados de febre maculosa por estado e município (2013–2025), óbitos, letalidade, perfil dos pacientes e previsão para 2026.",
      },
      { property: "og:title", content: "Febre Maculosa · Brasil" },
      {
        property: "og:description",
        content: "Casos, letalidade, perfil dos pacientes e risco previsto para 2026 por estado e município.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

interface Summary {
  y: number[];
  d: number;
  sx: number[];
  ag: number[];
  ca: number[];
  cp: number[];
  cg: number[];
  eq: number[];
}
interface Data {
  br: Summary;
  uf: Record<string, Summary & { s: string; n: string }>;
  mu: Record<string, Summary & { n: string }>;
  ufs: Record<string, { s: string; n: string }>;
}
const data = raw as unknown as Data;
const YEARS = Array.from({ length: 13 }, (_, i) => 2013 + i);
const AGES = ["0–9", "10–19", "20–39", "40–59", "60+"];
const total = (s: Summary) => s.y.reduce((a, b) => a + b, 0);

const ufForecasts = Object.values(data.uf).map((s) => forecastNext(s.y));
const muForecasts = Object.values(data.mu).map((s) => forecastNext(s.y));

function Index() {
  const [uf, setUf] = useState("");
  const [mu, setMu] = useState("");

  const ufList = useMemo(
    () => Object.entries(data.ufs).sort((a, b) => a[1].n.localeCompare(b[1].n)),
    [],
  );
  const muList = useMemo(
    () =>
      Object.entries(data.mu)
        .filter(([k]) => k.startsWith(uf) && uf)
        .sort((a, b) => a[1].n.localeCompare(b[1].n)),
    [uf],
  );

  const mapValues = useMemo(() => {
    const out: Record<string, number> = {};
    if (!uf) for (const [k, s] of Object.entries(data.uf)) out[k] = total(s);
    else for (const [k, s] of muList) out[k] = total(s);
    return out;
  }, [uf, muList]);

  const mapNames = useMemo(() => {
    const out: Record<string, string> = {};
    if (!uf) for (const [k, v] of Object.entries(data.ufs)) out[k] = v.n;
    else for (const [k, v] of muList) out[k] = v.n;
    return out;
  }, [uf, muList]);

  const empty: Summary = { y: YEARS.map(() => 0), d: 0, sx: [0, 0], ag: [0, 0, 0, 0, 0], ca: [0, 0], cp: [0, 0], cg: [0, 0], eq: [0, 0] };
  const summary: Summary = mu ? data.mu[mu] ?? empty : uf ? data.uf[uf] ?? empty : data.br;
  const title = mu
    ? `${data.mu[mu]?.n} · ${data.ufs[uf]?.s}`
    : uf
      ? data.ufs[uf]?.n
      : "Brasil";

  const pred = forecastNext(summary.y);
  let risk: Risk;
  if (mu) risk = riskLevel(pred, muForecasts);
  else if (uf) risk = riskLevel(pred, ufForecasts);
  else {
    const mean = total(summary) / YEARS.length;
    risk = pred > mean * 1.15 ? "alto" : pred < mean * 0.85 ? "baixo" : "médio";
  }

  const selectFromMap = (code: string) => {
    if (!uf) {
      setUf(code);
      setMu("");
    } else if (data.mu[code]) setMu(code === mu ? "" : code);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background lg:h-screen lg:overflow-hidden lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-border bg-sidebar lg:h-full lg:overflow-y-auto lg:w-[420px] lg:border-r">
        <header className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-2 text-primary">
            <Bug className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Vigilância</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2"><h1 className="text-2xl font-semibold">Febre Maculosa · Brasil</h1><GuidedTour storageKey="fm-tour-home" steps={HOME_TOUR} /></div>
          <p className="mt-1 text-sm text-muted-foreground">
            Casos confirmados por residência, 2013–2025 (SINAN)
          </p>
          <div data-tour="nav"><Button asChild variant="outline" className="mt-4 w-full"><Link to="/perfis">Explorar perfis por território</Link></Button>
          <Button asChild variant="outline" className="mt-2 w-full"><Link to="/exposicao">Check de exposição</Link></Button></div>
        </header>

        <div data-tour="select" className="space-y-3 border-b border-border px-6 py-5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado</label>
          <Select
            value={uf || "BR"}
            onValueChange={(v) => {
              setUf(v === "BR" ? "" : v);
              setMu("");
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BR">Brasil (todos)</SelectItem>
              {ufList.map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.n} ({total(data.uf[k] ?? empty)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="block pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Município de residência <span className="normal-case">(opcional)</span>
          </label>
          <Select value={mu || "ALL"} onValueChange={(v) => setMu(v === "ALL" ? "" : v)} disabled={!uf || muList.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os municípios</SelectItem>
              {muList.map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.n} ({total(v)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {uf && muList.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum caso confirmado neste estado no período.</p>
          )}
        </div>

        <section className="space-y-6 px-6 py-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Seleção
              </div>
              <h2 className="text-xl font-semibold">{title}</h2>
            </div>
            {(uf || mu) && (
              <button
                onClick={() => (mu ? setMu("") : setUf(""))}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Voltar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div data-tour="stats" className="grid grid-cols-3 gap-2">
            <Stat label="Casos" value={total(summary).toString()} />
            <Stat label="Óbitos" value={summary.d.toString()} />
            <Stat label="Letalidade" value={`${lethality(summary.d, total(summary)).toFixed(1)}%`} />
          </div>

          <div data-tour="years"><Block title="Casos por ano">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={YEARS.map((y, i) => ({ ano: y, casos: summary.y[i] }))}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="ano" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} width={28} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--secondary)" }}
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "var(--foreground)" }}
                  />
                  <Bar dataKey="casos" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Block></div>

          <div data-tour="forecast"><Block title="Previsão 2026">
            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div>
                <div className="font-display text-3xl font-semibold">{pred.toFixed(pred < 10 ? 1 : 0)}</div>
                <div className="text-xs text-muted-foreground">casos esperados (tendência linear)</div>
              </div>
              <RiskBadge risk={risk} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {mu || uf
                ? `Risco comparado aos demais ${mu ? "municípios" : "estados"} com casos: terço superior = alto.`
                : "Risco comparado à média nacional de 2013–2025."}
            </p>
          </Block></div>

          <div data-tour="profile"><Block title="Perfil dos pacientes">
            <Bars
              rows={[
                ["Masculino", summary.sx[0] ?? 0],
                ["Feminino", summary.sx[1] ?? 0],
              ]}
            />
            <div className="mt-4">
              <Bars rows={AGES.map((a, i) => [`${a} anos`, summary.ag[i] ?? 0] as [string, number])} />
            </div>
          </Block>

          <Block title="Contato com animais">
            <div className="grid grid-cols-2 gap-2">
              <Exposure label="Carrapato" v={summary.ca} />
              <Exposure label="Capivara" v={summary.cp} />
              <Exposure label="Cão / gato" v={summary.cg} />
              <Exposure label="Cavalo" v={summary.eq} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">% de “Sim” entre quem respondeu (exclui ignorado/em branco).</p>
          </Block>
          </div>
          <div data-tour="research"><ResearchPanel uf={uf} mu={mu} /></div>
        </section>
      </aside>

      <main data-tour="map" className="relative min-h-[60vh] flex-1 bg-map-sea">
        <div className="absolute left-4 top-4 z-10 rounded-md border border-border bg-card/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
          {uf ? `Municípios de ${data.ufs[uf]?.n} · clique para selecionar` : "Estados · clique para ver os municípios"}
        </div>
        <BrazilMap
          level={uf || "uf"}
          values={mapValues}
          names={mapNames}
          selected={mu}
          onSelect={selectFromMap}
        />
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-semibold">{value}</div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Bars({ rows }: { rows: [string, number][] }) {
  const sum = rows.reduce((a, [, v]) => a + v, 0) || 1;
  return (
    <div className="space-y-1.5">
      {rows.map(([l, v]) => (
        <div key={l} className="grid grid-cols-[88px_1fr_56px] items-center gap-2 text-sm">
          <span className="text-muted-foreground">{l}</span>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(v / sum) * 100}%` }} />
          </div>
          <span className="text-right tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  );
}

function Exposure({ label, v }: { label: string; v: number[] }) {
  const yes = v[0] ?? 0;
  const answered = yes + (v[1] ?? 0);
  const pct = answered ? Math.round((yes / answered) * 100) : null;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-semibold">{pct === null ? "—" : `${pct}%`}</div>
      <div className="text-[11px] text-muted-foreground">{yes} de {answered}</div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: Risk }) {
  const cls =
    risk === "alto"
      ? "bg-risk-high/15 text-risk-high border-risk-high/40"
      : risk === "médio"
        ? "bg-risk-mid/15 text-risk-mid border-risk-mid/40"
        : "bg-risk-low/15 text-risk-low border-risk-low/40";
  return (
    <span className={`rounded-full border px-3 py-1 text-sm font-semibold uppercase tracking-wider ${cls}`}>
      Risco {risk}
    </span>
  );
}
