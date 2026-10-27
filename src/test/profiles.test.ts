import { describe,it,expect } from 'vitest';
import raw from '@/data/profiles.server.json';
import { computeProfiles,defaultProfileFilters,validateProfileFilters,type ProfileRow } from '@/lib/profiles';
const source=raw as ProfileRow[];
describe('territorial profiles',()=>{
  it('includes exactly Brazil confirmed cases 2013–2025',()=>{expect(computeProfiles(source,defaultProfileFilters).total).toBe(3034);});
  it('drills Brazil to South to state to municipality',()=>{const f={...defaultProfileFilters,region:'sul'};const d=computeProfiles(source,f);expect(d.total).toBe(710);expect(d.children.map(c=>c.count)).toEqual([575,111,24]);expect(computeProfiles(source,{...f,uf:'42'}).total).toBe(575);const m=source.find(r=>r[0].startsWith('42'))?.[0];if(!m)throw new Error('fixture');expect(computeProfiles(source,{...f,uf:'42',mu:m}).total).toBe(source.filter(r=>r[0]===m).reduce((n,r)=>n+r[3],0));});
  it('ranks observed joint profiles, not combined independent modes',()=>{const d=computeProfiles(source,{...defaultProfileFilters,region:'sul'});expect(d.ranking[0]).toEqual({count:90,values:[0,3,1],labels:['Masculino','40–59 anos','Não']});expect(d.complete).toBe(703);expect(d.excluded).toBe(7);});
  it('filters male middle-aged dog/cat contact on the same cases',()=>{const d=computeProfiles(source,{...defaultProfileFilters,region:'sul',categories:{CS_SEXO:0,FAIXA:3,CAO_GATO:0}});expect(d.total).toBe(79);expect(d.ranking[0]?.count).toBe(79);});
  it('distinguishes missing values from no and enforces territorial hierarchy',()=>{const d=computeProfiles(source,{...defaultProfileFilters,region:'sul'});expect(d.distributions.find(v=>v.code==='CAO_GATO')?.counts.map(v=>v.count)).toEqual([328,375,7]);expect(()=>validateProfileFilters({...defaultProfileFilters,region:'sul',uf:'35'})).toThrow();});
});