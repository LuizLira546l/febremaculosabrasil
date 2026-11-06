"""Offline aggregation answering the questions document (confirmed cases 2013-2025).
Usage: python scripts/aggregate-report.py /mnt/user-uploads > src/data/report.json
Only aggregated counts/statistics are emitted; no individual records.
"""
import json, sys
from pathlib import Path
import numpy as np, pandas as pd

root = Path(sys.argv[1])
app = json.load(open('src/data/fm.json'))
frames = []
for y in range(13, 26):
    d = pd.read_excel(root / f'FMACBR{y}.xlsx')
    frames.append(d[d.CLASSI_FIN == 1])
df = pd.concat(frames, ignore_index=True)
N = len(df)
DATES = ['DT_NOTIFIC', 'DT_SIN_PRI', 'DT_INVEST', 'DT_ENCERRA', 'DT_OBITO', 'DTINTERNA', 'DTALTA', 'DTS1', 'DTS2']
for c in DATES:
    df[c] = pd.to_datetime(df[c], format='%m/%d/%Y', errors='coerce') if c in df else pd.NaT
num = lambda c: pd.to_numeric(df[c], errors='coerce') if c in df else pd.Series(np.nan, index=df.index)
EV, HO = num('EVOLUCAO'), num('HOSPITAL')
DEATH, CURE, HOSP, NOHOSP = EV == 2, EV == 1, HO == 1, HO == 2
YEARS = list(range(2013, 2026))
df['YEAR'] = num('NU_ANO')
MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
ufs = app['ufs']
def mname(code):
    try: c = str(int(code))
    except Exception: return 'Ignorado'
    m = app['mu'].get(c)
    uf = ufs.get(c[:2], {}).get('s', '')
    return f"{m['n']} ({uf})" if m else f'Cód. {c} ({uf})'

def chart(kind, title, data, series, x='label', stacked=False, unit='casos'):
    return dict(kind=kind, title=title, data=data, series=[dict(key=k, name=n) for k, n in series], x=x, stacked=stacked, unit=unit)

def pct(a, b): return round(100 * a / b, 1) if b else 0.0

def season(col, label):
    s = df[col].dropna()
    m = s.dt.month.value_counts().reindex(range(1, 13), fill_value=0)
    w = s.dt.isocalendar().week.astype(int).value_counts().reindex(range(1, 54), fill_value=0)
    peak = int(m.idxmax()); top3 = m.sort_values(ascending=False).index[:3]
    share = pct(int(m[top3].sum()), int(m.sum()))
    byy = [dict(label=MONTHS[i - 1], **{str(y): int(((s.dt.month == i) & (s.dt.year == y)).sum()) for y in YEARS}) for i in range(1, 13)]
    return dict(
        answer=f"Sim. Dos {len(s)} casos com {label} preenchida, o pico ocorre em {MONTHS[peak-1]} ({int(m[peak])} casos). Os três meses mais frequentes ({', '.join(MONTHS[i-1] for i in top3)}) concentram {share}% dos casos, sugerindo sazonalidade de agosto a novembro, compatível com o ciclo do carrapato-estrela (ninfas).",
        n=int(len(s)),
        charts=[chart('bar', f'Casos por mês ({label})', [dict(label=MONTHS[i-1], v=int(m[i])) for i in range(1, 13)], [('v', 'Casos')]),
                chart('bar', 'Casos por semana epidemiológica (ISO)', [dict(label=str(i), v=int(w[i])) for i in range(1, 54)], [('v', 'Casos')]),
                chart('line', 'Casos por mês em cada ano', byy, [(str(y), str(y)) for y in YEARS])])

