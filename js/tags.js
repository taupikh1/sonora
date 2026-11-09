// Tag, cover art, dan parser OGG/Opus/AIFF. Semua membaca potongan file saja.
const dec=(b,e)=>new TextDecoder(['latin1','utf-16','utf-16be','utf-8'][e]||'utf-8').decode(b).replace(/\0+$/,'').replace(/^\uFEFF/,'');
const norm=m=>{const t={title:m.TITLE,artist:m.ARTIST,album:m.ALBUM,albumArtist:m.ALBUMARTIST,track:m.TRACKNUMBER,disc:m.DISCNUMBER,genre:m.GENRE,lyrics:(m.LYRICS||m.UNSYNCEDLYRICS||'').slice(0,2e4),year:(m.DATE||m.YEAR||'').slice(0,4)};
  Object.keys(t).forEach(k=>t[k]||delete t[k]);const g=k=>{const v=parseFloat(m[k]);return isNaN(v)?undefined:v};
  return{...t,rg:{track:g('REPLAYGAIN_TRACK_GAIN'),album:g('REPLAYGAIN_ALBUM_GAIN'),peak:g('REPLAYGAIN_TRACK_PEAK')}}};
const vc=(d,o)=>{const m={};let n=d.getUint32(o,true);o+=4+n;n=d.getUint32(o,true);o+=4;
  while(n--&&o+4<=d.byteLength){const l=d.getUint32(o,true),s=new TextDecoder().decode(new Uint8Array(d.buffer,d.byteOffset+o+4,Math.min(l,d.byteLength-o-4))),i=s.indexOf('=');o+=4+l;if(i>0)m[s.slice(0,i).toUpperCase()]=s.slice(i+1)}return m};
export const riffTags=(d,tx)=>{const m={},K={INAM:'TITLE',IART:'ARTIST',IPRD:'ALBUM',ITRK:'TRACKNUMBER',IGNR:'GENRE',ICRD:'DATE'};
  for(let o=4;o+8<=d.byteLength;){const id=tx(d,o,4),n=d.getUint32(o+4,true);if(K[id])m[K[id]]=tx(d,o+8,n).replace(/\0+$/,'');o+=8+n+(n&1)}return norm(m)};
export async function flacTags(f,rd){let o=4,m={},cover;
  for(let last=0;!last&&o+4<f.size;){const h=await rd(o,4),t=h.getUint8(0)&127,n=h.getUint32(0)&0xFFFFFF;last=h.getUint8(0)>>7;
    if(t===4&&n<1e6)m=vc(await rd(o+4,n),0);
    if(t===6&&!cover&&n<3e6){const d=await rd(o+4,n),ml=d.getUint32(4),mime=new TextDecoder().decode(new Uint8Array(d.buffer,d.byteOffset+8,ml));let p=8+ml;p+=4+d.getUint32(p);p+=16;
      cover=new Blob([new Uint8Array(d.buffer,d.byteOffset+p+4,d.getUint32(p))],{type:mime})}
    o+=4+n}
  return{tags:norm(m),cover,off:o}}
const MAP={TIT2:'TITLE',TPE1:'ARTIST',TALB:'ALBUM',TPE2:'ALBUMARTIST',TRCK:'TRACKNUMBER',TPOS:'DISCNUMBER',TCON:'GENRE',TDRC:'DATE',TYER:'DATE'};
export async function id3(f,rd){const h=await rd(0,10);if(String.fromCharCode(h.getUint8(0),h.getUint8(1),h.getUint8(2))!=='ID3')return{};
  const ver=h.getUint8(3),sz=Math.min((h.getUint8(6)<<21)|(h.getUint8(7)<<14)|(h.getUint8(8)<<7)|h.getUint8(9),8e6),d=await rd(10,sz),u=new Uint8Array(d.buffer,d.byteOffset,d.byteLength),m={};let cover,o=0;
  while(o+10<=u.length&&u[o]){const id=String.fromCharCode(...u.subarray(o,o+4)),n=ver===4?((u[o+4]<<21)|(u[o+5]<<14)|(u[o+6]<<7)|u[o+7]):d.getUint32(o+4),b=u.subarray(o+10,o+10+n);o+=10+n;
    if(id==='APIC'&&!cover){const e=b[0];let i=1;while(b[i]&&i<b.length)i++;const mime=dec(b.subarray(1,i),0);i+=2;
      if(e===1||e===2){while(i<b.length&&!(b[i]===0&&b[i+1]===0))i+=2;i+=2}else{while(i<b.length&&b[i])i++;i++}
      cover=new Blob([b.slice(i)],{type:mime.includes('/')?mime:'image/'+mime.toLowerCase()})}
    else if(id==='TXXX'){const [k,v]=dec(b.subarray(1),b[0]).split('\0');if(k&&/^replaygain/i.test(k))m[k.toUpperCase()]=v}
    else if(id==='USLT'&&b.length>5){const e=b[0];let i=4;if(e===1||e===2){while(i<b.length&&!(b[i]===0&&b[i+1]===0))i+=2;i+=2}else{while(i<b.length&&b[i])i++;i++}m.LYRICS=dec(b.subarray(i),e)}
    else if(MAP[id])m[MAP[id]]=dec(b.subarray(1),b[0])}
  return{tags:norm(m),cover}}
