/* Nº 29 · Supply Rhythm Machine — the drug supply as a looping drum machine.
   Each substance class is a track with a distinct tone; monthly detection data
   drives which steps are "on." The rhythm of the supply, made audible via
   Web Audio API. An experimental sonic epidemiology concept. */
const {scaffold,classify,fmt,TOKENS}=DCF;
const MC=DATA.monthly_class;

const CLS=[
  {k:'fent',l:'Fentanyl',freq:110,wave:'sawtooth',color:TOKENS.fent},
  {k:'opioid',l:'Opioid',freq:165,wave:'sine',color:TOKENS.opioid},
  {k:'xyl',l:'Xylazine',freq:82.4,wave:'square',color:TOKENS.xyl},
  {k:'stim',l:'Stimulant',freq:220,wave:'triangle',color:TOKENS.stim},
  {k:'coke',l:'Cocaine',freq:293.7,wave:'triangle',color:TOKENS.coke},
  {k:'benzo',l:'Benzo',freq:246.9,wave:'sine',color:TOKENS.benzo},
  {k:'cut',l:'Cut / Diluent',freq:329.6,wave:'sine',color:TOKENS.cut},
  {k:'other',l:'Other / Novel',freq:440,wave:'square',color:TOKENS.other},
];

const STEPS=16;
const months=[...new Set(MC.map(d=>d.month))].sort();

// Build a step pattern per class from monthly data
function buildPatterns(recentN=8){
  const recentMonths=months.slice(-recentN);
  const patterns={};
  CLS.forEach(c=>{
    const vals=recentMonths.map(m=>{
      const row=MC.find(d=>d.month===m&&d.cls===c.k);
      return row?row.n:0;
    });
    const mx=Math.max(...vals,1);
    // map each of 16 steps to one of 8 months (doubled), then threshold
    patterns[c.k]=Array.from({length:STEPS},(_,i)=>{
      const mIdx=Math.floor(i/(STEPS/recentN));
      const v=vals[mIdx]/mx;
      // high months = dense steps; low months = sparse
      return v>0.6||(v>0.3&&i%2===0)||(v>0.15&&i%4===0);
    });
  });
  return patterns;
}

const stage=scaffold({
  tag:'Nº 29 · SONIC',
  title:'Supply Rhythm Machine',
  dek:'The drug supply, beatified. Each row is a substance class; each step lights up when that class was prominent in that time window. Press play and hear the supply\'s rhythm — fentanyl\'s relentless pulse, xylazine\'s low throb.',
  how:`A <b>16-step sequencer</b> where each <b>row</b> is a drug class and each <b>column</b> is a time step. Steps are "on" (lit) when that class was detected heavily in the corresponding recent month. Press <b>▶ play</b> to hear the pattern loop: each class has a distinct tone (fentanyl = low sawtooth, xylazine = very low square wave, stimulants = high triangle). Toggle individual steps to edit the pattern. <b>This is experimental</b> — a sonification concept for teaching supply dynamics to non-data audiences.`,
  provenance:'Step patterns derived from real monthly substance class counts (6,580 samples, most recent 8 months).',
  harm:'Even in quieter months, the supply is dangerous. A slow rhythm is not a safe supply.'
});

stage.innerHTML=`
<div class="controls" style="align-items:center">
  <button class="tgl" id="playBtn" aria-pressed="false">▶ play</button>
  <label class="muted" style="font-size:12px;margin-left:12px">tempo:</label>
  <input type="range" id="tempo" min="60" max="200" value="120" style="width:100px;accent-color:${TOKENS.fent}">
  <span class="mono muted" id="bpmLbl">120 bpm</span>
  <label class="muted" style="font-size:12px;margin-left:12px">volume:</label>
  <input type="range" id="vol" min="0" max="1" step=".05" value=".4" style="width:80px;accent-color:${TOKENS.xyl}">
</div>
<div id="sequencer" style="margin-top:14px;display:flex;flex-direction:column;gap:6px"></div>
<div class="muted" style="font-size:11px;margin-top:12px">Click any step to toggle it on/off. Brighter = stronger signal from the data. Lit steps play that class's tone.</div>`;

