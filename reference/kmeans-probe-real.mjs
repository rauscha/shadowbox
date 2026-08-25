// Measurement source for §7 of docs/superpowers/specs/2026-08-24-shadowbox-kmeans-design.md
// Real data (births, biometry). Hand-run from the repo root: node reference/kmeans-probe-real.mjs
// Superseded during M6 by test/kmeans-claims.test.mjs; kept so the spec numbers stay reproducible.
import fs from 'node:fs';
const R = p => JSON.parse(fs.readFileSync(p, 'utf8'));

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const zscore = cols => { const mu=cols.map(c=>c.reduce((a,b)=>a+b,0)/c.length);
  const sd=cols.map((c,j)=>Math.sqrt(c.reduce((a,b)=>a+(b-mu[j])**2,0)/c.length));
  return cols[0].map((_,i)=>cols.map((c,j)=>(c[i]-mu[j])/sd[j])); };
const d2=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);

function kmeans(X,k,rng,{plusplus=true,iters=200}={}){
  let C=[];
  if(plusplus){ C.push(X[Math.floor(rng()*X.length)].slice());
    while(C.length<k){ const d=X.map(x=>Math.min(...C.map(c=>d2(x,c)))); const T=d.reduce((a,b)=>a+b,0);
      let r=rng()*T,i=0; while(r>d[i]&&i<X.length-1){r-=d[i];i++;} C.push(X[i].slice()); }
  } else { const idx=new Set(); while(idx.size<k) idx.add(Math.floor(rng()*X.length)); C=[...idx].map(i=>X[i].slice()); }
  let lab=new Array(X.length).fill(-1), it=0;
  for(;it<iters;it++){ let moved=false;
    for(let i=0;i<X.length;i++){ let best=0,bd=Infinity;
      for(let j=0;j<k;j++){const dd=d2(X[i],C[j]); if(dd<bd){bd=dd;best=j;}}
      if(lab[i]!==best){lab[i]=best;moved=true;} }
    const sum=Array.from({length:k},()=>new Array(X[0].length).fill(0)), cnt=new Array(k).fill(0);
    for(let i=0;i<X.length;i++){cnt[lab[i]]++; for(let j=0;j<X[0].length;j++) sum[lab[i]][j]+=X[i][j];}
    for(let j=0;j<k;j++) if(cnt[j]) C[j]=sum[j].map(s=>s/cnt[j]);
    if(!moved) break; }
  const wcss=X.reduce((s,x,i)=>s+d2(x,C[lab[i]]),0);
  return {C,lab,wcss,iters:it};
}
const corr=(a,b)=>{const n=a.length,ma=a.reduce((x,y)=>x+y,0)/n,mb=b.reduce((x,y)=>x+y,0)/n;
  let sab=0,sa=0,sb=0; for(let i=0;i<n;i++){const u=a[i]-ma,v=b[i]-mb;sab+=u*v;sa+=u*u;sb+=v*v;} return sab/Math.sqrt(sa*sb);};
// eta^2: fraction of variance in y explained by the cluster labels
function eta2(y,lab,k){ const n=y.length,m=y.reduce((a,b)=>a+b,0)/n;
  let tot=y.reduce((s,v)=>s+(v-m)**2,0), between=0;
  for(let j=0;j<k;j++){ const g=y.filter((_,i)=>lab[i]===j); if(!g.length) continue;
    const mg=g.reduce((a,b)=>a+b,0)/g.length; between+=g.length*(mg-m)**2; }
  return between/tot; }

