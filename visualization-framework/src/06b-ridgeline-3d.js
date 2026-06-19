/* Nº 06b · Batch Ridgeline — 3D Terrain — 50-sample landscape with key-substance
   focus, sample picker, and 2D chromatogram inset at top. */
const {scaffold,chromatogram,classify,TOKENS}=DCF;
function subColor(name){const c=classify(name);return window.DCFDesign?DCFDesign.getClassColor(c.cls):c.color;}
function sigColor(k){return window.DCFDesign?DCFDesign.getClassColor(k):TOKENS[k];}
// @include 06-ridgeline-shared.js

const stage=scaffold({
  tag:'Nº 06b · GC–MS',
  title:'Batch Ridgeline — 3D Terrain',
  dek:'Fifty samples in 3D — pick a key substance, select any sample, and inspect its full 2D chromatogram lifted to the top of the panel.',
  how:`Each of <b>50 samples</b> is a ridge in this surface (retention time × sample × signal). Choose a <b>key substance</b> (fentanyl, heroin, meth, cocaine) to emphasize that drug's retention-time column. <b>Click a ridge</b> or use the sample picker to lift one sample into the <b>2D chromatogram</b> at the top. The dashed vertical in the inset marks the substance mean RT. <b>Drag</b> to orbit the 3D view. <b>Limits:</b> height is relative abundance, not potency.`,
  provenance:'Surface synthesized from plausible component mixes over real median retention times; illustrative batch-consistency view.',
  harm:'Even a "consistent" supply shifts without warning. Test every time; potency can change while the fingerprint looks the same.'
});

stage.innerHTML=`
<style>
  #focus-wrap{border-bottom:1px solid var(--line);padding:0 0 8px;margin-bottom:4px}
  #sample-pick{font:inherit;background:var(--panel2);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:4px 8px}
</style>
<div class="controls">
  <button class="tgl" id="m1" aria-pressed="true">Stable fentanyl market</button>
  <button class="tgl" id="m2" aria-pressed="false">Volatile transition period</button>
  ${keySubstanceControlsMarkup('fentanyl')}
  <span style="width:1px;height:24px;background:var(--line);margin:0 4px"></span>
  <label for="sample-pick" style="font-size:12px;color:var(--muted)">Sample</label>
  <select id="sample-pick" aria-label="Select sample number"></select>
</div>
<div class="panel">
  <div id="focus-wrap">
    <svg id="focus-svg" width="100%" height="112" role="img" aria-label="Selected sample two-dimensional chromatogram"></svg>
  </div>
  <div id="plot" style="height:560px" role="img" aria-label="Three-dimensional fifty-sample ridgeline terrain"></div>
</div>`;

let mode='stable', selectedSample=50, plotRows=[];
document.getElementById('m1').onclick=()=>set('stable');
document.getElementById('m2').onclick=()=>set('volatile');
const getKeySub=initKeySubstanceControls('fentanyl',draw);

function set(m){
  mode=m;
  document.getElementById('m1').setAttribute('aria-pressed',m==='stable');
  document.getElementById('m2').setAttribute('aria-pressed',m==='volatile');
  draw();
}

function syncSamplePicker(){
  const sel=document.getElementById('sample-pick');
  if(!sel.options.length){
    for(let n=SAMPLE_COUNT;n>=1;n--){
      const o=document.createElement('option');
      o.value=n; o.textContent='#'+n+(n===SAMPLE_COUNT?' (newest)':'');
      sel.appendChild(o);
    }
    sel.onchange=()=>{selectedSample=+sel.value;drawFocus();};
  }
  sel.value=String(selectedSample);
}

function drawFocus(){
  const keyMeta=getKeySub();
  const domain=domainForSubstance(plotRows,keyMeta.substance);
  drawFocusChromatogram('#focus-svg',plotRows,selectedSample,keyMeta.id,domain);
}

