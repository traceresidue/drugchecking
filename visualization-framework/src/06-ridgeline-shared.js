/* Shared batch-ridgeline synthesis + per-drug variability columns (06a/b/c). */
const SAMPLE_COUNT=50;
const RT=Object.fromEntries(DATA.retention_times.map(d=>[d.substance,d.rt]));

const DRUGS_BY_CLASS={
  opioid:['fentanyl','4-anpp','heroin','p-fluorofentanyl'],
  stimulant:['methamphetamine','cocaine','caffeine'],
  cut:['acetaminophen','caffeine','lidocaine','diphenhydramine']
};
const ALL_TRACKED=[...new Set(Object.values(DRUGS_BY_CLASS).flat())];

const SHORT={
  fentanyl:'fentanyl','4-anpp':'4-ANPP',heroin:'heroin','p-fluorofentanyl':'p-FF',
  methamphetamine:'meth',cocaine:'cocaine',caffeine:'caffeine',
  acetaminophen:'APAP',lidocaine:'lidocaine',diphenhydramine:'DPH',
  xylazine:'xylazine',bromazolam:'bromazolam'
};
function shortName(s){return SHORT[s]||s.replace(/ .*/,'').slice(0,12);}
function drugHue(s){return classify(s).color;}

const PALETTE={
  stable:{
    core:['fentanyl','4-anpp','xylazine'],
    variable:['acetaminophen','caffeine','lidocaine'],
    rtSigma:0.045,ampSigma:0.14,drop:0.07,emerge:null
  },
  volatile:{
    core:['fentanyl','4-anpp'],
    variable:['acetaminophen','caffeine','lidocaine','diphenhydramine'],
    rtSigma:0.2,ampSigma:0.48,drop:0.24,emerge:'bromazolam'
  }
};
const EXTRA_RT={bromazolam:11.4,lidocaine:7.26,xylazine:7.67,'p-fluorofentanyl':10.84,heroin:10.12,methamphetamine:4.11,cocaine:8.39,diphenhydramine:7.1};

const KEY_SUBSTANCES=[
  {id:'fentanyl',substance:'fentanyl',label:'Fentanyl',classFilter:'opioid'},
  {id:'heroin',substance:'heroin',label:'Heroin',classFilter:'opioid'},
  {id:'meth',substance:'methamphetamine',label:'Meth',classFilter:'stimulant'},
  {id:'cocaine',substance:'cocaine',label:'Cocaine',classFilter:'stimulant'}
];
function keySubstanceMeta(id){return KEY_SUBSTANCES.find(k=>k.id===id)||KEY_SUBSTANCES[0];}
function keySubstanceControlsMarkup(defaultId='fentanyl'){
  const sep='<span style="width:1px;height:24px;background:var(--line);margin:0 4px"></span>';
  const btns=KEY_SUBSTANCES.map(k=>`<button class="tgl" id="k-${k.id}" aria-pressed="${k.id===defaultId}">${k.label}</button>`).join('');
  return sep+btns;
}
function initKeySubstanceControls(defaultId,redraw){
  let active=defaultId;
  KEY_SUBSTANCES.forEach(k=>{
    const el=document.getElementById('k-'+k.id);
    if(!el)return;
    el.setAttribute('aria-pressed',k.id===active);
    el.onclick=()=>{
      active=k.id;
      KEY_SUBSTANCES.forEach(x=>document.getElementById('k-'+x.id).setAttribute('aria-pressed',x.id===active));
      redraw();
    };
  });
  return ()=>keySubstanceMeta(active);
}
function domainForSubstance(rows,substance){
  const st=computeDrugStats(rows,substance);
  const half=Math.max(0.28,st.stdRt*3.5,0.22);
  return [Math.max(2,st.meanRt-half),Math.min(14,st.meanRt+half)];
}
function peaksForKeySubstance(peaks,substance){
  return peaks.filter(p=>p.s===substance);
}
function rowIndexForSampleNum(rows,sampleNum){
  return Math.max(0,Math.min(rows.length-1,rows.length-sampleNum));
}
function sampleNumForRowIndex(rows,rowIdx){
  return rows.length-rowIdx;
}

