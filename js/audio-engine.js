import {get} from './storage.js';
export const audio=new Audio();
export const st={queue:[],i:-1,shuffle:false,repeat:'off',lib:new Map(),cur(){return this.lib.get(this.queue[this.i])}};
let url,emit=()=>{};export const setOnChange=f=>emit=f;
const ms=navigator.mediaSession;
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
export function setQueue(ids,start=0){let q=[...ids];if(st.shuffle){const f=q.splice(start,1);q=[...f,...shuf(q)];start=0}st.queue=q;return playAt(start)}
export async function playAt(i,play=true,pos=0){
  if(i<0||i>=st.queue.length)return;st.i=i;const t=st.cur();
  const b=t&&await get('blobs',t.id);if(!b){emit('error');return}
  if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(b);audio.src=url;
  if(pos)audio.addEventListener('loadedmetadata',()=>{audio.currentTime=pos},{once:true});
  setMeta(t);emit('track');
  if(play)try{await audio.play()}catch(e){if(e.name!=='AbortError')emit('error')}}
export const restore=(ids,i,pos)=>{st.queue=ids;return playAt(i,false,pos)};
export const next=()=>{if(st.i+1<st.queue.length)playAt(st.i+1);else if(st.repeat==='all')playAt(0);else{audio.pause();audio.currentTime=0}};
export const prev=()=>{if(audio.currentTime>3||st.i<=0)audio.currentTime=0;else playAt(st.i-1)};
export const toggle=()=>audio.src&&(audio.paused?audio.play():audio.pause());
export const cycleRepeat=()=>st.repeat=({off:'all',all:'one',one:'off'})[st.repeat];
export const toggleShuffle=()=>{st.shuffle=!st.shuffle;if(st.shuffle){const h=st.queue.slice(0,st.i+1);st.queue=[...h,...shuf(st.queue.slice(st.i+1))]}};
export const playNext=id=>st.i<0?setQueue([id]):void st.queue.splice(st.i+1,0,id);
export const addQueue=id=>st.i<0?setQueue([id]):void st.queue.push(id);
function setMeta(t){if(!ms)return;ms.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:t.album||'',artwork:[{src:'assets/icons/icon-512.png',sizes:'512x512',type:'image/png'}]})}
audio.onended=()=>st.repeat==='one'?(audio.currentTime=0,audio.play()):next();
audio.onerror=()=>st.cur()&&emit('error');
audio.onplay=()=>{if(ms)ms.playbackState='playing';emit('state')};
audio.onpause=()=>{if(ms)ms.playbackState='paused';emit('state')};
audio.ontimeupdate=()=>{emit('time');if(ms&&isFinite(audio.duration))try{ms.setPositionState({duration:audio.duration,position:audio.currentTime,playbackRate:audio.playbackRate})}catch{}};
if(ms)[['play',()=>audio.play()],['pause',()=>audio.pause()],['previoustrack',prev],['nexttrack',next],['seekbackward',()=>{audio.currentTime-=10}],['seekforward',()=>{audio.currentTime+=10}],['seekto',d=>{audio.currentTime=d.seekTime}]].forEach(([a,f])=>{try{ms.setActionHandler(a,f)}catch{}});
