import { describe,it,expect } from 'vitest';
import raw from '@/data/profiles.server.json';
import { computeProfiles,computeProfileComparison,profileMetrics,profileDifference,fields,defaultProfileFilters,validateProfileFilters,type ProfileRow } from '@/lib/profiles';
const source=raw as ProfileRow[];
describe('territorial profiles',()=>{
  it('includes exactly Brazil confirmed cases 2013–2025',()=>{expect(computeProfiles(source,defaultProfileFilters).total).toBe(3034);});
  it('drills Brazil to South to state to municipality',()=>{const f={...defaultProfileFilters,region:'sul'};const d=computeProfiles(source,f);expect(d.total).toBe(710);expect(d.children.map(c=>c.count)).toEqual([575,111,24]);expect(computeProfiles(source,{...f,uf:'42'}).total).toBe(575);const m=source.find(r=>r[0].startsWith('42'))?.[0];if(!m)throw new Error('fixture');expect(computeProfiles(source,{...f,uf:'42',mu:m}).total).toBe(source.filter(r=>r[0]===m).reduce((n,r)=>n+r[3],0));});
  it('ranks observed joint profiles, not combined independent modes',()=>{const d=computeProfiles(source,{...defaultProfileFilters,region:'sul'});expect(d.ranking[0]).toEqual({count:90,values:[0,3,1],labels:['Masculino','40–59 anos','Não']});expect(d.complete).toBe(703);expect(d.excluded).toBe(7);});
  it('filters male middle-aged dog/cat contact on the same cases',()=>{const d=computeProfiles(source,{...defaultProfileFilters,region:'sul',categories:{CS_SEXO:0,FAIXA:3,CAO_GATO:0}});expect(d.total).toBe(79);expect(d.ranking[0]?.count).toBe(79);});
  it('distinguishes missing values from no and enforces territorial hierarchy',()=>{const d=computeProfiles(source,{...defaultProfileFilters,region:'sul'});expect(d.distributions.find(v=>v.code==='CAO_GATO')?.counts.map(v=>v.count)).toEqual([328,375,7]);expect(()=>validateProfileFilters({...defaultProfileFilters,region:'sul',uf:'35'})).toThrow();});
});
describe('profile comparison',()=>{
  const compare=(categories:Record<string,number>={})=>computeProfileComparison(source,{filters:{...defaultProfileFilters,categories},a:{region:'sul',uf:'',mu:''},b:{region:'sudeste',uf:'',mu:''}});
  it('reports the observed profile as a percentage of all territorial cases with complete-case denominator',()=>{
    const d=compare();const r=d.combinations.find(r=>r.key==='0,3,1');
    expect(r?.a.count).toBe(90);expect(r?.a.territorialTotal).toBe(710);expect(r?.a.valid).toBe(703);
    expect(r?.a.percent).toBeCloseTo(90/710*100);expect(r?.a.validPercent).toBeCloseTo(90/703*100);
  });
  it('keeps territorial denominator before category filters',()=>{
    const d=compare({CS_SEXO:0,FAIXA:3,CAO_GATO:0});expect(d.a.total).toBe(79);
    expect(d.combinations[0]?.a.percent).toBeCloseTo(79/710*100);expect(d.combinations[0]?.a.valid).toBe(79);
  });
  it('calculates signed count and percentage-point differences B minus A',()=>{
    expect(profileDifference(profileMetrics(10,100,80),profileMetrics(30,200,150))).toEqual({count:20,points:5});
  });
  it('counts a counterpart exactly even outside its top five',()=>{
    const i=fields.findIndex(v=>v.code==='FAIXA');const sex=fields.findIndex(v=>v.code==='CS_SEXO');const mk=(mu:string,value:number,count:number):ProfileRow=>{const v=fields.map(()=>0);v[i]=value%5;v[sex]=Math.floor(value/5);return [mu,2013,v,count];};
    const fixture=[mk('410001',5,100),...Array.from({length:6},(_,v)=>mk('350001',v,10-v))];
    const d=computeProfileComparison(fixture,{filters:{...defaultProfileFilters,joint:['CS_SEXO','FAIXA']},a:{region:'sul',uf:'',mu:''},b:{region:'sudeste',uf:'',mu:''}});
    expect(d.combinations.find(r=>r.key==='1,0')?.b.count).toBe(5);
  });
  it('uses each variable valid denominator and separates unknown categories',()=>{
    const d=compare();const rows=d.distributions.find(v=>v.code==='CAO_GATO')?.rows;
    expect(rows?.[0]?.a.count).toBe(328);expect(rows?.[0]?.a.valid).toBe(703);expect(rows?.[0]?.a.percent).toBeCloseTo(328/710*100);
    expect(rows?.[2]?.missing).toBe(true);expect(rows?.[2]?.a.count).toBe(7);
  });
  it('returns noncalculable percentages for zero denominators',()=>{
    expect(profileMetrics(0,0,0).percent).toBeNull();expect(profileMetrics(0,10,0).validPercent).toBeNull();
    expect(profileDifference(profileMetrics(0,0,0),profileMetrics(1,10,10)).points).toBeNull();
  });
  it('supports states and municipalities with the same shared period',()=>{
    const d=computeProfileComparison(source,{filters:{...defaultProfileFilters,from:2013,to:2013},a:{region:'sul',uf:'42',mu:''},b:{region:'sul',uf:'42',mu:'420540'}});
    expect(d.a.territorialTotal).toBe(source.filter(r=>r[0].startsWith('42')&&r[1]===2013).reduce((n,r)=>n+r[3],0));
    expect(d.b.territorialTotal).toBe(source.filter(r=>r[0]==='420540'&&r[1]===2013).reduce((n,r)=>n+r[3],0));
  });
});