"""Build server-only grouped category profiles (no names, dates or record IDs).
Uses the same category ordering as aggregate-research.py. Offline only.
"""
import runpy,sys,json
from pathlib import Path
from collections import Counter
import pandas as pd
# Read field specification without executing the original script.
source=Path('scripts/aggregate-research.py').read_text().split('defs=')[0]
namespace={'__name__':'profile_fields'};exec(source,namespace);fields=namespace['fields']
counts=Counter()
for year in range(2013,2026):
 f=pd.read_excel(Path(sys.argv[1])/f'FMACBR{year%100:02d}.xlsx');f=f[pd.to_numeric(f.CLASSI_FIN,errors='coerce')==1].copy()
 a=pd.to_numeric(f.NU_IDADE_N,errors='coerce');u=a//1000;v=a%1000;age=pd.Series(float('nan'),index=f.index)
 for unit,factor in [(1,1/(24*365.25)),(2,1/365.25),(3,1/12),(4,1)]:age.loc[u==unit]=v[u==unit]*factor
 f['FAIXA']=pd.cut(age,[-1,10,20,40,60,121],right=False,labels=[0,1,2,3,4]).astype(float)
 vectors=[]
 for code,label,mapping in fields:
  s=f[code] if code in f else pd.Series(index=f.index,dtype=float)
  if code!='CS_SEXO':s=pd.to_numeric(s,errors='coerce')
  positions={v:i for i,v in enumerate(mapping)}
  vectors.append(s.map(positions).fillna(len(mapping)).astype(int).tolist())
 mun=pd.to_numeric(f.ID_MN_RESI,errors='coerce').map(lambda x:str(int(x))[:6] if pd.notna(x) else '000000').tolist()
 for idx,m in enumerate(mun):counts[(m,year,tuple(v[idx] for v in vectors))]+=1
out=[[m,y,list(v),n] for (m,y,v),n in counts.items()]
assert sum(r[3] for r in out)==3034
Path('src/data/profiles.server.json').write_text(json.dumps(out,separators=(',',':')))
print('Grouped profiles',len(out),'confirmed',sum(r[3] for r in out))