function drawFocusChromatogram(container,rows,sampleNum,keyId,domain){
  const svg=d3.select(container);
  svg.selectAll('*').remove();
  const node=svg.node();
  if(!node)return;
  const W=node.clientWidth||640,H=+svg.attr('height')||112;
  const m={t:12,r:16,b:22,l:54};
  const rowIdx=rowIndexForSampleNum(rows,sampleNum);
  const peaks=rows[rowIdx]||[];
  const meta=keySubstanceMeta(keyId);
  const sub=meta.substance;
  const x0=domain?domain[0]:3,x1=domain?domain[1]:13;
  const x=d3.scaleLinear([x0,x1],[m.l,W-m.r]);
  const y=d3.scaleLinear([0,100],[H-m.b,m.t]);
  const trace=chromatogram(peaks,{x0,x1,sigma:0.05,n:180});
  const hue=drugHue(sub);
  const kp=peaks.find(p=>p.s===sub);
  const st=computeDrugStats(rows,sub);

  svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',W-m.l-m.r).attr('height',H-m.t-m.b)
    .attr('fill',TOKENS.panel2).attr('stroke',TOKENS.line).attr('rx',4);
  if(trace.y.length){
    const area=d3.area().x((d,k)=>x(trace.x[k])).y0(H-m.b).y1(d=>y(d)).curve(d3.curveBasis);
    svg.append('path').datum(trace.y).attr('d',area).attr('fill',hue).attr('opacity',kp?0.14:0.04);
    svg.append('path').datum(trace.y)
      .attr('d',d3.line().x((d,k)=>x(trace.x[k])).y(d=>y(d)).curve(d3.curveBasis))
      .attr('fill','none').attr('stroke',TOKENS.ink).attr('stroke-width',1.2).attr('opacity',0.75);
  }
  svg.append('line').attr('x1',x(st.meanRt)).attr('x2',x(st.meanRt)).attr('y1',m.t).attr('y2',H-m.b)
    .attr('stroke',hue).attr('stroke-width',1.5).attr('opacity',0.55).attr('stroke-dasharray','4,3');
  if(kp){
    svg.append('circle').attr('cx',x(kp.rt)).attr('cy',y(100)).attr('r',4)
      .attr('fill',devColor(hue,normDev(kp,st))).attr('stroke',TOKENS.bg).attr('stroke-width',0.8);
  }
  svg.append('text').attr('x',m.l+6).attr('y',m.t+11).attr('fill',TOKENS.muted).attr('font-size',10)
    .text(`Sample #${sampleNum} · ${meta.label}${kp?' · RT '+kp.rt.toFixed(2):' · absent'}`);
  svg.append('text').attr('x',W/2).attr('y',H-4).attr('text-anchor','middle').attr('fill',TOKENS.faint).attr('font-size',10)
    .text('retention time (min)');
}

function rng(seed){let s=seed;return()=>{s=(s*9301+49297)%233280;return s/233280;};}
function baseRt(s){return RT[s]||EXTRA_RT[s]||8;}

