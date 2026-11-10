import {get} from './storage.js';
// `audio` = proxy ke elemen aktif. Elemen kedua hanya dibuat untuk crossfade/gapless (bukan iOS, bukan Web Audio).
let spd=1;
const mk=()=>{const a=new Audio();a.preload='auto';a.defaultPlaybackRate=a.playbackRate=spd;return a};
let cur=mk(),nxt=null,oldEl=null,url,nxtUrl,ni=-1,pre=null,tm=0,iv=0,prepping=false,emit=()=>{};
// Phase 13: `want` = aplikasi/pengguna MAU memutar (diset lewat audio.play()/audio.pause()). Jika elemen ter-pause padahal want=true dan bukan karena lagu habis,
// berarti dijeda sistem (interupsi: aplikasi lain, panggilan, dll). `intr` = waktu interupsi dimulai (0 = tidak sedang terinterupsi).
let want=false,intr=0,cand=0,lastAS=0,rt=0,weak=0,pend=0,orig=null,wdt=0,gs=0;
const AS=navigator.audioSession,MAXGAP=30*60e3,WEAKGAP=15*60e3,RETRY=[500,1200,2500,5000];
export const audio=new Proxy({},{get:(_,k)=>{if(k==='play')return()=>{want=true;return cur.play()};if(k==='pause')return()=>{want=false;intr=0;cand=0;clearTimeout(rt);cur.pause()};
  const v=cur[k];return typeof v==='function'?v.bind(cur):v},set:(_,k,v)=>{if(k==='currentTime')pend=0;cur[k]=v;if(k==='currentTime'&&isFinite(v))guardSeek(v);return true}});
// Phase 17: `pend` = posisi tersimpan yang belum berhasil di-seek (iOS sering belum memuat metadata sebelum play). Selama pend>0, posisi yang disimpan/ditampilkan adalah pend, bukan currentTime.
export const pos=()=>pend||cur.currentTime,pending=()=>pend;
// Phase 18: pemulihan posisi yang tidak bisa macet. (1) Posisi awal diberikan lewat fragmen `#t=` pada URL (tanpa seek). (2) Satu kali seek langsung bila posisi belum tercapai. (3) Jika tetap gagal: muat ulang elemen di posisi itu. (4) Jika masih gagal: menyerah, `pend` dihapus supaya angka detik kembali mengikuti audio asli.
// Seek biasa (slider, lirik, dll) dijaga sama: bila setelah 2,5 dtk elemen masih 'seeking' atau posisinya jauh dari target (elemen iOS yang macet), elemen dimuat ulang di posisi target.
const frag=v=>url+'#t='+v.toFixed(1);
function arm(el,v){pend=v;let t0=0,tries=0,did=0;clearInterval(wdt);const onMeta=()=>el.addEventListener('loadedmetadata',()=>{t0=Date.now()},{once:true});onMeta();
  wdt=setInterval(()=>{if(cur!==el||!pend){clearInterval(wdt);return}if(!t0)return;const age=Date.now()-t0;
    if(el.readyState>=1&&!el.seeking&&Math.abs(el.currentTime-pend)<1.5){pend=0;clearInterval(wdt);return}
    if(!did&&age>1200&&!el.seeking){did=1;note('posisi tersimpan belum tercapai, seek langsung ke '+pend.toFixed(1));try{el.currentTime=pend}catch{}}
    else if(age>5000){if(tries<1){tries=1;did=0;t0=0;onMeta();note('seek macet, elemen dimuat ulang di '+pend.toFixed(1));const w=!el.paused;el.src=frag(pend);if(w)el.play().catch(()=>{})}
      else{note('gagal memulihkan posisi tersimpan, menyerah');pend=0;clearInterval(wdt);emit('seekfail')}}},300)}
function guardSeek(v){clearTimeout(gs);const el=cur,u0=url,t0=Date.now();gs=setTimeout(()=>{if(cur!==el||url!==u0||!u0||!el.src)return;if(isFinite(el.duration)&&v>=el.duration-1)return;
  const exp=v+(el.paused?0:(Date.now()-t0)/1000*(el.playbackRate||1));if(!el.seeking&&Math.abs(el.currentTime-exp)<=3)return;
  note('seek ke '+v.toFixed(1)+' tidak berhasil, elemen dimuat ulang di posisi itu');const w=!el.paused;el.src=frag(v);arm(el,v);if(w)el.play().catch(()=>{})},2500)}
