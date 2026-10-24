export const MAP_FLAG_COLORS = { blue:'#3b73d9',red:'#c0392b',green:'#2e9e5b',amber:'#c98a1b',purple:'#8a4fc2',teal:'#1f9fa6',ivory:'#e8e2cf',black:'#383a3d' } as const;
/** Campaigns/key tents may use slightly different shades of the six player colours. */
export function mapFlagId(color:string,shape:'square'|'pennant'):string {
  const rgb=(hex:string)=>{const n=parseInt(hex.replace('#',''),16);return [n>>16&255,n>>8&255,n&255];};
  const c=rgb(/^#[\da-f]{6}$/i.test(color)?color:'#e8e2cf');
  const palette=Object.entries(MAP_FLAG_COLORS).map(([name,hex])=>({name,d:rgb(hex).reduce((sum,v,i)=>sum+(v-c[i]!)**2,0)}));
  palette.sort((a,b)=>a.d-b.d);
  return `map.flag.${shape==='square'?'standard':'pennant'}.${palette[0]!.name}`;
}
