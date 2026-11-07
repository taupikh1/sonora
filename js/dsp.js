// Web Audio hanya dibuat jika EQ/ReplayGain/Visualizer aktif dan Bit-Perfect OFF (saat boot). Kalau tidak, audio langsung lewat <audio>.
let ctx,F=[],G,AN;
export const FREQ=[31,62,125,250,500,1000,2000,4000,8000,16000];
export const active=()=>!!ctx,state=()=>ctx&&ctx.state,analyser=()=>AN,gainNow=()=>G?G.gain.value:null,bandsNow=()=>F.map(b=>b.gain.value);
export function init(audio){if(ctx)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch{}
  const c=new C(),s=c.createMediaElementSource(audio);
  F=FREQ.map((f,i)=>{const b=c.createBiquadFilter();b.type=i===0?'lowshelf':i===9?'highshelf':'peaking';b.frequency.value=f;if(b.type==='peaking')b.Q.value=1.41;return b});
  G=c.createGain();AN=c.createAnalyser();AN.fftSize=2048;AN.smoothingTimeConstant=.8;
  [s,...F,G,AN,c.destination].reduce((a,b)=>(a.connect(b),b));c.onstatechange=()=>{if(c.state!=='running')c.resume().catch(()=>{})};ctx=c}
export function apply({eq,bands,pre=0,gain=0}){if(!ctx)return;F.forEach((b,i)=>{b.gain.value=eq?(bands[i]||0):0});G.gain.value=10**((gain+(eq?pre:0))/20)}
export const resume=()=>{if(ctx&&ctx.state!=='running')ctx.resume().catch(()=>{})};
export const rate=()=>ctx&&ctx.sampleRate;