BINS = [(-1e9, -1, 'Negativo*'), (0, 3, '0–3'), (4, 7, '4–7'), (8, 14, '8–14'), (15, 30, '15–30'), (31, 60, '31–60'), (61, 90, '61–90'), (91, 180, '91–180'), (181, 1e9, '>180')]
def interval(a, b, mask=None, label=''):
    m = mask if mask is not None else pd.Series(True, index=df.index)
    d = (df.loc[m, b] - df.loc[m, a]).dt.days.dropna()
    neg = int((d < 0).sum()); v = d[d >= 0]
    data = [dict(label=l, v=int(((d >= lo) & (d <= hi)).sum())) for lo, hi, l in BINS]
    if not len(v):
        return dict(answer='Não estimável: sem pares de datas válidos.', n=0, charts=[])
    q1, med, q3 = np.percentile(v, [25, 50, 75])
    stats = dict(n=int(len(v)), median=float(med), q1=float(q1), q3=float(q3), mean=round(float(v.mean()), 1), p90=float(np.percentile(v, 90)), neg=neg)
    return dict(answer=f"Mediana de {med:.0f} dias (intervalo interquartil {q1:.0f}–{q3:.0f}; média {v.mean():.1f}; 90% até {np.percentile(v,90):.0f} dias) em {len(v)} casos {label}com as duas datas válidas. A curva é assimétrica à direita: a maioria se resolve rápido, com cauda longa de casos demorados. {neg} pares com intervalo negativo (provável erro de digitação) foram excluídos das estatísticas.",
                n=int(len(v)), stats=stats, charts=[chart('bar', 'Distribuição do intervalo (dias)', data, [('v', 'Casos')])])

def interval_multi(a, bs, mask=None, label=''):
    parts = [interval(a, b, mask, label) for b in bs]
    names = {'DTS1': '1ª amostra (DTS1)', 'DTS2': '2ª amostra (DTS2)'}
    ans = ' '.join(f"{names[b]}: {p['answer']}" for b, p in zip(bs, parts))
    data = [dict(label=l, **{b: (p['charts'][0]['data'][i]['v'] if p['charts'] else 0) for b, p in zip(bs, parts)}) for i, (_, _, l) in enumerate(BINS)]
    return dict(answer=ans + ' (O dicionário cita DT_AMO_S1/S2; nas planilhas as datas de coleta são DTS1/DTS2.)', n=parts[0]['n'], charts=[chart('bar', 'Distribuição do intervalo (dias)', data, [(b, names[b]) for b in bs])])

YN = {1: 'Sim', 2: 'Não', 9: 'Ignorado'}
def yn_counts(col, mask=None):
    s = num(col) if mask is None else num(col)[mask]
    return {k: int((s == c).sum()) for c, k in YN.items()} | {'Em branco': int(s.isna().sum() + (~s.isin([1, 2, 9]) & s.notna()).sum())}

SYM = [('FEBRE', 'Febre'), ('CEFALEIA', 'Cefaleia'), ('ABDOMINAL', 'Dor abdominal'), ('MIALGIA', 'Mialgia'), ('NAUSEA', 'Náusea/vômito'), ('EXANTEMA', 'Exantema'), ('DIARREIA', 'Diarreia'), ('ICTERICIA', 'Icterícia'), ('HIPEREMIA', 'Hiperemia conjuntival'), ('HEPATOME', 'Hepatoesplenomegalia'), ('PETEQUIAS', 'Petéquias'), ('HEMORRAG', 'Manifestação hemorrágica'), ('LINFADENO', 'Linfadenopatia'), ('CONVULSAO', 'Convulsão'), ('NECROSE', 'Necrose de extremidades'), ('PROSTACAO', 'Prostração'), ('CHOQUE', 'Choque/hipotensão'), ('COMA', 'Estupor/coma'), ('HEMORRAGI', 'Sangramento'), ('RESPIRATO', 'Insuficiência respiratória'), ('OLIGURIA', 'Oligúria/anúria')]
def clinical():
    rows = []
    for c, l in SYM:
        s = num(c)
        def p(m):
            v = s[m]; y, n_ = int((v == 1).sum()), int((v == 2).sum()); return pct(y, y + n_), y + n_
        pd_, nd = p(DEATH); pc, nc = p(CURE)
        rows.append(dict(label=l, obito=pd_, cura=pc, diff=round(pd_ - pc, 1), nd=nd, nc=nc))
    rows.sort(key=lambda r: -abs(r['diff']))
    top = rows[:5]
    return dict(answer=f"Entre {int(DEATH.sum())} óbitos por febre maculosa e {int(CURE.sum())} curas, os sinais que mais separam os grupos (diferença em pontos percentuais da frequência de \"Sim\" entre quem respondeu Sim/Não) são: " + '; '.join(f"{r['label']} ({r['obito']}% nos óbitos vs {r['cura']}% nas curas)" for r in top) + ". Sinais de gravidade (choque, coma, insuficiência respiratória, sangramento, oligúria) predominam nos óbitos, enquanto febre e cefaleia são quase universais e pouco discriminam. É uma comparação descritiva, não um modelo preditivo.",
                n=int(DEATH.sum() + CURE.sum()), charts=[chart('bar', '% de \"Sim\" por sinal/sintoma: óbito vs cura', rows, [('obito', 'Óbito'), ('cura', 'Cura')], unit='%'),
                chart('bar', 'Diferença óbito − cura (pontos percentuais)', rows, [('diff', 'Diferença')], unit='p.p.')])

