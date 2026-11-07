// Parser header audio: hanya membaca potongan file (header/moov), bukan seluruh file.
import {flacTags,id3,mp4tags,ogg,aiff} from './tags.js';
const A=String.fromCharCode;
export async function readInfo(f){
  const rd=async(o,n)=>new DataView(await f.slice(o,o+n).arrayBuffer());
  const tx=(d,o,n)=>{let s='';for(let i=0;i<n&&o+i<d.byteLength;i++)s+=A(d.getUint8(o+i));return s};
  const flac=async()=>{const d=await rd(8,34),a=d.getUint32(10),sr=a>>>12,tot=(a&15)*2**32+d.getUint32(14);
    return{container:'FLAC',codec:'FLAC',lossless:true,sr,ch:((a>>>9)&7)+1,bits:((a>>>4)&31)+1,dur:sr&&tot?tot/sr:null,vbr:true}};
  const wav=async()=>{let o=12;const r={container:'RIFF/WAVE',lossless:null};
    while(o+8<=f.size){const c=await rd(o,8),id=tx(c,0,4),n=c.getUint32(4,true);
      if(id==='fmt '){const d=await rd(o+8,Math.min(n,40));let t=d.getUint16(0,true);if(t===0xFFFE&&n>=26)t=d.getUint16(24,true);
        Object.assign(r,{codec:t===1?'PCM':t===3?'PCM float':'WAVE 0x'+t.toString(16),lossless:t===1||t===3?true:null,ch:d.getUint16(2,true),sr:d.getUint32(4,true),br:d.getUint32(8,true)*8,bits:d.getUint16(14,true)})}
      else if(id==='data'){const sz=n>f.size-o-8?f.size-o-8:n;r.dur=r.br?sz*8/r.br:null;break}
      o+=8+n+(n&1)}
    return r};
  const mp3=async()=>{const h=await rd(0,10);let o=0;
    if(tx(h,0,3)==='ID3')o=10+((h.getUint8(6)<<21)|(h.getUint8(7)<<14)|(h.getUint8(8)<<7)|h.getUint8(9));
    const d=await rd(o,8192);
    for(let i=0;i+4<d.byteLength;i++){const v=d.getUint32(i);if((v>>>21)!==0x7FF)continue;
      const ver=(v>>>19)&3,ly=(v>>>17)&3,bi=(v>>>12)&15,si=(v>>>10)&3;
      if(ver===1||ly===0||bi===15||bi===0||si===3)continue;
      if(ly!==1)return{container:'MPEG audio',codec:'MPEG Layer '+(4-ly),lossless:false};
      const v1=ver===3,mono=((v>>>6)&3)===3,sr=[44100,48000,32000][si]/(v1?1:ver===2?2:4);
      const tb=v1?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160];
      const x=i+4+(v1?(mono?17:32):(mono?9:17)),xs=tx(d,x,4),spf=v1?1152:576;
      const r={container:'MPEG audio',codec:'MP3',lossless:false,sr,ch:mono?1:2,br:tb[bi]*1000,vbr:xs==='Info'?false:null};
      if(xs==='Xing'||xs==='Info'){r.vbr=xs==='Xing';if(d.getUint32(x+4)&1){r.dur=d.getUint32(x+8)*spf/sr;if(r.vbr)r.br=(f.size-o)*8/r.dur}}
      else if(tx(d,i+36,4)==='VBRI'){r.vbr=true;r.dur=d.getUint32(i+50)*spf/sr;r.br=(f.size-o)*8/r.dur}
      if(!r.dur)r.dur=(f.size-o)*8/r.br;
      return r}
    return{container:'tidak dikenali'}};
  const mp4=async()=>{let o=0,mv;
    while(o+8<=f.size){const c=await rd(o,16);let n=c.getUint32(0);const id=tx(c,4,4);
      if(n===1)n=c.getUint32(8)*2**32+c.getUint32(12);if(n===0)n=f.size-o;
      if(id==='moov'){mv=await rd(o+8,Math.min(n-8,4e6));break}if(n<8)break;o+=n}
    if(!mv)return{container:'MP4'};
    const find=(s,from=0)=>{for(let i=from;i+4<=mv.byteLength;i++)if(mv.getUint8(i)===s.charCodeAt(0)&&tx(mv,i,4)===s)return i;return -1};
    const r={container:'MP4/M4A'},hd=find('mdhd'),s=find('stsd');
    if(hd>0){const v=mv.getUint8(hd+4),ts=mv.getUint32(hd+(v?24:16)),du=v?mv.getUint32(hd+28)*2**32+mv.getUint32(hd+32):mv.getUint32(hd+20);r.dur=ts?du/ts:null}
    if(s>0){const e=s+12,fm=tx(mv,e+4,4);
      Object.assign(r,{codec:fm==='alac'?'ALAC':fm==='mp4a'?'AAC':fm,lossless:fm==='alac'?true:fm==='mp4a'?false:null,ch:mv.getUint16(e+24),sr:mv.getUint16(e+32)});
      if(fm==='alac'){const a=find('alac',e+8);if(a>0){r.bits=mv.getUint8(a+13);r.ch=mv.getUint8(a+17);r.sr=mv.getUint32(a+28)}}}
    if(r.dur)r.br=f.size*8/r.dur;
    return Object.assign(r,mp4tags(mv))};
  try{const h=await rd(0,12),m=tx(h,0,4);
    const r=m==='fLaC'?await flac():m==='RIFF'&&tx(h,8,4)==='WAVE'?await wav():tx(h,4,4)==='ftyp'?await mp4():m==='OggS'?await ogg(f,rd):m==='FORM'?await aiff(f,rd,tx):await mp3();
    if(r.container==='FLAC')Object.assign(r,await flacTags(f,rd));else if(r.container==='MPEG audio')Object.assign(r,await id3(f,rd));
    if(r.dur&&!r.br&&r.lossless)r.br=f.size*8/r.dur;
    return r}catch(e){return{err:1}}
}
export const quality=i=>{if(!i||!i.codec)return null;
  if(i.lossless===true){if(i.bits===16&&i.sr===44100)return'CD Quality';return i.bits>=24||i.sr>48000?'Hi-Res':'Lossless'}
  return i.lossless===false?'Lossy':null};
export const short=i=>{if(!i||!i.codec)return'';
  const d=i.lossless?(i.bits&&i.sr?`${i.bits}/${+(i.sr/1000).toFixed(1)}`:''):(i.br?Math.round(i.br/1000)+'k':'');return i.codec+(d?' '+d:'')};