function draw(){
  syncSamplePicker();
  const keyMeta=getKeySub();
  const sub=keyMeta.substance;
  plotRows=sampleRows(mode,{classFilter:keyMeta.classFilter});
  const rows=plotRows;
  const domain=domainForSubstance(rows,sub);
  const x0=domain[0],x1=domain[1];
  const rtVals=[]; for(let t=x0;t<=x1;t+=0.025) rtVals.push(+t.toFixed(3));
  const sampleIdx=rows.map((_,i)=>SAMPLE_COUNT-i);
  const st=computeDrugStats(rows,sub);
  const hue=drugHue(sub);

  const Z=rows.map(peaks=>{
    const kp=peaks.find(p=>p.s===sub);
    const trace=chromatogram(kp?[kp]:[],{x0,x1,sigma:0.05,n:rtVals.length});
    return trace.y;
  });

  const idealPeak={s:sub,rt:st.meanRt,amp:st.meanAmp,sigma:0.04};
  const idealTrace=chromatogram([idealPeak],{x0,x1,sigma:0.04,n:rtVals.length});

  const traces=[{
    type:'surface',x:rtVals,y:sampleIdx,z:Z,
    colorscale:[[0,TOKENS.bg],[0.2,TOKENS.panel2],[0.45,'#2a4a6a'],[0.7,TOKENS.info],[1,hue]],
    showscale:false,
    contours:{z:{show:true,usecolormap:true,highlightcolor:TOKENS.line,project:{z:true},width:1}},
    opacity:0.86,hoverinfo:'skip'
  },{
    type:'scatter3d',mode:'lines',name:'ideal',
    x:idealTrace.x,y:idealTrace.x.map(()=>0),z:idealTrace.y,
    line:{color:hue,width:4},hoverinfo:'skip'
  }];

  rows.forEach((peaks,i)=>{
    const kp=peaks.find(p=>p.s===sub);
    const trace=chromatogram(kp?[kp]:[],{x0,x1,sigma:0.05,n:rtVals.length});
    const lineColor=kp?devColor(hue,normDev(kp,st)):TOKENS.faint;
    const sampleNum=sampleNumForRowIndex(rows,i);
    traces.push({
      type:'scatter3d',mode:'lines',name:'sample-'+sampleNum,
      x:trace.x,y:sampleIdx.map(()=>sampleIdx[i]),z:trace.y,
      line:{color:sampleNum===selectedSample?TOKENS.ink:lineColor,width:sampleNum===selectedSample?2.4:1.1},
      hoverinfo:'text',
      text:sampleIdx.map(()=>`Sample #${sampleNum}`),
      showlegend:false,opacity:sampleNum===selectedSample?1:0.72,
      customdata:sampleIdx.map(()=>[sampleNum])
    });
  });

  traces.push({
    type:'scatter3d',mode:'lines',
    x:[st.meanRt,st.meanRt],y:[0,SAMPLE_COUNT],z:[0,0],
    line:{color:hue,width:2,dash:'dot'},
    hoverinfo:'skip',showlegend:false,opacity:0.5
  });

  const annotations=[{
    x:st.meanRt,y:SAMPLE_COUNT+2,z:0,
    text:`${keyMeta.label}<br>${st.meanRt.toFixed(2)} min`,
    showarrow:false,font:{size:10,color:hue,family:'ui-monospace, monospace'},
    bgcolor:'rgba(18,24,38,0.85)',bordercolor:hue,borderwidth:1
  }];

  const showAxis=!window.DCFDesign||DCFDesign.showTier('axis');
  const showInline=!window.DCFDesign||DCFDesign.showTier('inline');
  const sceneBase={
    xaxis:{title:showAxis?`${keyMeta.label} RT (min)`:'',color:TOKENS.muted,gridcolor:TOKENS.line,backgroundcolor:TOKENS.bg,showbackground:true,range:[x0,x1]},
    yaxis:{title:showAxis?'sample # (1–50)':'',color:TOKENS.muted,gridcolor:TOKENS.line,backgroundcolor:TOKENS.bg,showbackground:true,range:[-2,SAMPLE_COUNT+4]},
    zaxis:{title:showAxis?'relative signal (%)':'',color:TOKENS.muted,gridcolor:TOKENS.line,backgroundcolor:TOKENS.bg,showbackground:true},
    camera:{eye:{x:1.7,y:-1.55,z:0.82},center:{x:0,y:0,z:-0.08}},
    aspectratio:{x:1.5,y:1,z:0.38},
    annotations:showInline?annotations:[]
  };
  const layout=window.DCFDesign?DCFDesign.getPlotlyLayout({
    paper_bgcolor:'rgba(0,0,0,0)',scene:sceneBase,margin:{l:0,r:0,t:4,b:0}
  }):{paper_bgcolor:'rgba(0,0,0,0)',scene:sceneBase,margin:{l:0,r:0,t:4,b:0}};

  const plotEl=document.getElementById('plot');
  Plotly.newPlot(plotEl,traces,layout,{responsive:true,displayModeBar:false});
  plotEl.on('plotly_click',ev=>{
    const pt=ev.points&&ev.points[0];
    if(!pt||!pt.customdata)return;
    selectedSample=pt.customdata[0];
    document.getElementById('sample-pick').value=String(selectedSample);
    draw();
  });

  drawFocus();
}
window.__vizRedraw=draw;
draw();
addEventListener('resize',()=>{
  drawFocus();
  if(document.getElementById('plot').data) Plotly.Plots.resize('plot');
});