function sampleRows(mode,opts={}){
  const cfg=PALETTE[mode];
  const r=rng(mode==='stable'?7:42);
  const rows=[];
  if(opts.classFilter){
    const drugs=DRUGS_BY_CLASS[opts.classFilter];
    for(let i=0;i<SAMPLE_COUNT;i++){
      const age=i/SAMPLE_COUNT;
      const peaks=[];
      drugs.forEach((s,di)=>{
        const isCore=di<2;
        const drop=isCore?cfg.drop*0.35:cfg.drop*1.1;
        if(r()>drop){
          const rtW=isCore?cfg.rtSigma*0.75:cfg.rtSigma*(mode==='volatile'?1.4:1);
          peaks.push({
            s,
            rt:baseRt(s)+(r()-0.5)*rtW,
            amp:(30+r()*60)*(1+(r()-0.5)*cfg.ampSigma)*(isCore?1.1:0.85),
            sigma:0.05
          });
        }
      });
      if(mode==='volatile' && opts.classFilter==='opioid' && age>0.4 && r()<0.35){
        const s='p-fluorofentanyl';
        if(!peaks.some(p=>p.s===s)) peaks.push({s,rt:baseRt(s)+(r()-0.5)*cfg.rtSigma*1.6,amp:18+r()*40,sigma:0.05});
      }
      rows.push(peaks);
    }
    return rows;
  }
  const pool=[...cfg.core,...cfg.variable,...(cfg.emerge?[cfg.emerge]:[]),'xylazine','heroin','p-fluorofentanyl','methamphetamine','cocaine','diphenhydramine'];
  for(let i=0;i<SAMPLE_COUNT;i++){
    const age=i/SAMPLE_COUNT;
    const peaks=[];
    const add=(s,opts2={})=>{
      const isCore=cfg.core.includes(s);
      const drop=isCore?cfg.drop*0.4:cfg.drop;
      if(r()>drop){
        const rtW=opts2.rtWide?cfg.rtSigma*1.8:cfg.rtSigma;
        peaks.push({
          s,
          rt:baseRt(s)+(r()-0.5)*rtW*(isCore?0.7:1),
          amp:(opts2.amp||35+r()*55)*(s==='fentanyl'?1.15:0.85)*(1+(r()-0.5)*cfg.ampSigma),
          sigma:0.05
        });
      }
    };
    cfg.core.forEach(s=>add(s));
    cfg.variable.forEach(s=>{ if(r()>0.18) add(s); });
    if(cfg.emerge && age>0.32 && r()<(age-0.25)*1.1) add(cfg.emerge,{rtWide:true,amp:22});
    if(r()<0.28) add('heroin');
    if(r()<0.22) add('p-fluorofentanyl');
    if(r()<0.18) add('methamphetamine',{rtWide:true});
    if(r()<0.14) add('cocaine');
    rows.push(peaks);
  }
  return rows;
}

function hexRgb(hex){
  const h=hex.replace('#','');
  return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
}
function rgbHsl(r,g,b){
  r/=255;g/=255;b/=255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  let h=0,s=0,l=(mx+mn)/2;
  if(d){
    s=l>0.5?d/(2-mx-mn):d/(mx+mn);
    if(mx===r) h=((g-b)/d+(g<b?6:0))/6;
    else if(mx===g) h=((b-r)/d+2)/6;
    else h=((r-g)/d+4)/6;
  }
  return [h*360,s,l];
}
function hslCss(h,s,l){return `hsl(${((h%360)+360)%360},${(s*100).toFixed(0)}%,${(l*100).toFixed(0)}%)`;}
function devColor(baseHex,t){
  const [r,g,b]=hexRgb(baseHex);
  let [h,s,l]=rgbHsl(r,g,b);
  const spread=Math.min(1,Math.max(0,t));
  h+=spread*52*(spread>0.5?1:-1);
  s=Math.min(0.95,s+spread*0.28);
  l=Math.max(0.22,Math.min(0.78,l+(spread-0.45)*0.18));
  return hslCss(h,s,l);
}

function computeDrugStats(rows,substance){
  const hits=rows.map(peaks=>peaks.find(p=>p.s===substance)).filter(Boolean);
  const rts=hits.map(p=>p.rt), amps=hits.map(p=>p.amp);
  const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:baseRt(substance);
  const std=(a,mu)=>a.length?Math.sqrt(a.reduce((s,v)=>s+(v-mu)**2,0)/a.length):0;
  const meanRt=mean(rts), meanAmp=mean(amps)||50;
  return {
    substance, meanRt, meanAmp,
    stdRt:Math.max(std(rts,meanRt),0.025),
    stdAmp:Math.max(std(amps,meanAmp),4),
    presence:hits.length/rows.length,
    hits
  };
}

function normDev(peak,stats){
  if(!peak) return 1;
  const rtD=Math.abs(peak.rt-stats.meanRt)/Math.max(stats.stdRt*2.2,0.04);
  const ampD=Math.abs(peak.amp-stats.meanAmp)/Math.max(stats.stdAmp*2.2,8);
  return Math.min(1,(rtD*0.55+ampD*0.45)/2.2);
}