const patterns=buildPatterns(8);
const stepEls={}; // k → array of 16 button elements

// Build the sequencer grid
const seqEl=document.getElementById('sequencer');
CLS.forEach(c=>{
  const row=document.createElement('div');
  row.style.cssText='display:flex;align-items:center;gap:5px';
  const label=document.createElement('div');
  label.style.cssText=`width:96px;font-size:11px;font-weight:600;color:${c.color};flex-shrink:0;text-align:right;padding-right:8px`;
  label.textContent=c.l;
  row.appendChild(label);
  stepEls[c.k]=[];
  for(let i=0;i<STEPS;i++){
    const btn=document.createElement('button');
    const on=patterns[c.k][i];
    btn.style.cssText=`width:34px;height:32px;border-radius:5px;border:1.5px solid ${on?c.color:TOKENS.line};background:${on?c.color+'33':'transparent'};cursor:pointer;transition:.1s;${i%4===0?'margin-left:4px':''}`;
    btn.setAttribute('aria-label',`${c.l} step ${i+1} ${on?'on':'off'}`);
    btn.dataset.on=on?'1':'0';
    btn.onclick=()=>{
      const nowOn=btn.dataset.on==='1';
      btn.dataset.on=nowOn?'0':'1';
      patterns[c.k][i]=!nowOn;
      btn.style.background=!nowOn?c.color+'33':'transparent';
      btn.style.borderColor=!nowOn?c.color:TOKENS.line;
    };
    stepEls[c.k].push(btn);
    row.appendChild(btn);
  }
  seqEl.appendChild(row);
});

// Web Audio sequencer
let ctx=null, playing=false, curStep=0, nextTime=0, interval=null;
const gainNodes={};

function getCtx(){if(!ctx) ctx=new(window.AudioContext||window.webkitAudioContext)();return ctx;}

function playStep(step){
  const ac=getCtx();
  const vol=+document.getElementById('vol').value;
  CLS.forEach(c=>{
    // highlight current step
    stepEls[c.k].forEach((b,i)=>{
      const on=b.dataset.on==='1';
      b.style.background=i===step?(on?c.color+'88':'rgba(255,255,255,0.07)'):(on?c.color+'33':'transparent');
    });
    if(!patterns[c.k][step]) return;
    const osc=ac.createOscillator();
    const g=ac.createGain();
    osc.type=c.wave;
    osc.frequency.value=c.freq;
    g.gain.setValueAtTime(vol*0.22,nextTime);
    g.gain.exponentialRampToValueAtTime(0.0001,nextTime+0.18);
    osc.connect(g); g.connect(ac.destination);
    osc.start(nextTime); osc.stop(nextTime+0.2);
  });
}

function schedule(){
  const bpm=+document.getElementById('tempo').value;
  const stepLen=60/bpm/4;
  const ac=getCtx();
  while(nextTime<ac.currentTime+0.1){
    playStep(curStep%STEPS);
    nextTime+=stepLen;
    curStep++;
  }
}

const playBtn=document.getElementById('playBtn');
playBtn.onclick=()=>{
  if(playing){
    clearInterval(interval); playing=false; playBtn.textContent='▶ play'; playBtn.setAttribute('aria-pressed','false');
    // reset highlights
    CLS.forEach(c=>stepEls[c.k].forEach((b,i)=>{const on=b.dataset.on==='1';b.style.background=on?c.color+'33':'transparent';}));
  } else {
    const ac=getCtx();
    if(ac.state==='suspended') ac.resume();
    nextTime=ac.currentTime; curStep=0; playing=true;
    playBtn.textContent='❚❚ stop'; playBtn.setAttribute('aria-pressed','true');
    interval=setInterval(schedule,25);
  }
};
document.getElementById('tempo').oninput=function(){document.getElementById('bpmLbl').textContent=this.value+' bpm';};
