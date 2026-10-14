import { TOKENS } from './tokens.js';

/* Map a substance name -> {class, color, label, action} */

export type SubstanceClass =
  | 'fent' | 'opioid' | 'xyl' | 'stim' | 'coke' | 'benzo' | 'cut' | 'other';
export type SubstanceFamily = 'opioid' | 'stim' | 'xyl' | 'benzo' | 'cut' | 'other';

export interface Classification {
  cls: SubstanceClass;
  color: string;
  label: string;
  family: SubstanceFamily;
  familyLabel: string;
}

const CLASS: Record<SubstanceClass, { color: string; label: string }> = {
  fent:{color:TOKENS.fent,label:'Fentanyl & analogs'},
  opioid:{color:TOKENS.opioid,label:'Opioid'},
  xyl:{color:TOKENS.xyl,label:'Sedative / xylazine'},
  stim:{color:TOKENS.stim,label:'Stimulant'},
  coke:{color:TOKENS.coke,label:'Cocaine'},
  benzo:{color:TOKENS.benzo,label:'Benzodiazepine'},
  cut:{color:TOKENS.cut,label:'Cut / diluent'},
  other:{color:TOKENS.other,label:'Other'}
};

const RULES: Array<[RegExp, SubstanceClass]> = [
  [/fentanyl|anpp|despropionyl|norfentanyl|acetylfentanyl|n-phenylpropanamide|phenethyl/i,'fent'],
  [/nitazene|etonitazene|metonitazene|protonitazene|isotonitazene/i,'fent'],
  [/heroin|morphine|codeine|6-mam|monoacetylmorphine|oxycodone|hydromorphone|tramadol|mitragynine|opioid/i,'opioid'],
  [/xylazine|medetomidine|detomidine|clonidine/i,'xyl'],
  [/bromazolam|flualprazolam|alprazolam|etizolam|diazepam|clonazolam|benzodiazep|flubromazolam|diclazepam/i,'benzo'],
  [/methamphetamine|amphetamine|mdma|cathinone|methylenedioxy|n,n-dimethylamphetamine/i,'stim'],
  [/cocaine|benzoylecgonine|ecgonine/i,'coke'],
  [/caffeine|acetaminophen|paracetamol|lidocaine|levamisole|quinine|mannitol|lactose|sucrose|cellulose|diphenhydramine|sulfone|msm|sugar|inositol|procaine|benzocaine|phenacetin|gabapentin|dimethyl|sebacate|btmps|piperidyl|boric|sorbitol|maltose|glucose|creatine|diacetin|tetramethyl/i,'cut'],
];

/* Broad families for filters and labels — cls stays fine-grained for chart colors. */
const FAMILY_MAP: Record<SubstanceClass, SubstanceFamily> = {
  fent:'opioid', opioid:'opioid',
  stim:'stim', coke:'stim',
  xyl:'xyl', benzo:'benzo', cut:'cut', other:'other',
};
const FAMILY_LABEL: Record<SubstanceFamily, string> = {
  opioid:'Opioid',
  stim:'Stimulant',
  xyl:'Sedative / xylazine',
  benzo:'Benzodiazepine',
  cut:'Cut / diluent',
  other:'Other',
};

export function classify(name=''): Classification {
  const n = String(name).toLowerCase();
  for(const [re,c] of RULES){
    if(re.test(n)){
      const family = FAMILY_MAP[c] || c;
      return {cls:c,color:CLASS[c].color,label:CLASS[c].label,family,familyLabel:FAMILY_LABEL[family]||FAMILY_LABEL.other};
    }
  }
  return {cls:'other',...CLASS.other,family:'other',familyLabel:FAMILY_LABEL.other};
}