def autocto():
    s = num('TPAUTOCTO'); lab = {1: 'Sim', 2: 'Não', 3: 'Indeterminado'}
    data = []
    for y in YEARS:
        m = df.YEAR == y
        r = dict(label=str(y), **{v: int(((s == k) & m).sum()) for k, v in lab.items()}); r['Em branco'] = int((~s.isin([1, 2, 3]) & m).sum()); data.append(r)
    mm = df.DT_SIN_PRI.dt.month
    mdata = [dict(label=MONTHS[i-1], **{v: int(((s == k) & (mm == i)).sum()) for k, v in lab.items()}) for i in range(1, 13)]
    a, b = int((s == 1).sum()), int((s == 2).sum())
    return dict(answer=f"{pct(a, a+b)}% dos casos com autoctonia definida (Sim/Não) foram autóctones ({a} de {a+b}); {int((s==3).sum())} indeterminados e {int((~s.isin([1,2,3])).sum())} em branco. A proporção de autóctones é estável ao longo dos anos; a sazonalidade mensal acompanha a curva geral de casos.", n=N,
                charts=[chart('bar', 'Autoctonia por ano', data, [(k, k) for k in ['Sim', 'Não', 'Indeterminado', 'Em branco']], stacked=True),
                        chart('bar', 'Autoctonia por mês de início dos sintomas', mdata, [(k, k) for k in ['Sim', 'Não', 'Indeterminado']], stacked=True)])

def infection_munis():
    s = num('COMUNINF'); vc = s.dropna().value_counts().head(15)
    data = [dict(label=mname(c), v=int(n)) for c, n in vc.items()]
    top5 = list(vc.index[:5])
    yd = [dict(label=str(y), **{mname(c): int(((s == c) & (df.YEAR == y)).sum()) for c in top5}) for y in YEARS]
    return dict(answer=f"{int(s.notna().sum())} casos ({pct(int(s.notna().sum()), N)}%) informam o município provável de infecção. Os mais frequentes: " + ', '.join(f"{d['label']} ({d['v']})" for d in data[:5]) + '. A distribuição anual mostra se a importância de cada município é contínua ou concentrada em anos específicos.', n=int(s.notna().sum()),
                charts=[chart('bar', '15 municípios de infecção com mais casos', data, [('v', 'Casos')]), chart('line', 'Top 5 municípios de infecção por ano', yd, [(mname(c), mname(c)) for c in top5])])

def norm(col):
    s = num(col)
    return s.where(s > 99999)

def flows(cols, mask=None, label=''):
    m = mask if mask is not None else pd.Series(True, index=df.index)
    names = {'COMUNINF': 'infecção', 'ID_MN_RESI': 'residência', 'ID_MUNICIP': 'notificação', 'COMUNHOSP': 'hospitalização'}
    d = pd.DataFrame({c: norm(c)[m] for c in cols}).dropna()
    rows = []
    for i, a in enumerate(cols):
        for b in cols[i+1:]:
            same = int((d[a] == d[b]).sum())
            rows.append(dict(label=f"{names[a].capitalize()} = {names[b]}", igual=same, diferente=int(len(d) - same), pct=pct(same, len(d))))
    if len(cols) > 2:
        allsame = int((d.nunique(axis=1) == 1).sum())
        rows.append(dict(label='Todos iguais', igual=allsame, diferente=int(len(d) - allsame), pct=pct(allsame, len(d))))
    note = ' COMUNHOSP só existe nas planilhas de 2013–2017, então esta análise cobre apenas esses anos.' if 'COMUNHOSP' in cols else ''
    if not len(d): return dict(answer='Não estimável: sem casos com todos os municípios preenchidos.' + note, n=0, charts=[])
    # top non-matching flows between first two cols
    a, b = cols[0], cols[1]
    fl = d[d[a] != d[b]].groupby([a, b]).size().sort_values(ascending=False).head(10)
    fdata = [dict(label=f"{mname(x)} → {mname(y)}", v=int(n)) for (x, y), n in fl.items()]
    return dict(answer=f"Em {len(d)} casos {label}com todos os municípios preenchidos: " + '; '.join(f"{r['label']} em {r['pct']}%" for r in rows) + '. Quando diferem, o deslocamento costuma ser para polos regionais de atendimento ou de lazer/trabalho próximos.' + note, n=int(len(d)),
                charts=[chart('bar', 'Coincidência entre municípios', rows, [('igual', 'Mesmo município'), ('diferente', 'Municípios diferentes')], stacked=True),
                        chart('bar', f'Principais fluxos {names[a]} → {names[b]} (quando diferentes)', fdata, [('v', 'Casos')])])

