// Measurement source for §7 of docs/superpowers/specs/2026-08-24-shadowbox-kmeans-design.md
// Synthetic configs (blobs, crescents, uniform) + restart divergence sweep.
// Hand-run from the repo root: node reference/kmeans-probe-synthetic.mjs
// These three generators are the spec for data/blobs.json (§6).
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const gauss=r=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};
const d2=(a,b)=>a.reduce((s,v,i)=>s+(v-b[i])**2,0);

function kmeans(X,k,rng,{plusplus=false,iters=300}={}){
  let C=[];
  if(plusplus){ C.push(X[Math.floor(rng()*X.length)].slice());
    while(C.length<k){const d=X.map(x=>Math.min(...C.map(c=>d2(x,c))));const T=d.reduce((a,b)=>a+b,0);
      let r=rng()*T,i=0;while(r>d[i]&&i<X.length-1){r-=d[i];i++;}C.push(X[i].slice());}
  } else { const idx=new Set(); while(idx.size<k) idx.add(Math.floor(rng()*X.length)); C=[...idx].map(i=>X[i].slice()); }
  let lab=new Array(X.length).fill(-1);
  for(let it=0;it<iters;it++){let moved=false;
    for(let i=0;i<X.length;i++){let best=0,bd=Infinity;
      for(let j=0;j<k;j++){const dd=d2(X[i],C[j]);if(dd<bd){bd=dd;best=j;}}
      if(lab[i]!==best){lab[i]=best;moved=true;}}
    const sum=Array.from({length:k},()=>[0,0]),cnt=new Array(k).fill(0);
    for(let i=0;i<X.length;i++){cnt[lab[i]]++;sum[lab[i]][0]+=X[i][0];sum[lab[i]][1]+=X[i][1];}
    for(let j=0;j<k;j++) if(cnt[j]) C[j]=[sum[j][0]/cnt[j],sum[j][1]/cnt[j]];
    if(!moved) break;}
  return {C,lab,wcss:X.reduce((s,x,i)=>s+d2(x,C[lab[i]]),0)};
}
// ---- the three candidate configurations for blobs.json ----
function makeBlobs(seed=42){const r=mulberry32(seed);const ctr=[[-2.2,-1.4],[2.4,-1.0],[0.2,2.6]];
  const P=[],L=[];for(let c=0;c<3;c++)for(let i=0;i<50;i++){P.push([ctr[c][0]+gauss(r)*0.55,ctr[c][1]+gauss(r)*0.55]);L.push(c);}return{P,L,k:3};}
function makeCrescents(seed=43){const r=mulberry32(seed);const P=[],L=[];
  for(let i=0;i<75;i++){const t=Math.PI*i/74;P.push([2*Math.cos(t)+gauss(r)*0.13,2*Math.sin(t)+gauss(r)*0.13]);L.push(0);}
  for(let i=0;i<75;i++){const t=Math.PI*i/74;P.push([2-2*Math.cos(t)+gauss(r)*0.13,1.0-2*Math.sin(t)+gauss(r)*0.13]);L.push(1);}
  return{P,L,k:2};}
function makeUniform(seed=44){const r=mulberry32(seed);const P=[],L=[];
  for(let i=0;i<150;i++){P.push([(r()-0.5)*6,(r()-0.5)*6]);L.push(0);}return{P,L,k:3};}

const purity=(lab,truth,k)=>{const n=lab.length;let hit=0;
  for(let j=0;j<k;j++){const idx=[...Array(n).keys()].filter(i=>lab[i]===j);if(!idx.length)continue;
    const cnt={};idx.forEach(i=>cnt[truth[i]]=(cnt[truth[i]]||0)+1);hit+=Math.max(...Object.values(cnt));}
  return hit/n;};

function sweep(name,mk,kOverride){
  const {P,L,k:tk}=mk(); const k=kOverride??tk;
  for(const mode of ['random','++']){
    const ws=[],pu=[];
    for(let s=1;s<=60;s++){const r=kmeans(P,k,mulberry32(s*7919),{plusplus:mode==='++'});ws.push(r.wcss);pu.push(purity(r.lab,L,k));}
    const uniq=[...new Set(ws.map(w=>w.toFixed(2)))];
    const best=Math.min(...ws),worst=Math.max(...ws);
    const badFrac=ws.filter(w=>w>best*1.02).length/60;
    console.log(`  ${name} k=${k} [${mode.padEnd(6)}] optima=${String(uniq.length).padStart(2)}  best=${best.toFixed(1)} worst=${worst.toFixed(1)}  SPREAD=${((worst/best-1)*100).toFixed(1)}%  landed-wrong=${(100*badFrac).toFixed(0)}%  purity ${Math.min(...pu).toFixed(2)}-${Math.max(...pu).toFixed(2)}`);
  }
}
console.log('RESTART DIVERGENCE - 60 inits each, k-means run to convergence\n');
sweep('blobs    ',makeBlobs);
sweep('blobs    ',makeBlobs,5);
sweep('crescents',makeCrescents);
sweep('uniform  ',makeUniform);
console.log('\nCRESCENTS - can k-means recover the two moons at all?');
{const {P,L}=makeCrescents();let bestP=0,bestW=Infinity,pAtBest=0;
 for(let s=1;s<=60;s++){const r=kmeans(P,2,mulberry32(s*7919),{plusplus:true});const p=purity(r.lab,L,2);
   if(r.wcss<bestW){bestW=r.wcss;pAtBest=p;} bestP=Math.max(bestP,p);}
 console.log(`  best-WCSS solution recovers ${(100*pAtBest).toFixed(1)}% of true labels; best purity over all restarts ${(100*bestP).toFixed(1)}%`);
 console.log('  (50% = coin flip. The lowest-cost answer is NOT the true one -> the convex-cell failure, visible.)');}