// Log peristiwa audio (40 terakhir, bertahan walau halaman di-kill iOS) untuk Diagnostik.
export const events=()=>{try{return JSON.parse(localStorage.getItem('alog'))||[]}catch{return[]}};
export const note=m=>{try{const l=events();l.push([Date.now(),m]);localStorage.setItem('alog',JSON.stringify(l.slice(-150)))}catch{}};
const ctx=()=>'hidden='+document.hidden+', pos='+(cur.currentTime||0).toFixed(1);
export const raw=()=>cur;
export const cfg={xf:0,gapless:false,allow:false,auto:true};
export const st={queue:[],i:-1,shuffle:false,repeat:'off',lib:new Map(),cur(){return this.lib.get(this.queue[this.i])}};
try{const r=localStorage.getItem('repeat');if(r==='all'||r==='one')st.repeat=r;st.shuffle=localStorage.getItem('shuffle')==='1'}catch{}
const keep=()=>{try{localStorage.setItem('repeat',st.repeat);localStorage.setItem('shuffle',st.shuffle?'1':'0')}catch{}};
export const setOnChange=f=>emit=f;
const ms=navigator.mediaSession,dual=()=>cfg.allow&&(cfg.xf>0||cfg.gapless);
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
export function setQueue(ids,start=0){let q=[...ids];orig=st.shuffle?[...ids]:null;if(st.shuffle){const f=q.splice(start,1);q=[...f,...shuf(q)];start=0}st.queue=q;return playAt(start)}
const reset=()=>{clearInterval(wdt);clearTimeout(gs);if(cur.volume!==1)cur.volume=1;if(pre){URL.revokeObjectURL(pre.url);pre=null}clearTimeout(tm);tm=0;clearInterval(iv);iv=0;if(oldEl){oldEl.pause();oldEl.removeAttribute('src');oldEl=null}if(nxt){nxt.removeAttribute('src');URL.revokeObjectURL(nxtUrl);nxt=null}};
export async function playAt(i,play=true,pos=0){
  if(i<0||i>=st.queue.length)return;reset();st.i=i;pend=0;const t=st.cur();
  const b=t&&await get('blobs',t.id);if(!b){want=false;emit('error');return}
  if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(b);audio.src=pos>0?frag(pos):url;intr=0;cand=0;want=play;
  if(pos>0)arm(cur,pos);
  setMeta(t);emit('track');
  if(play)try{await audio.play()}catch(e){if(e.name==='NotAllowedError'){note('play diblokir browser (NotAllowedError)');emit('blocked')}else if(e.name!=='AbortError')emit('error')}}
async function prep(){prepping=true;try{const me=st.i,i=me+1<st.queue.length?me+1:st.repeat==='all'?0:-1;
  const t=i>=0&&st.lib.get(st.queue[i]),b=t&&await get('blobs',t.id);
  if(b&&st.i===me&&!nxt){nxtUrl=URL.createObjectURL(b);nxt=mk();nxt.src=nxtUrl;ni=i;wire(nxt)}}catch{}prepping=false}
function swap(){tm=0;if(!nxt)return;const old=cur,ou=url,n=nxt,x=cfg.xf;nxt=null;cur=n;url=nxtUrl;st.i=ni;oldEl=old;
  n.volume=x?0:1;if(!x){const t0=performance.now(),rem=Math.max(0,(old.duration-old.currentTime)*1000);n.addEventListener('playing',()=>{st.gap=Math.round(performance.now()-t0-rem)},{once:true})}n.play().catch(()=>emit('error'));setMeta(st.cur());emit('track');
  if(!x){oldEl=null;setTimeout(()=>{old.pause();old.removeAttribute('src');URL.revokeObjectURL(ou)},1500);return}
  const t0=performance.now();iv=setInterval(()=>{const p=Math.min(1,(performance.now()-t0)/(x*1000));n.volume=p;old.volume=1-p;
    if(p>=1){clearInterval(iv);iv=0;old.pause();old.removeAttribute('src');old.volume=1;oldEl=null;URL.revokeObjectURL(ou)}},100)}
async function prefetch(){prepping=true;try{const me=st.i,i=me+1<st.queue.length?me+1:st.repeat==='all'?0:-1,t=i>=0&&st.lib.get(st.queue[i]),b=t&&await get('blobs',t.id);if(b&&st.i===me&&!pre)pre={i,url:URL.createObjectURL(b)}}catch{}prepping=false}
function fast(){const t0=performance.now(),ou=url;url=pre.url;st.i=pre.i;pre=null;audio.src=url;audio.addEventListener('playing',()=>{st.gap=Math.round(performance.now()-t0)},{once:true});audio.play().catch(()=>emit('error'));URL.revokeObjectURL(ou);setMeta(st.cur());emit('track')}
function plan(a){if(!isFinite(a.duration)||st.repeat==='one')return;if(!dual()){if(!pre&&!prepping&&a.duration-a.currentTime<12)prefetch();return}const ov=cfg.xf||0.06,rem=a.duration-a.currentTime;
  if(!nxt&&!prepping&&rem>0&&rem<ov+8)prep();
  if(nxt&&!tm&&rem<=ov+0.6)tm=setTimeout(swap,Math.max(0,(rem-ov)*1000))}
