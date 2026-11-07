import {get} from './storage.js';
// `audio` = proxy ke elemen aktif. Elemen kedua hanya dibuat untuk crossfade/gapless (bukan iOS, bukan Web Audio).
const mk=()=>{const a=new Audio();a.preload='auto';return a};
let cur=mk(),nxt=null,oldEl=null,url,nxtUrl,ni=-1,pre=null,tm=0,iv=0,prepping=false,emit=()=>{};
export const audio=new Proxy({},{get:(_,k)=>{const v=cur[k];return typeof v==='function'?v.bind(cur):v},set:(_,k,v)=>(cur[k]=v,true)});
export const raw=()=>cur;
export const cfg={xf:0,gapless:false,allow:false};
export const st={queue:[],i:-1,shuffle:false,repeat:'off',lib:new Map(),cur(){return this.lib.get(this.queue[this.i])}};
export const setOnChange=f=>emit=f;
const ms=navigator.mediaSession,dual=()=>cfg.allow&&(cfg.xf>0||cfg.gapless);
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
export function setQueue(ids,start=0){let q=[...ids];if(st.shuffle){const f=q.splice(start,1);q=[...f,...shuf(q)];start=0}st.queue=q;return playAt(start)}
const reset=()=>{if(pre){URL.revokeObjectURL(pre.url);pre=null}clearTimeout(tm);tm=0;clearInterval(iv);iv=0;if(oldEl){oldEl.pause();oldEl.removeAttribute('src');oldEl=null}if(nxt){nxt.removeAttribute('src');URL.revokeObjectURL(nxtUrl);nxt=null}};
export async function playAt(i,play=true,pos=0){
  if(i<0||i>=st.queue.length)return;reset();st.i=i;const t=st.cur();
  const b=t&&await get('blobs',t.id);if(!b){emit('error');return}
  if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(b);audio.src=url;
  if(pos)audio.addEventListener('loadedmetadata',()=>{audio.currentTime=pos},{once:true});
  setMeta(t);emit('track');
  if(play)try{await audio.play()}catch(e){if(e.name!=='AbortError')emit('error')}}
async function prep(){prepping=true;const me=st.i,i=me+1<st.queue.length?me+1:st.repeat==='all'?0:-1;
  const t=i>=0&&st.lib.get(st.queue[i]),b=t&&await get('blobs',t.id);
  if(b&&st.i===me&&!nxt){nxtUrl=URL.createObjectURL(b);nxt=mk();nxt.src=nxtUrl;ni=i;wire(nxt)}prepping=false}
function swap(){tm=0;if(!nxt)return;const old=cur,ou=url,n=nxt,x=cfg.xf;nxt=null;cur=n;url=nxtUrl;st.i=ni;oldEl=old;
  n.volume=x?0:1;if(!x){const t0=performance.now(),rem=Math.max(0,(old.duration-old.currentTime)*1000);n.addEventListener('playing',()=>{st.gap=Math.round(performance.now()-t0-rem)},{once:true})}n.play().catch(()=>emit('error'));setMeta(st.cur());emit('track');
  if(!x){oldEl=null;setTimeout(()=>{old.pause();old.removeAttribute('src');URL.revokeObjectURL(ou)},1500);return}
  const t0=performance.now();iv=setInterval(()=>{const p=Math.min(1,(performance.now()-t0)/(x*1000));n.volume=p;old.volume=1-p;
    if(p>=1){clearInterval(iv);iv=0;old.pause();old.removeAttribute('src');old.volume=1;oldEl=null;URL.revokeObjectURL(ou)}},100)}
async function prefetch(){prepping=true;const me=st.i,i=me+1<st.queue.length?me+1:st.repeat==='all'?0:-1,t=i>=0&&st.lib.get(st.queue[i]),b=t&&await get('blobs',t.id);if(b&&st.i===me&&!pre)pre={i,url:URL.createObjectURL(b)};prepping=false}
function fast(){const t0=performance.now(),ou=url;url=pre.url;st.i=pre.i;pre=null;audio.src=url;audio.addEventListener('playing',()=>{st.gap=Math.round(performance.now()-t0)},{once:true});audio.play().catch(()=>emit('error'));URL.revokeObjectURL(ou);setMeta(st.cur());emit('track')}
function plan(a){if(!isFinite(a.duration)||st.repeat==='one')return;if(!dual()){if(cfg.gapless&&!pre&&!prepping&&a.duration-a.currentTime<12)prefetch();return}const ov=cfg.xf||0.06,rem=a.duration-a.currentTime;
  if(!nxt&&!prepping&&rem>0&&rem<ov+8)prep();
  if(nxt&&!tm&&rem<=ov+0.6)tm=setTimeout(swap,Math.max(0,(rem-ov)*1000))}
export const restore=(ids,i,pos)=>{st.queue=ids;return playAt(i,false,pos)};
export const next=()=>{if(st.i+1<st.queue.length)playAt(st.i+1);else if(st.repeat==='all')playAt(0);else{audio.pause();audio.currentTime=0}};
export const prev=()=>{if(audio.currentTime>3||st.i<=0)audio.currentTime=0;else playAt(st.i-1)};
export const toggle=()=>audio.src&&(audio.paused?audio.play():audio.pause());
export const cycleRepeat=()=>st.repeat=({off:'all',all:'one',one:'off'})[st.repeat];
export const toggleShuffle=()=>{st.shuffle=!st.shuffle;if(st.shuffle){const h=st.queue.slice(0,st.i+1);st.queue=[...h,...shuf(st.queue.slice(st.i+1))]}};
export const playNext=id=>st.i<0?setQueue([id]):void st.queue.splice(st.i+1,0,id);
export const addQueue=id=>st.i<0?setQueue([id]):void st.queue.push(id);
function setMeta(t){if(!ms)return;ms.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:t.album||'',artwork:[st.art?.(t)?{src:st.art(t)}:{src:'assets/icons/icon-512.png',sizes:'512x512',type:'image/png'}]})}
function wire(a){
  a.onended=()=>{if(a!==cur)return;if(st.repeat==='one'){a.currentTime=0;a.play();return}if(nxt){swap();return}if(pre&&cfg.gapless){fast();return}next()};
  a.onerror=()=>{if(a===cur&&st.cur())emit('error')};
  a.onplay=()=>{if(a!==cur)return;if(ms)ms.playbackState='playing';emit('state')};
  a.onpause=()=>{if(a!==cur)return;if(ms)ms.playbackState='paused';emit('state')};
  a.ontimeupdate=()=>{if(a!==cur)return;emit('time');if(ms&&isFinite(a.duration))try{ms.setPositionState({duration:a.duration,position:a.currentTime,playbackRate:a.playbackRate})}catch{}plan(a)}}
wire(cur);
if(ms)[['play',()=>audio.play()],['pause',()=>audio.pause()],['previoustrack',prev],['nexttrack',next],['seekbackward',()=>{audio.currentTime-=10}],['seekforward',()=>{audio.currentTime+=10}],['seekto',d=>{audio.currentTime=d.seekTime}]].forEach(([a,f])=>{try{ms.setActionHandler(a,f)}catch{}});
export const refreshMeta=()=>{const t=st.cur();t&&setMeta(t)};
