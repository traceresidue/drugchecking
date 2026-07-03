/* ---- spectral synthesis ---- */

export interface ChromatogramPeak { rt: number; amp: number; sigma?: number }
export interface Trace { x: number[]; y: number[] }
/** [center, intensity, width] */
export type FtirBand = [number, number, number?];
export interface StickPeak { mz: number; i: number }

// Sum-of-Gaussians chromatogram trace. peaks:[{rt,amp}], returns {x:[],y:[]}
export function chromatogram(peaks: ChromatogramPeak[],{x0=2,x1=13,n=900,sigma=0.045}={}): Trace {
  const x: number[]=[],y: number[]=[];
  for(let i=0;i<n;i++){
    const t=x0+(x1-x0)*i/(n-1); x.push(t);
    let v=0; for(const p of peaks){const d=(t-p.rt)/(p.sigma||sigma); v+=p.amp*Math.exp(-0.5*d*d);}
    y.push(v);
  }
  const mx=Math.max(...y,1e-9);
  return {x,y:y.map(v=>v/mx*100)};
}

// FTIR absorbance curve from bands [[center,intensity,width],...]; reversed x handled by caller
export function ftirCurve(bands: FtirBand[],{x0=4000,x1=400,n=1100}={}): Trace {
  const x: number[]=[],y: number[]=[];
  for(let i=0;i<n;i++){
    const w=x0+(x1-x0)*i/(n-1); x.push(w);
    let v=0; for(const [c,I,wd] of bands){const d=(w-c)/(wd||20); v+=I*Math.exp(-0.5*d*d);}
    y.push(v);
  }
  return {x,y}; // y in absorbance-ish 0..~1
}

// Mass spectrum sticks: returns sorted peaks with base-peak normalization
export function stickSpectrum(peaks: Array<[number, number]>): StickPeak[] {
  const mx=Math.max(...peaks.map(p=>p[1]),1);
  return peaks.map(([mz,i])=>({mz,i:i/mx*100})).sort((a,b)=>a.mz-b.mz);
}

// cosine similarity between two stick spectra (binned at 1 m/z)
export function cosine(a: StickPeak[],b: StickPeak[],tol=0.5): number {
  let dot=0,na=0,nb=0; const used=new Set<number>();
  for(const pa of a){na+=pa.i*pa.i;}
  for(const pb of b){nb+=pb.i*pb.i;}
  for(const pa of a){let best: number|null=null,bd=tol; for(let k=0;k<b.length;k++){if(used.has(k))continue;const d=Math.abs(pa.mz-b[k]!.mz); if(d<=bd){bd=d;best=k;}} if(best!=null){dot+=pa.i*b[best]!.i;used.add(best);}}
  return dot/(Math.sqrt(na)*Math.sqrt(nb)||1);
}
