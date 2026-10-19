/* Presentation-only animation reference. No gameplay state, RNG, damage or path changes. */
(function(g){
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const states={
 idle:{loop:true,durationMs:3200},sailing:{loop:true,durationMs:1800},
 embark:{loop:false,durationMs:650},disembark:{loop:false,durationMs:650},
 boarding:{loop:true,durationMs:2600},hit:{loop:false,durationMs:420},sinking:{loop:false,durationMs:1800}
 };
 function shipPose(state,timeMs,reducedMotion=false){
  if(!states[state])state='idle';
  const t=Math.max(0,timeMs)/1000,p=clamp(timeMs/states[state].durationMs,0,1);
  if(reducedMotion)return {x:0,y:0,rotation:0,opacity:state==='disembark'?0:state==='sinking'&&p>=1?0:1,wakeOpacity:0,flagWave:0,progress:p};
  let y=Math.sin(t*Math.PI*2/3.2)*1.4,rotation=Math.sin(t*Math.PI*2/3.2)*.65,x=0,opacity=1,wakeOpacity=0;
  if(state==='sailing'){y=Math.sin(t*Math.PI*2/1.8)*2;rotation=Math.sin(t*Math.PI*2/2.3)*1;wakeOpacity=.55;}
  if(state==='boarding'){rotation*=.4;wakeOpacity=.12;}
  if(state==='hit'){x=Math.sin(t*65)*4*(1-p);rotation=Math.sin(t*35)*2*(1-p);}
  if(state==='embark'||state==='disembark'){y+=Math.sin(p*Math.PI)*2;opacity=state==='embark'?p:1-p;}
  if(state==='sinking'){y+=p*32;rotation=p*8;opacity=1-p;wakeOpacity=Math.sin(p*Math.PI)*.6;}
  return {x,y,rotation,opacity,wakeOpacity,flagWave:Math.sin(t*5.4)*2,progress:p};
 }
 function direction(angle){
  const a=((angle+180)%360+360)%360-180;
  const flip=Math.abs(a)>90;
  const local=flip?(a>=0?180-a:-180-a):a;
  return {sprite:local< -15?'ne':local>15?'se':'e',flipX:flip};
 }
 g.FieldKitMotion={shipPose,direction,states};
})(typeof window==='undefined'?globalThis:window);