console.log('='.repeat(74));
console.log('A. BIRTHS  (GA weeks x birthweight g), standardized, n=400');
console.log('='.repeat(74));
const B=R('data/births.json'); const XB=zscore([B.xs,B.ys]);
for(const k of [2,3,4,5]){
  const r=kmeans(XB,k,mulberry32(7),{});
  const order=[...Array(k).keys()].sort((a,b)=>r.C[a][0]-r.C[b][0]);
  const parts=order.map(j=>{ const gs=B.xs.filter((_,i)=>r.lab[i]===j), ws=B.ys.filter((_,i)=>r.lab[i]===j);
    return `n=${gs.length} GA[${Math.min(...gs)}-${Math.max(...gs)}] BW[${Math.min(...ws)}-${Math.max(...ws)}]`; });
  console.log(`k=${k} wcss=${r.wcss.toFixed(1)} eta2(GA)=${eta2(B.xs,r.lab,k).toFixed(3)} eta2(BW)=${eta2(B.ys,r.lab,k).toFixed(3)}`);
  parts.forEach(p=>console.log('      '+p));
}
console.log('\n-- restart sensitivity, k=3, 60 RANDOM (non-++) inits --');
{ const ws=[]; for(let s=1;s<=60;s++) ws.push(kmeans(XB,3,mulberry32(s),{plusplus:false}).wcss);
  const uniq=[...new Set(ws.map(w=>w.toFixed(3)))].sort();
  console.log(`   distinct optima: ${uniq.length}  best=${Math.min(...ws).toFixed(2)} worst=${Math.max(...ws).toFixed(2)} spread=${((Math.max(...ws)/Math.min(...ws)-1)*100).toFixed(1)}%`);
  console.log('   values:', uniq.slice(0,8).join(' ')); }

console.log('\n'+'='.repeat(74));
console.log('B. BIOMETRY (BPD,HC,AC,FL), standardized, n=350');
console.log('='.repeat(74));
const M=R('data/biometry.json'); const XM=zscore([M.bpd,M.hc,M.ac,M.fl]);
for(const k of [2,3,4,5]){
  const r=kmeans(XM,k,mulberry32(11),{});
  const order=[...Array(k).keys()].sort((a,b)=>{
    const ga=j=>M.ga.filter((_,i)=>r.lab[i]===j).reduce((x,y)=>x+y,0)/M.ga.filter((_,i)=>r.lab[i]===j).length;
    return ga(a)-ga(b);});
  console.log(`k=${k} wcss=${r.wcss.toFixed(1)}  eta2(GA)=${eta2(M.ga,r.lab,k).toFixed(3)}`);
  order.forEach(j=>{ const g=M.ga.filter((_,i)=>r.lab[i]===j);
    console.log(`      n=${g.length} GA mean ${(g.reduce((a,b)=>a+b,0)/g.length).toFixed(1)} range [${Math.min(...g).toFixed(1)}-${Math.max(...g).toFixed(1)}]`); });
}
console.log('\n-- raw mm vs standardized, k=3 (the units decision) --');
{ const raw=M.bpd.map((_,i)=>[M.bpd[i],M.hc[i],M.ac[i],M.fl[i]]);
  const rr=kmeans(raw,3,mulberry32(11),{}), rs=kmeans(XM,3,mulberry32(11),{});
  let agree=0; // best-match label agreement
  const perm=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  for(const p of perm){ let a=0; for(let i=0;i<raw.length;i++) if(p[rr.lab[i]]===rs.lab[i]) a++; agree=Math.max(agree,a); }
  console.log(`   raw eta2(GA)=${eta2(M.ga,rr.lab,3).toFixed(3)}  std eta2(GA)=${eta2(M.ga,rs.lab,3).toFixed(3)}  label agreement=${(100*agree/raw.length).toFixed(1)}%`); }

console.log('\n-- elbow: WCSS by k (is there one?) --');
for(const [nm,X] of [['births',XB],['biometry',XM]]){
  const w=[1,2,3,4,5,6,7,8].map(k=>kmeans(X,k,mulberry32(3),{}).wcss);
  console.log(`   ${nm.padEnd(9)}`, w.map((v,i)=>`k${i+1}:${v.toFixed(0)}`).join(' '));
  console.log(`   ${' '.padEnd(9)}`, 'drop%', w.slice(1).map((v,i)=>`${(100*(1-v/w[i])).toFixed(0)}`).join(' '));
}
