import { useEffect, useMemo, useState } from "react";
import { geoArea, geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";

type FC = FeatureCollection<Geometry, { codarea: string }>;

const W = 800;
const H = 760;
const cache = new Map<string, FC>();

async function loadGeo(name: string): Promise<FC> {
  const hit = cache.get(name);
  if (hit) return hit;
  const res = await fetch(`/geo/${name}.json`);
  const data = (await res.json()) as FC;
  // IBGE ships RFC 7946 winding; d3-geo expects the opposite, so flip rings that cover the globe.
  const fix = (rings: number[][][]) => {
    if (geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI) rings.forEach((r) => r.reverse());
  };
  for (const f of data.features) {
    const g = f.geometry;
    if (g.type === "Polygon") fix(g.coordinates);
    else if (g.type === "MultiPolygon") g.coordinates.forEach(fix);
  }
  cache.set(name, data);
  return data;
}

export function heatColor(v: number, max: number): string {
  if (!v) return "var(--heat-0)";
  const t = Math.log(v + 1) / Math.log(max + 1);
  const step = Math.min(5, Math.max(1, Math.ceil(t * 5)));
  return `var(--heat-${step})`;
}

interface Props {
  /** "uf" for Brazil by state, or a 2-digit state code for its municipalities */
  level: string;
  values: Record<string, number>;
  names: Record<string, string>;
  selected?: string;
  onSelect: (code: string) => void;
}

export function BrazilMap({ level, values, names, selected, onSelect }: Props) {
  const [geo, setGeo] = useState<FC | null>(null);
  const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null);

  useEffect(() => {
    let alive = true;
    setGeo(null);
    setHover(null);
    loadGeo(level).then((g) => alive && setGeo(g));
    return () => {
      alive = false;
    };
  }, [level]);

  const keyOf = (codarea: string) => (level === "uf" ? codarea : codarea.slice(0, 6));
  const max = useMemo(() => Math.max(1, ...Object.values(values)), [values]);

  const paths = useMemo(() => {
    if (!geo) return [];
    const proj = geoMercator().fitExtent(
      [
        [20, 20],
        [W - 20, H - 20],
      ],
      geo,
    );
    const pg = geoPath(proj);
    return geo.features.map((f) => ({ code: keyOf(f.properties.codarea), d: pg(f) ?? "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  return (
    <div className="relative h-full w-full" onMouseLeave={() => setHover(null)}>
      {!geo && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Carregando mapa…
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Mapa de casos">
        {paths.map((p) => (
          <path
            key={p.code}
            d={p.d}
            fill={heatColor(values[p.code] ?? 0, max)}
            className={`map-region ${selected === p.code ? "active" : ""}`}
            onClick={() => onSelect(p.code)}
            onMouseMove={(e) => {
              const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
              setHover({ code: p.code, x: e.clientX - r.left, y: e.clientY - r.top });
            }}
          />
        ))}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <div className="font-semibold text-popover-foreground">{names[hover.code] ?? hover.code}</div>
          <div className="text-muted-foreground">{values[hover.code] ?? 0} casos confirmados</div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-md border border-border bg-card/80 px-3 py-2 text-xs text-muted-foreground backdrop-blur">
        <span>0</span>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="h-3 w-5 rounded-sm" style={{ background: `var(--heat-${i})` }} />
        ))}
        <span>{max} casos</span>
      </div>
    </div>
  );
}