function activeDrugs(rows,classFilter){
  const pool=classFilter?DRUGS_BY_CLASS[classFilter]:ALL_TRACKED;
  return pool.filter(s=>rows.some(peaks=>peaks.some(p=>p.s===s))||pool.indexOf(s)<4);
}

function idealPeaks(drugs,rows){
  return drugs.map(s=>{
    const st=computeDrugStats(rows,s);
    return {s,rt:st.meanRt,amp:st.meanAmp,sigma:0.04};
  });
}

function layout(H,refH=38){
  const labelH=72,refGap=10;
  return {
    t:16,r:18,b:labelH,l:52,
    refH,refGap,
    refTop:H-labelH-refGap-refH,
    refBottom:H-labelH-refGap
  };
}

function sampleBand(H,m){return H-m.t-m.b-m.refH-m.refGap;}

function ySample(i,m,H,rows){
  return m.t+(i+1)*(sampleBand(H,m)/rows.length);
}
function rowPitch(H,m,rows){return sampleBand(H,m)/rows.length;}

function rowYScale(i,m,H,rows,overlap){
  const baseY=ySample(i,m,H,rows);
  return d3.scaleLinear([0,100],[baseY,baseY-overlap*rowPitch(H,m,rows)]);
}

function substancePeakOnRow(peaks,sub,x,yScale,domain,peakFilter){
  const p=peaks.find(pk=>pk.s===sub);
  if(!p)return null;
  const rowPeaks=peakFilter?peakFilter(peaks):peaks;
  if(!rowPeaks.some(rp=>rp.s===sub))return null;
  const trace=chromatogram(rowPeaks,{x0:domain[0],x1:domain[1],sigma:0.05,n:140});
  const halfWin=Math.max(0.08,(domain[1]-domain[0])*0.04);
  let maxV=-1,maxI=0;
  trace.x.forEach((t,k)=>{
    if(Math.abs(t-p.rt)<=halfWin&&trace.y[k]>maxV){maxV=trace.y[k];maxI=k;}
  });
  if(maxV<0){
    maxI=trace.x.reduce((best,t,k)=>Math.abs(t-p.rt)<Math.abs(trace.x[best]-p.rt)?k:best,0);
  }
  return {x:x(trace.x[maxI]),y:yScale(trace.y[maxI])};
}

function drawReferenceRow(svg,x,drugs,rows,x0,x1,m){
  const ideal=idealPeaks(drugs,rows);
  const yScale=d3.scaleLinear([0,100],[m.refBottom,m.refTop]);
  const g=svg.append('g').attr('class','ref-row');
  g.append('text').attr('x',x(x0)-8).attr('y',yScale(52)+4).attr('text-anchor','end')
    .attr('fill',TOKENS.muted).attr('font-size',9).attr('font-family','ui-monospace').text('ideal');
  ideal.forEach(p=>{
    const trace=chromatogram([p],{x0,x1,sigma:0.032,n:160});
    g.append('path').datum(trace.y)
      .attr('d',d3.line().x((d,k)=>x(trace.x[k])).y(d=>yScale(d)).curve(d3.curveBasis))
      .attr('fill','none').attr('stroke',drugHue(p.s)).attr('stroke-width',1.7).attr('opacity',0.88);
    g.append('circle').attr('cx',x(p.rt)).attr('cy',yScale(100)).attr('r',3)
      .attr('fill',drugHue(p.s)).attr('stroke',TOKENS.bg).attr('stroke-width',0.6);
  });
  g.append('line').attr('x1',x(x0)).attr('x2',x(x1)).attr('y1',yScale(0)).attr('y2',yScale(0))
    .attr('stroke',TOKENS.line).attr('stroke-dasharray','3,3').attr('opacity',0.5);
}

