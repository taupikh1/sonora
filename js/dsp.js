// Web Audio hanya dibuat jika EQ/ReplayGain aktif dan Bit-Perfect OFF (saat boot). Kalau tidak, audio langsung lewat <audio>.
let ctx,F=[],G;
export const active=()=>!!ctx,state=()=>ctx&&ctx.state;
export function init(audio){if(ctx)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch{}
  const c=new C(),s=c.createMediaElementSource(audio);
  F=[60,230,910,3600,14000].map((f,i)=>{const b=c.createBiquadFilter();b.type=i?i===4?'highshelf':'peaking':'lowshelf';b.frequency.value=f;return b});G=c.createGain();
  [s,...F,G,c.destination].reduce((a,b)=>(a.connect(b),b));c.onstatechange=()=>{if(c.state!=='running')c.resume().catch(()=>{})};ctx=c}
export function apply({eq,bands,gain}){if(!ctx)return;F.forEach((b,i)=>{b.gain.value=eq?bands[i]:0});G.gain.value=10**(gain/20)}
export const resume=()=>{if(ctx&&ctx.state!=='running')ctx.resume().catch(()=>{})};
