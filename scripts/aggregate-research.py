"""Offline confirmed-case counts by municipality, notification year and category.
Usage: python scripts/aggregate-research.py /mnt/user-uploads
No individual records are emitted. Category vectors include unknown/blank.
"""
import json,sys
from pathlib import Path
import pandas as pd
root=Path(sys.argv[1]);app=json.load(open('src/data/fm.json'))
fields=[
 ('EVOLUCAO','Evolução',{1:'Cura',2:'Óbito por febre maculosa',3:'Óbito por outra causa'}),
 ('HOSPITAL','Hospitalização',{1:'Sim',2:'Não'}),
 ('CS_SEXO','Sexo',{'M':'Masculino','F':'Feminino'}),
 ('CS_RACA','Raça/cor',{1:'Branca',2:'Preta',3:'Amarela',4:'Parda',5:'Indígena'}),
 ('CS_ESCOL_N','Escolaridade',{0:'Analfabeto',1:'1ª–4ª série EF incompleta',2:'4ª série EF completa',3:'5ª–8ª série EF incompleta',4:'Ensino fundamental completo',5:'Ensino médio incompleto',6:'Ensino médio completo',7:'Superior incompleto',8:'Superior completo',10:'Não se aplica'}),
 ('CS_GESTANT','Gestação',{1:'1º trimestre',2:'2º trimestre',3:'3º trimestre',4:'Idade gestacional ignorada',5:'Não',6:'Não se aplica'}),
 ('TPAUTOCTO','Autoctonia',{1:'Sim',2:'Não',3:'Indeterminado'}),
 ('AMBIENTE','Ambiente provável de infecção',{1:'Domicílio',2:'Trabalho',3:'Lazer',4:'Outro'}),
 ('ZONA','Zona provável de infecção',{1:'Urbana',2:'Rural',3:'Periurbana'}),
]
for k,l in [('CARRAPATO','Contato com carrapato'),('CAPIVARA','Contato com capivara'),('CAO_GATO','Contato com cão/gato'),('BOVINO','Contato com bovino'),('EQUINOS','Contato com cavalo'),('FOI_MATA','Contato com ambientes naturais'),('DOENCA_TRA','Doença relacionada ao trabalho'),('FEBRE','Febre'),('CEFALEIA','Cefaleia'),('MIALGIA','Mialgia'),('CHOQUE','Choque'),('RESPIRATO','Sinais respiratórios')]:fields.append((k,l,{1:'Sim',2:'Não'}))
fields.append(('FAIXA','Faixa etária',{0:'0–9 anos',1:'10–19 anos',2:'20–39 anos',3:'40–59 anos',4:'60+ anos'}))
defs=[{'code':k,'label':l,'categories':list(m.values())+['Ignorado, em branco ou inválido']} for k,l,m in fields]
rows=[]
for year in range(2013,2026):
 f=pd.read_excel(root/f'FMACBR{year%100:02d}.xlsx');f=f[pd.to_numeric(f.CLASSI_FIN,errors='coerce')==1].copy()
 age=pd.to_numeric(f.NU_IDADE_N,errors='coerce');u=age//1000;v=age%1000;years=pd.Series(float('nan'),index=f.index)
 for unit,factor in [(1,1/(24*365.25)),(2,1/365.25),(3,1/12),(4,1)]:years.loc[u==unit]=v[u==unit]*factor
 f['FAIXA']=pd.cut(years,[-1,10,20,40,60,121],right=False,labels=[0,1,2,3,4]).astype(float)
 f['mun']=pd.to_numeric(f.ID_MN_RESI,errors='coerce').map(lambda x:str(int(x))[:6] if pd.notna(x) else '000000')
 for code,g in f.groupby('mun'):
  vectors=[]
  for k,l,m in fields:
   s=g[k] if k in g else pd.Series(index=g.index,dtype=float)
   if k!='CS_SEXO':s=pd.to_numeric(s,errors='coerce')
   counts=[int((s==c).sum()) for c in m];counts.append(len(g)-sum(counts));vectors.append(counts)
  rows.append([code,year,len(g),vectors])
print('Confirmed',sum(r[2] for r in rows),'groups',len(rows))
assert sum(r[2] for r in rows)==3034
for r in rows:assert all(sum(v)==r[2] for v in r[3])
out={'fields':defs,'rows':rows,'source':'SINAN · FMACBR13–25.xlsx · CLASSI_FIN=1 · município de residência · ano de notificação','note':'Ignorado, em branco ou inválido é contado separadamente; campo indisponível no arquivo também entra nessa categoria. ZONA sem respostas úteis em 2013–2025. Sem dados individuais; categorias são marginais e não permitem cruzar exposição com óbito. 2025 pode estar incompleto; zero significa nenhum confirmado na versão recebida, não ausência de risco.'}
Path('src/data/research.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