function drawVariabilityColumns(svg,{rows,drugs,x,m,H,domain,overlap,peakFilter}){
  const pitch=rowPitch(H,m,rows);
  const topY=ySample(0,m,H,rows)-pitch*0.15;
  const bottomY=ySample(rows.length-1,m,H,rows)+pitch*0.15;
  const pathLine=d3.line()
    .x(d=>d.x)
    .y(d=>d.y)
    .curve(d3.curveCatmullRom.alpha(0.62));

  drugs.forEach(sub=>{
    const stats=computeDrugStats(rows,sub);
    const hue=drugHue(sub);
    const cx=x(stats.meanRt);
    const g=svg.append('g').attr('class','var-col').attr('data-drug',sub);

    const pts=rows.map((peaks,i)=>{
      const baseY=ySample(i,m,H,rows);
      const yScale=rowYScale(i,m,H,rows,overlap);
      const apex=substancePeakOnRow(peaks,sub,x,yScale,domain,peakFilter);
      return apex||{x:cx,y:baseY};
    });

    g.append('line')
      .attr('class','var-col-axis')
      .attr('x1',cx).attr('x2',cx)
      .attr('y1',topY).attr('y2',bottomY)
      .attr('stroke',hue).attr('stroke-width',1).attr('opacity',0.32);

    g.append('path')
      .attr('class','var-path')
      .attr('d',pathLine(pts))
      .attr('fill','none')
      .attr('stroke',hue)
      .attr('stroke-width',2.4)
      .attr('stroke-linecap','round')
      .attr('stroke-linejoin','round')
      .attr('opacity',0.82);

    rows.forEach((peaks,i)=>{
      const p=peaks.find(pk=>pk.s===sub);
      const y=ySample(i,m,H,rows);
      const dev=p?normDev(p,stats):1;
      const col=devColor(hue,dev);

      g.append('circle')
        .attr('class','var-ideal-dot')
        .attr('cx',cx).attr('cy',y)
        .attr('r',p?2.4:1.8)
        .attr('fill',p?col:TOKENS.faint)
        .attr('stroke',TOKENS.bg)
        .attr('stroke-width',0.6)
        .attr('opacity',p?0.92:0.38);
    });
  });
}

function drawDrugLabels(svg,drugs,rows,x,H,m){
  drugs.forEach(sub=>{
    const st=computeDrugStats(rows,sub);
    const cx=x(st.meanRt);
    const hue=drugHue(sub);
    svg.append('line').attr('x1',cx).attr('x2',cx).attr('y1',H-m.b).attr('y2',H-m.b+6)
      .attr('stroke',hue).attr('stroke-width',1.5).attr('opacity',0.85);
    svg.append('text').attr('x',cx).attr('y',H-m.b+18).attr('text-anchor','middle')
      .attr('fill',hue).attr('font-size',10).attr('font-weight',600).text(shortName(sub));
    svg.append('text').attr('x',cx).attr('y',H-m.b+30).attr('text-anchor','middle')
      .attr('fill',TOKENS.faint).attr('font-size',9).attr('font-family','ui-monospace')
      .text(st.meanRt.toFixed(2));
  });
  svg.append('text').attr('x',(x.range()[0]+x.range()[1])/2).attr('y',H-6)
    .attr('text-anchor','middle').attr('fill',TOKENS.muted).attr('font-size',11)
    .text(drugs.length===1
      ? `${shortName(drugs[0])} · retention time (min) — read down the column for batch drift`
      : 'retention time (min) — read down each drug column for batch variation');
}

function drawSampleIndex(svg,m,H,rows){
  svg.append('text').attr('x',m.l-8).attr('y',m.t+8).attr('text-anchor','end')
    .attr('fill',TOKENS.muted).attr('font-size',9).text('newest');
  const step=Math.max(1,Math.floor(rows.length/8));
  for(let i=0;i<rows.length;i+=step){
    const y=ySample(i,m,H,rows);
    svg.append('text').attr('x',m.l-8).attr('y',y+3).attr('text-anchor','end')
      .attr('fill',TOKENS.faint).attr('font-size',8).attr('font-family','ui-monospace')
      .text('#'+(rows.length-i));
  }
}
