import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Compass, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TourStep = { target: string; title: string; body: string };

type Rect = { top: number; left: number; width: number; height: number };

export function GuidedTour({ steps, storageKey }: { steps: TourStep[]; storageKey: string }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [offer, setOffer] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) setOffer(true);
  }, [storageKey]);

  const close = useCallback(() => {
    setOpen(false);
    setOffer(false);
    localStorage.setItem(storageKey, "1");
  }, [storageKey]);

  const start = () => { setI(0); setOffer(false); setOpen(true); };
  const step = steps[i];

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    const tall = el ? el.getBoundingClientRect().height > window.innerHeight * 0.7 : false;
    el?.scrollIntoView({ block: tall ? "start" : "center", behavior: "smooth" });
    measure();
    const t = window.setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step, measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, steps.length]);

  const pad = 6;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardW = Math.min(340, vw - 24);
  let cardStyle: React.CSSProperties = { left: (vw - cardW) / 2, top: vh / 2 - 100, width: cardW };
  if (rect) {
    const below = rect.top + rect.height + pad + 12;
    const fitsBelow = below + 200 < vh;
    const fitsRight = rect.left + rect.width + cardW + 24 < vw && rect.height > vh * 0.5;
    if (fitsRight) cardStyle = { left: rect.left + rect.width + 16, top: Math.max(12, Math.min(vh - 260, rect.top + 20)), width: cardW };
    else cardStyle = {
      width: cardW,
      left: Math.max(12, Math.min(vw - cardW - 12, rect.left)),
      top: fitsBelow ? below : Math.max(12, rect.top - pad - 12 - 210),
    };
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={start} className="gap-1.5" data-tour-trigger>
        <Compass className="h-4 w-4" /> Como usar
      </Button>

      {offer && !open && (
        <div role="dialog" aria-label="Convite para o tour" className="fixed bottom-4 right-4 z-[60] w-[min(320px,calc(100vw-2rem))] rounded-lg border border-border bg-popover p-4 shadow-lg">
          <p className="text-sm font-semibold">Primeira vez por aqui?</p>
          <p className="mt-1 text-xs text-muted-foreground">Faça um tour rápido para entender cada parte da tela.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={start}>Iniciar tour</Button>
            <Button size="sm" variant="ghost" onClick={close}>Agora não</Button>
          </div>
        </div>
      )}

      {open && step && (
        <div className="fixed inset-0 z-[70]" aria-live="polite">
          <div className="absolute inset-0" onClick={close} />
          {rect ? (
            <div
              className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-300"
              style={{
                top: rect.top - pad, left: rect.left - pad,
                width: rect.width + pad * 2, height: rect.height + pad * 2,
                boxShadow: "0 0 0 9999px color-mix(in oklch, var(--background) 72%, transparent)",
              }}
            />
          ) : (
            <div className="pointer-events-none absolute inset-0 bg-background/70" />
          )}
          <div role="dialog" aria-label={step.title} className="absolute rounded-lg border border-border bg-popover p-4 shadow-xl transition-all duration-300" style={cardStyle}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-primary">Passo {i + 1} de {steps.length}</p>
              <button onClick={close} aria-label="Fechar tour" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <h3 className="mt-1 font-semibold">{step.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button size="sm" variant="ghost" onClick={close}>Pular</Button>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}>Voltar</Button>
                {i < steps.length - 1
                  ? <Button size="sm" onClick={() => setI(i + 1)}>Avançar</Button>
                  : <Button size="sm" onClick={close}>Concluir</Button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