export const restore=(ids,i,pos)=>{st.queue=ids;return playAt(i,false,pos)};
export const next=()=>{if(st.i+1<st.queue.length)playAt(st.i+1);else if(st.repeat==='all')playAt(0);else{audio.pause();audio.currentTime=0}};
export const prev=()=>{if(audio.currentTime>3||st.i<=0)audio.currentTime=0;else playAt(st.i-1)};
export const toggle=()=>{if(!audio.src)return;if(audio.paused||intr){intr=0;return audio.play().catch(e=>{note('toggle play gagal: '+e.name);if(e.name!=='AbortError')emit('blocked')})}audio.pause()};
export const setSpeed=r=>{spd=Math.max(0.5,Math.min(2,r||1));cur.defaultPlaybackRate=cur.playbackRate=spd;if(nxt)nxt.defaultPlaybackRate=nxt.playbackRate=spd};
export const cycleRepeat=()=>{queueChanged();st.repeat=st.repeat==='off'?'all':st.repeat==='all'?'one':'off';keep()};
export const toggleShuffle=()=>{queueChanged();st.shuffle=!st.shuffle;keep();
  if(st.shuffle){orig=[...st.queue];const h=st.queue.slice(0,st.i+1);st.queue=[...h,...shuf(st.queue.slice(st.i+1))]}
  else if(orig){const cid=st.queue[st.i],rest=[...st.queue],q=[];for(const x of orig){const k=rest.indexOf(x);if(k>=0){q.push(x);rest.splice(k,1)}}q.push(...rest);st.queue=q;const k=q.indexOf(cid);if(k>=0)st.i=k;orig=null}};
export function queueChanged(){if(pre){URL.revokeObjectURL(pre.url);pre=null}clearTimeout(tm);tm=0;if(nxt){nxt.removeAttribute('src');URL.revokeObjectURL(nxtUrl);nxt=null}}
export const playNext=id=>{if(st.i<0)return setQueue([id]);queueChanged();st.queue.splice(st.i+1,0,id)};
export const addQueue=id=>{if(st.i<0)return setQueue([id]);queueChanged();st.queue.push(id)};
export function moveQ(a,b){const n=st.queue.length;if(a===b||a<0||b<0||a>=n||b>=n)return;queueChanged();const[x]=st.queue.splice(a,1);st.queue.splice(b,0,x);const c=st.i;if(a===c)st.i=b;else if(a<c&&b>=c)st.i--;else if(a>c&&b<=c)st.i++}
export function clearUpcoming(){queueChanged();st.queue=st.queue.slice(0,st.i+1)}
export function clearAll(){reset();audio.pause();audio.removeAttribute('src');audio.load();if(url){URL.revokeObjectURL(url);url=null}st.queue=[];st.i=-1;if(ms){ms.metadata=null;ms.playbackState='none'}emit('cleared')}
export function removeAt(i){if(i<0||i>=st.queue.length)return;queueChanged();
  if(i!==st.i){st.queue.splice(i,1);if(i<st.i)st.i--;return}
  const was=!audio.paused;st.queue.splice(i,1);
  if(!st.queue.length)return clearAll();
  return playAt(i<st.queue.length?i:st.queue.length-1,i<st.queue.length&&was)}
function setMeta(t){if(!ms)return;ms.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:t.album||'',artwork:[st.art?.(t)?{src:st.art(t)}:{src:'assets/icons/icon-512.png',sizes:'512x512',type:'image/png'}]})}
function wire(a){
  a.onended=()=>{if(a!==cur)return;note('lagu habis ('+ctx()+')');if(st.repeat==='one'){a.currentTime=0;a.play();return}if(nxt){swap();return}if(pre){fast();return}next()};
  a.onseeking=()=>{if(a===cur)note('seek ke '+a.currentTime.toFixed(1)+' ('+ctx()+')')};
  a.onerror=()=>{if(a===cur&&st.cur())emit('error')};
  a.onplay=()=>{if(a!==cur)return;note('play ('+ctx()+')');intr=0;cand=0;clearTimeout(rt);if(ms)ms.playbackState='playing';emit('state')};
  a.onpause=()=>{if(a!==cur)return;note('pause ('+ctx()+', want='+want+', ended='+a.ended+')');if(ms)ms.playbackState='paused';if(want&&!a.ended)sysPause();emit('state')};
  a.ontimeupdate=()=>{if(a!==cur)return;emit('time');if(ms&&isFinite(a.duration))try{ms.setPositionState({duration:a.duration,position:a.currentTime,playbackRate:a.playbackRate})}catch{}plan(a)}}
