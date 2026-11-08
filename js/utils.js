export const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const fmt=s=>{s=Math.max(0,s|0);return (s/60|0)+':'+String(s%60).padStart(2,'0')};
export const MIME={mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',wav:'audio/wav',flac:'audio/flac',ogg:'audio/ogg',opus:'audio/ogg; codecs=opus',aif:'audio/aiff',aiff:'audio/aiff'};
export const ext=n=>n.split('.').pop().toLowerCase();
export const probe=f=>{const m=MIME[ext(f.name)]||f.type;return m&&new Audio().canPlayType(m)?m:null};
export const parseName=n=>{const b=n.replace(/\.[^.]+$/,''),p=b.split(' - ');return p.length>1?{artist:p[0].trim(),title:p.slice(1).join(' - ').trim()}:{artist:'Unknown Artist',title:b}};
export const hue=s=>Math.abs([...s].reduce((a,c)=>(a*31+c.charCodeAt(0))|0,7))%360;
export const dur=f=>new Promise((res,rej)=>{const a=new Audio(),u=URL.createObjectURL(f);const done=(ok,v)=>{URL.revokeObjectURL(u);ok?res(v):rej(v)};a.preload='metadata';a.onloadedmetadata=()=>done(1,a.duration||0);a.onerror=()=>done(0,new Error('decode'));setTimeout(()=>done(1,0),8000);a.src=u});