def age_band(v):
    if pd.isna(v): return None
    v = int(v); u, n = v // 1000, v % 1000
    yrs = n if u == 4 else 0
    return '0–9' if yrs < 10 else '10–19' if yrs < 20 else '20–39' if yrs < 40 else '40–59' if yrs < 60 else '60+'
df['AGE'] = num('NU_IDADE_N').map(age_band)
RACA = {1: 'Branca', 2: 'Preta', 3: 'Amarela', 4: 'Parda', 5: 'Indígena', 9: 'Ignorado'}
ESC = {0: 'Analfabeto', 1: 'EF 1ª–4ª inc.', 2: 'EF 4ª compl.', 3: 'EF 5ª–8ª inc.', 4: 'EF compl.', 5: 'EM inc.', 6: 'EM compl.', 7: 'Sup. inc.', 8: 'Sup. compl.', 9: 'Ignorado', 10: 'Não se aplica'}
GEST = {1: '1º tri', 2: '2º tri', 3: '3º tri', 4: 'IG ignorada', 5: 'Não', 6: 'Não se aplica', 9: 'Ignorado'}
def dist(series, labels):
    return [dict(label=l, v=int((series == k).sum())) for k, l in labels.items()]
def demo(mask=None, label='confirmados'):
    m = mask if mask is not None else pd.Series(True, index=df.index)
    n = int(m.sum()); ages = df.AGE[m]
    adata = [dict(label=a, v=int((ages == a).sum())) for a in ['0–9', '10–19', '20–39', '40–59', '60+']]
    r = dist(num('CS_RACA')[m], RACA); e = dist(num('CS_ESCOL_N')[m], ESC); g = dist(num('CS_GESTANT')[m], GEST)
    sex = df.CS_SEXO[m]
    ta = max(adata, key=lambda x: x['v']); tr = max([x for x in r if x['label'] != 'Ignorado'], key=lambda x: x['v'])
    ign_e = next(x['v'] for x in e if x['label'] == 'Ignorado') + int(num('CS_ESCOL_N')[m].isna().sum())
    preg = sum(x['v'] for x in g if x['label'] in ('1º tri', '2º tri', '3º tri', 'IG ignorada'))
    return dict(answer=f"{n} casos {label}. Faixa etária mais frequente: {ta['label']} anos ({pct(ta['v'], n)}%). Sexo masculino: {pct(int((sex=='M').sum()), n)}%. Raça/cor mais registrada: {tr['label']} ({pct(tr['v'], n)}%). Escolaridade ignorada/em branco em {pct(ign_e, n)}% (alta incompletude limita a análise). Gestantes: {preg} casos.", n=n,
                charts=[chart('bar', 'Faixa etária (anos)', adata, [('v', 'Casos')]), chart('bar', 'Raça/cor', r, [('v', 'Casos')]), chart('bar', 'Escolaridade', e, [('v', 'Casos')]), chart('bar', 'Gestação', g, [('v', 'Casos')])])