// --- Interupsi & lanjut otomatis (Phase 13) ---
// Dengan Audio Session API (Safari iOS 16.4+): interupsi = state 'interrupted'. Tanpa API itu: pause sistem saat halaman tersembunyi.
// Pause karena hal lain (mis. earphone dicabut) sengaja TIDAK dilanjutkan otomatis.
// Phase 17: interupsi 'kuat' = audioSession melapor interrupted. Interupsi 'lemah' = iOS mem-pause saat halaman tersembunyi tanpa laporan audioSession; hanya dilanjutkan bila halaman kembali tampil dalam 15 menit.
function sysPause(){cand=Date.now();const strong=AS?(AS.state==='interrupted'||Date.now()-lastAS<3000):false;if(strong||document.hidden){intr=cand;weak=strong?0:1;note('pause oleh sistem = interupsi '+(strong?'(dilaporkan audioSession)':'(lemah: halaman tersembunyi)')+' audioSession='+(AS?AS.state:'n/a')+', hidden='+document.hidden)}else note('pause oleh sistem, BUKAN interupsi (audioSession='+(AS?AS.state:'n/a')+') - tidak dilanjutkan otomatis')}
function resume(why){if(!intr||!want||!cfg.auto||!cur.src)return;if(!cur.paused){intr=0;weak=0;return}
  if(weak&&Date.now()-intr>WEAKGAP){note('lanjut otomatis dibatalkan: jeda lemah lebih dari 15 menit');intr=0;weak=0;return}
  if(Date.now()-intr>MAXGAP){note('lanjut otomatis dibatalkan: interupsi lebih dari 30 menit');intr=0;return}
  if(AS&&AS.state==='interrupted'){note('lanjut ditunda ('+why+'): audioSession masih interrupted');return}
  clearTimeout(rt);attempt(why,0)}
function attempt(why,n){if(!intr||!want||!cur.paused)return;
  Promise.resolve(cur.play()).then(()=>note(`lanjut otomatis OK (${why}, percobaan ${n+1})`),e=>{note(`lanjut otomatis gagal (${why}, #${n+1}): ${e.name}`);
    if(n<RETRY.length)rt=setTimeout(()=>attempt(why,n+1),RETRY[n]);else emit('resumefail')})}
if(AS){try{AS.type='playback'}catch{}
  // Phase 19: iPhone bisa mengirim statechange tanpa `state` (undefined). Itu dianggap SINYAL interupsi (awal atau akhir, tidak dibedakan): lastAS dicatat supaya pause sistem 3 dtk berikutnya dihitung interupsi.
  // Bila tidak ada state dan halaman sedang tampil, coba lanjutkan (kemungkinan akhir interupsi); bila tersembunyi, tunggu halaman tampil.
  AS.addEventListener('statechange',()=>{const s=AS.state,blank=s!=='active'&&s!=='interrupted'&&s!=='inactive';note('audioSession -> '+s+(blank?' (tanpa state, dianggap sinyal)':'')+' ('+ctx()+', want='+want+', paused='+cur.paused+')');
    if(s==='interrupted'||blank){lastAS=Date.now();if(intr)weak=0;else if(want&&cand&&Date.now()-cand<3000){intr=cand;weak=0}
      if(blank){if(intr&&cur.paused){if(document.hidden)note('sinyal tanpa state saat tersembunyi: lanjut menunggu halaman tampil');else resume('audioSession tanpa state')}}}
    else resume('audioSession')})}
document.addEventListener('visibilitychange',()=>{note('halaman '+(document.hidden?'tersembunyi':'tampil')+' (want='+want+', paused='+cur.paused+', intr='+(intr?1:0)+', pos='+(cur.currentTime||0).toFixed(1)+')');if(!document.hidden)resume('tampil')});
addEventListener('pageshow',()=>resume('pageshow'));addEventListener('focus',()=>resume('focus'));
note('boot (audioSession '+(AS?'ada, '+AS.state:'tidak ada')+')');
wire(cur);
const iosUA=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
if(ms)[['play',()=>{if(!audio.src)return;intr=0;note('Media Session: play');return audio.play().catch(e=>{note('Media Session play gagal: '+e.name);emit('blocked')})}],['pause',()=>{note('Media Session: pause');audio.pause()}],['previoustrack',prev],['nexttrack',next],
  ...(iosUA?[]:[['seekbackward',()=>{audio.currentTime-=10}],['seekforward',()=>{audio.currentTime+=10}]]),['seekto',d=>{audio.currentTime=d.seekTime}]].forEach(([a,f])=>{try{ms.setActionHandler(a,f)}catch{}});
export const refreshMeta=()=>{const t=st.cur();t&&setMeta(t)};
