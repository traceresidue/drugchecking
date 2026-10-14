/* ---- formatting ---- */
export const fmt = {
  mz:(v: number | string)=>`${(+v).toFixed(0)}`,
  rt:(v: number | string)=>`${(+v).toFixed(2)}`,
  pct:(v: number | string)=>`${(+v).toFixed(0)}%`,
  int:(v: number | string)=>(+v).toLocaleString('en-US'),
  month:(m: string)=>{const [y,mo]=m.split('-');return new Date(+y!,+mo!-1).toLocaleDateString('en-US',{month:'short',year:'2-digit'});}
};