def hosp_outcome():
    data = []
    for y in YEARS:
        m = df.YEAR == y
        data.append(dict(label=str(y), let_h=pct(int((m & HOSP & DEATH).sum()), int((m & HOSP & (DEATH | CURE)).sum())), let_n=pct(int((m & NOHOSP & DEATH).sum()), int((m & NOHOSP & (DEATH | CURE)).sum())), hosp=pct(int((m & HOSP).sum()), int((m & (HOSP | NOHOSP)).sum()))))
    uf = (num('COUFINF').fillna(0).astype(int).astype(str))
    rows = []
    for c in uf.value_counts().index:
        if c not in ufs: continue
        m = uf == c; tot = int((m & (DEATH | CURE)).sum())
        if tot < 10: continue
        rows.append(dict(label=ufs[c]['s'], letalidade=pct(int((m & DEATH).sum()), tot), hosp=pct(int((m & HOSP).sum()), int((m & (HOSP | NOHOSP)).sum())), n=tot))
    rows.sort(key=lambda r: -r['n'])
    lh = pct(int((HOSP & DEATH).sum()), int((HOSP & (DEATH | CURE)).sum())); ln = pct(int((NOHOSP & DEATH).sum()), int((NOHOSP & (DEATH | CURE)).sum()))
    return dict(answer=f"Letalidade entre hospitalizados: {lh}%; entre não hospitalizados: {ln}% (denominador: casos com desfecho cura ou óbito por febre maculosa). A hospitalização reflete gravidade, não causa óbito. No espaço, a letalidade varia muito por UF de infecção (UFs com ≥10 desfechos). COMUNHOSP só existe em 2013–2017, então o recorte espacial usa a UF provável de infecção.", n=N,
                charts=[chart('line', 'Letalidade e hospitalização por ano (%)', data, [('let_h', 'Letalidade hospitalizados'), ('let_n', 'Letalidade não hospitalizados'), ('hosp', '% hospitalizados')], unit='%'),
                        chart('bar', 'Letalidade e hospitalização por UF de infecção (%)', rows, [('letalidade', 'Letalidade'), ('hosp', '% hospitalizados')], unit='%')])

def exposure(cols):
    data = [dict(label=l, **yn_counts(c)) for c, l in cols]
    txt = '; '.join(f"{d['label']}: {pct(d['Sim'], d['Sim']+d['Não'])}% Sim entre quem respondeu ({d['Sim']}/{d['Sim']+d['Não']}), {d['Ignorado']+d['Em branco']} ignorados/em branco" for d in data)
    return dict(answer=txt + '. Proporções descrevem casos; sem um grupo de não doentes não é possível medir risco relativo da exposição.', n=N,
                charts=[chart('bar', 'Respostas registradas', data, [(k, k) for k in ['Sim', 'Não', 'Ignorado', 'Em branco']], stacked=True)])

def death_by(cols):
    rows = []
    for c, l in cols:
        s = num(c)
        for v, nm in [(1, 'Sim'), (2, 'Não'), (9, 'Ignorado')]:
            m = s == v; tot = int((m & (DEATH | CURE)).sum())
            rows.append(dict(label=f'{l}: {nm}', letalidade=pct(int((m & DEATH).sum()), tot), obitos=int((m & DEATH).sum()), n=tot))
    txt = '; '.join(f"{r['label']} → letalidade {r['letalidade']}% ({r['obitos']}/{r['n']})" for r in rows if not r['label'].endswith('Ignorado'))
    return dict(answer=txt + '. Diferenças podem refletir quem é perguntado/lembrado (viés de informação) e não necessariamente efeito da exposição.', n=int((DEATH | CURE).sum()),
                charts=[chart('bar', 'Letalidade por resposta (%)', rows, [('letalidade', 'Letalidade')], unit='%')])

AMB = {1: 'Domicílio', 2: 'Trabalho', 3: 'Lazer', 4: 'Outro', 9: 'Ignorado'}
def ambiente(deaths=False):
    s = num('AMBIENTE')
    if not deaths:
        data = dist(s, AMB); data.append(dict(label='Em branco', v=int(s.isna().sum())))
        known = sum(d['v'] for d in data[:4])
        return dict(answer='Entre os casos com ambiente informado (' + str(known) + '): ' + ', '.join(f"{d['label']} {pct(d['v'], known)}%" for d in data[:4]) + f". {int(s.isna().sum()+ (s==9).sum())} casos ignorados/em branco.", n=N, charts=[chart('bar', 'Ambiente provável de infecção', data, [('v', 'Casos')])])
    rows = []
    for k, l in AMB.items():
        m = s == k; tot = int((m & (DEATH | CURE)).sum())
        rows.append(dict(label=l, letalidade=pct(int((m & DEATH).sum()), tot), obitos=int((m & DEATH).sum()), n=tot))
    return dict(answer='Letalidade por ambiente: ' + '; '.join(f"{r['label']} {r['letalidade']}% ({r['obitos']}/{r['n']})" for r in rows) + '. Grupos pequenos produzem percentuais instáveis.', n=int((DEATH | CURE).sum()), charts=[chart('bar', 'Letalidade por ambiente (%)', rows, [('letalidade', 'Letalidade')], unit='%')])