export function mp4tags(mv){const tx=(o,n)=>{let s='';for(let i=0;i<n;i++)s+=String.fromCharCode(mv.getUint8(o+i));return s};let p=-1;
  for(let i=4;i+4<=mv.byteLength;i++)if(mv.getUint8(i)===105&&tx(i,4)==='ilst'){p=i;break}
  if(p<0)return{};const end=Math.min(p-4+mv.getUint32(p-4),mv.byteLength),m={},K={'\xa9nam':'TITLE','\xa9ART':'ARTIST','\xa9alb':'ALBUM',aART:'ALBUMARTIST','\xa9gen':'GENRE','\xa9day':'DATE'};let cover,o=p+4;
  while(o+24<=end){const n=mv.getUint32(o),id=tx(o+4,4);if(n<24)break;const L=n-24,q=o+24,by=new Uint8Array(mv.buffer,mv.byteOffset+q,L);
    if(id==='covr'&&!cover)cover=new Blob([by],{type:(mv.getUint32(o+16)&0xFFFFFF)===14?'image/png':'image/jpeg'});
    else if(id==='trkn')m.TRACKNUMBER=''+mv.getUint16(q+2);else if(id==='disk')m.DISCNUMBER=''+mv.getUint16(q+2);
    else if(id==='----'){const g=/replaygain_(track|album)_(gain|peak)[\s\S]*?data[\s\S]{8}([-+0-9.]+)/i.exec(new TextDecoder('latin1').decode(new Uint8Array(mv.buffer,mv.byteOffset+o+8,n-8)));if(g)m['REPLAYGAIN_'+g[1].toUpperCase()+'_'+g[2].toUpperCase()]=g[3]}
    else if(K[id])m[K[id]]=new TextDecoder().decode(by);
    o+=n}
  return{tags:norm(m),cover}}
export async function ogg(f,rd){const d=await rd(0,Math.min(f.size,65536)),u=new Uint8Array(d.buffer),s=x=>String.fromCharCode(...u.subarray(x,x+8)),o=27+u[26],r={container:'Ogg',lossless:false};
  if(s(o)==='OpusHead'){r.codec='Opus';r.ch=u[o+9];r.sr=d.getUint32(o+12,true);r.pre=d.getUint16(o+10,true)}
  else if(s(o+1).startsWith('vorbis')){r.codec='Vorbis';r.ch=u[o+11];r.sr=d.getUint32(o+12,true)}else return r;
  let m={};for(let i=o;i+8<u.length;i++){if(u[i]===79&&s(i)==='OpusTags'){m=vc(d,i+8);break}if(u[i]===3&&s(i+1).startsWith('vorbis')){m=vc(d,i+7);break}}
  r.tags=norm(m);const n=Math.min(f.size,65536),t=await rd(f.size-n,n),w=new Uint8Array(t.buffer);
  for(let i=w.length-14;i>=0;i--)if(w[i]===79&&w[i+1]===103&&w[i+2]===103&&w[i+3]===83){const g=t.getUint32(i+6,true)+t.getUint32(i+10,true)*2**32;r.dur=r.codec==='Opus'?(g-r.pre)/48000:g/r.sr;break}
  if(r.dur)r.br=f.size*8/r.dur;return r}
export async function aiff(f,rd,tx){let o=12;const r={container:'AIFF',codec:'PCM',lossless:true};
  while(o+8<=f.size){const c=await rd(o,8),id=tx(c,0,4),n=c.getUint32(4);
    if(id==='COMM'){const d=await rd(o+8,Math.min(n,30)),e=d.getUint16(8)&0x7FFF;r.ch=d.getUint16(0);r.bits=d.getUint16(6);r.sr=Math.round((d.getUint32(10)*2**32+d.getUint32(14))*2**(e-16446));r.dur=d.getUint32(2)/r.sr;r.br=r.sr*r.bits*r.ch;
      if(n>=22&&tx(await rd(0,12),8,4)==='AIFC'){const ct=tx(d,18,4);if(!['NONE','sowt','twos'].includes(ct)){r.codec=ct;r.lossless=null}}break}
    o+=8+n+(n&1)}
  return r}
