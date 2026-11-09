// Hitungan dan pengelompokan library (tanpa DOM).
import {quality} from './metadata.js';
export const akey=t=>(t.info?.tags?.albumArtist||t.artist||'')+'|'+(t.album||'');
export const gv=(t,k)=>k==='album'?akey(t):(t[k]||'');
export const tsum=a=>{const s=a.reduce((n,t)=>n+(t.duration||0),0),h=s/3600|0,m=Math.round(s%3600/60);return(h?h+' j ':'')+m+' mnt'};
export const mb=a=>{const b=a.reduce((n,t)=>n+(t.size||0),0);return b>=1073741824?(b/1073741824).toFixed(1)+' GB':(b/1048576).toFixed(0)+' MB'};
export const qual=a=>{let hr=0,ll=0,ly=0;for(const t of a){const i=t.info||{};if(quality(i)==='Hi-Res')hr++;if(i.lossless===true)ll++;else if(i.lossless===false)ly++}return[hr,ll,ly]};