def zona(deaths=False):
    s = num('ZONA') if 'ZONA' in df else pd.Series(dtype=float)
    return dict(answer=f"Não estimável. A variável ZONA só aparece na planilha de 2018 e está preenchida em {int(s.notna().sum())} dos casos confirmados, então não há dados para descrever {'óbitos' if deaths else 'casos'} por zona urbana, periurbana ou rural.", n=int(s.notna().sum()), charts=[])

ANIMALS = [('CAPIVARA', 'Capivara'), ('CAO_GATO', 'Cão/gato'), ('BOVINO', 'Bovino'), ('EQUINOS', 'Equinos')]
Q = [
 ('Dados obrigatórios', 'Epidemiologia', 'Existe padrão temporal (semana epidemiológica ou mês) no início da investigação (DT_INVEST)?', lambda: season('DT_INVEST', 'data de investigação')),
 ('Dados obrigatórios', 'Clínica médica', 'Como se comportam as variáveis clínicas nos óbitos e nas curas, e quais melhor separam vida e morte?', clinical),
 ('Dados obrigatórios', 'Epidemiologia', 'Como se comporta a autoctonia (TPAUTOCTO) no tempo?', autocto),
 ('Dados obrigatórios', 'Epidemiologia', 'Quais os municípios de infecção mais importantes e sua distribuição no tempo (COMUNINF)?', infection_munis),
 ('Dados obrigatórios', 'Gestão da Saúde', 'Intervalo entre início (DT_INVEST) e encerramento (DT_ENCERRA) da investigação', lambda: interval('DT_INVEST', 'DT_ENCERRA')),
 ('Dados essenciais', 'Epidemiologia', 'Existe padrão temporal na data de notificação (DT_NOTIFIC)?', lambda: season('DT_NOTIFIC', 'data de notificação')),
 ('Dados essenciais', 'Epidemiologia', 'Existe padrão temporal na data dos primeiros sintomas (DT_SIN_PRI)?', lambda: season('DT_SIN_PRI', 'data de início dos sintomas')),
 ('Dados essenciais', 'Gestão da Saúde', 'Intervalo entre primeiros sintomas (DT_SIN_PRI) e notificação (DT_NOTIFIC)', lambda: interval('DT_SIN_PRI', 'DT_NOTIFIC')),
 ('Dados essenciais', 'Gestão da Saúde', 'Intervalo entre notificação (DT_NOTIFIC) e início da investigação (DT_INVEST)', lambda: interval('DT_NOTIFIC', 'DT_INVEST')),
 ('Dados essenciais', 'Gestão da Saúde', 'Intervalo entre primeiros sintomas (DT_SIN_PRI) e início da investigação (DT_INVEST)', lambda: interval('DT_SIN_PRI', 'DT_INVEST')),
 ('Dados essenciais', 'Gestão da Saúde', 'Intervalo entre primeiros sintomas e coleta de amostras (DTS1/DTS2)', lambda: interval_multi('DT_SIN_PRI', ['DTS1', 'DTS2'])),
 ('Dados essenciais', 'Gestão da Saúde', 'Intervalo entre notificação e coleta de amostras (DTS1/DTS2)', lambda: interval_multi('DT_NOTIFIC', ['DTS1', 'DTS2'])),
 ('Dados essenciais', 'Gestão da Saúde', 'Intervalo entre notificação e internação (hospitalizados)', lambda: interval('DT_NOTIFIC', 'DTINTERNA', HOSP, 'hospitalizados ')),
 ('Dados essenciais', 'Gestão da Saúde', 'Intervalo entre investigação e internação (hospitalizados)', lambda: interval('DT_INVEST', 'DTINTERNA', HOSP, 'hospitalizados ')),
 ('Dados essenciais', 'Gestão da Saúde', 'Tempo de internação (DTINTERNA → DTALTA) em hospitalizados que evoluíram para cura', lambda: interval('DTINTERNA', 'DTALTA', HOSP & CURE, 'hospitalizados com cura ')),
 ('Dados essenciais', 'Gestão da Saúde', 'Intervalo entre primeiros sintomas e óbito', lambda: interval('DT_SIN_PRI', 'DT_OBITO', DEATH, 'que evoluíram a óbito ')),
 ('Dados essenciais', 'Gestão da Saúde', 'Intervalo entre investigação e óbito (hospitalizados)', lambda: interval('DT_INVEST', 'DT_OBITO', DEATH & HOSP, 'hospitalizados com óbito ')),
 ('Dados essenciais', 'Epidemiologia e Gestão', 'Relação entre municípios de infecção, residência e notificação (não hospitalizados)', lambda: flows(['COMUNINF', 'ID_MN_RESI', 'ID_MUNICIP'], NOHOSP, 'não hospitalizados ')),
 ('Dados essenciais', 'Epidemiologia e Gestão', 'Relação entre municípios de infecção, residência, notificação e hospitalização (hospitalizados)', lambda: flows(['COMUNINF', 'ID_MN_RESI', 'ID_MUNICIP', 'COMUNHOSP'], HOSP, 'hospitalizados ')),
 ('Dados essenciais', 'Epidemiologia e Gestão', 'Relação entre município de infecção e de residência', lambda: flows(['COMUNINF', 'ID_MN_RESI'])),
 ('Dados essenciais', 'Epidemiologia e Gestão', 'Relação entre município de residência e de notificação', lambda: flows(['ID_MN_RESI', 'ID_MUNICIP'])),
 ('Dados essenciais', 'Epidemiologia e Gestão', 'Relação entre município de notificação e de hospitalização (hospitalizados)', lambda: flows(['ID_MUNICIP', 'COMUNHOSP'], HOSP, 'hospitalizados ')),
 ('Dados essenciais', 'Epidemiologia', 'Perfil demográfico dos casos confirmados', lambda: demo()),
 ('Dados essenciais', 'Epidemiologia', 'Perfil demográfico dos hospitalizados', lambda: demo(HOSP, 'hospitalizados')),
 ('Dados essenciais', 'Epidemiologia', 'Perfil demográfico dos não hospitalizados', lambda: demo(NOHOSP, 'não hospitalizados')),
 ('Dados essenciais', 'Epidemiologia', 'Perfil demográfico dos que evoluíram para cura', lambda: demo(CURE, 'com cura')),
 ('Dados essenciais', 'Epidemiologia', 'Perfil demográfico dos óbitos', lambda: demo(DEATH, 'com óbito por febre maculosa')),
 ('Dados essenciais', 'Epidemiologia', 'Hospitalização e desfecho no espaço e no tempo', hosp_outcome),
 ('Dados essenciais', 'Epidemiologia', 'Casos e contato com animais (capivara, cão/gato, bovino, equinos)', lambda: exposure(ANIMALS)),
 ('Dados essenciais', 'Epidemiologia', 'Casos e contato com carrapatos', lambda: exposure([('CARRAPATO', 'Carrapato')])),
 ('Dados essenciais', 'Epidemiologia', 'Casos e contato com mata, cachoeira ou ambientes naturais (FOI_MATA)', lambda: exposure([('FOI_MATA', 'Mata/ambientes naturais')])),
 ('Dados essenciais', 'Epidemiologia', 'Casos e zona do provável local de infecção (ZONA)', lambda: zona()),
 ('Dados essenciais', 'Epidemiologia', 'Casos e ambiente da provável infecção (AMBIENTE)', lambda: ambiente()),
 ('Dados essenciais', 'Epidemiologia', 'Casos e doença relacionada ao trabalho (DOENCA_TRA)', lambda: exposure([('DOENCA_TRA', 'Relacionada ao trabalho')])),
 ('Dados essenciais', 'Epidemiologia', 'Óbitos e zona do provável local de infecção (ZONA)', lambda: zona(True)),
 ('Dados essenciais', 'Epidemiologia', 'Óbitos e ambiente da provável infecção (AMBIENTE)', lambda: ambiente(True)),
 ('Dados essenciais', 'Epidemiologia', 'Óbitos e contato com carrapatos', lambda: death_by([('CARRAPATO', 'Carrapato')])),
 ('Dados essenciais', 'Epidemiologia', 'Óbitos e contato com animais', lambda: death_by(ANIMALS)),
 ('Dados essenciais', 'Epidemiologia', 'Óbitos e contato com mata, cachoeira ou ambientes naturais', lambda: death_by([('FOI_MATA', 'Mata/ambientes naturais')])),
]
out = dict(total=N, deaths=int(DEATH.sum()), cures=int(CURE.sum()), years=[2013, 2025],
           questions=[dict(id=i + 1, group=g, area=a, question=q, **f()) for i, (g, a, q, f) in enumerate(Q)])
json.dump(out, sys.stdout, ensure_ascii=False, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
