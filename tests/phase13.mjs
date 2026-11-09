// Tes Phase 13: interupsi & lanjut otomatis, slider seek, crossfade, restore sesi, wipe. Jalankan: npm i --no-save puppeteer && node tests/phase13.mjs
// Opsional: CHROME_PATH=/path/ke/chrome  PPTR_DIR=/folder/node_modules/
// Catatan: interupsi iOS DISIMULASIKAN (pause dari luar aplikasi + audioSession palsu). Ini bukan bukti perilaku iPhone asli; lihat TESTING_IPHONE.md.
import http from 'http';import fs from 'fs';import path from 'path';import os from 'os';import {createRequire} from 'module';import {fileURLToPath} from 'url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const req=createRequire((process.env.PPTR_DIR||process.cwd()+'/')+(process.env.PPTR_DIR?'':'x'));
let pptr;try{pptr=req('puppeteer')}catch{pptr=req('puppeteer-core')}
const MT={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':MT[path.extname(f)]||'application/octet-stream'});r.end(d)}})});
await new Promise(r=>srv.listen(0,r));const URLX=`http://localhost:${srv.address().port}/`;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sonora-r-'));
const wav=(file,hz,sec)=>{const sr=22050,n=sr*sec,b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(6000*Math.sin(2*Math.PI*hz*i/sr)),44+i*2);fs.writeFileSync(file,b)};
const F=[['Alfa - Lagu Satu.wav',440,30],['Beta - Lagu Dua.wav',550,30],['Gamma - Lagu Tiga.wav',660,30]].map(([n,h,d])=>{const f=path.join(tmp,n);wav(f,h,d);return f});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const res=[];const ok=(n,c,i='')=>{res.push(!!c);console.log((c?'PASS ':'FAIL ')+n+(c?'':'  -> '+i))};
const browser=await pptr.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
async function fresh({as=false,ls={}}={}){
  const ctx=await browser.createBrowserContext();const p=await ctx.newPage();await p.setViewport({width:390,height:844});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.errs=errs;
  await p.evaluateOnNewDocument((as,ls)=>{for(const k in ls)localStorage.setItem(k,ls[k]);
    window.__a=[];const O=window.Audio;window.Audio=function(...a){const x=new O(...a);window.__a.push(x);return x};
    window.__ms={};const sh=navigator.mediaSession.setActionHandler.bind(navigator.mediaSession);navigator.mediaSession.setActionHandler=(n,f)=>{window.__ms[n]=f;try{sh(n,f)}catch{}};
    if(as){const t=new EventTarget();t.state='inactive';t.type='auto';Object.defineProperty(navigator,'audioSession',{value:t,configurable:true})}
    window.__hide=h=>{Object.defineProperty(document,'hidden',{get:()=>h,configurable:true});document.dispatchEvent(new Event('visibilitychange'))};
  },as,ls);
  await p.goto(URLX,{waitUntil:'networkidle0'});await sleep(300);
  const [fc]=await Promise.all([p.waitForFileChooser(),p.click('#add')]);await fc.accept(F);await sleep(2500);
  await p.click('#nav button[data-n=lib]');await sleep(200);
  return p}
const el=p=>p.evaluate(()=>{const a=window.__a.filter(x=>x.src).filter(x=>!x.paused||x.currentTime>0);const c=a[a.length-1];return c?{t:+c.currentTime.toFixed(2),paused:c.paused,vol:c.volume}:null});
const play=async p=>{await p.click('[data-play]');await sleep(900)};
const sysPause=p=>p.evaluate(()=>{const a=window.__a.filter(x=>x.src&&!x.paused).pop();HTMLMediaElement.prototype.pause.call(a)});

// A. interupsi saat app di background (tanpa audioSession) -> harus lanjut saat kembali
{const p=await fresh();await play(p);
 await p.evaluate(()=>window.__hide(true));await sleep(100);await sysPause(p);await sleep(300);
 let e=await el(p);ok('A0 (setup) audio ter-pause oleh "sistem"',e&&e.paused);
 await p.evaluate(()=>window.__hide(false));await sleep(2000);e=await el(p);
 ok('A. Setelah kembali ke app, lagu lanjut otomatis',e&&!e.paused,JSON.stringify(e));
 await p.browserContext().close()}
// B. user pause sendiri -> TIDAK boleh lanjut sendiri
{const p=await fresh();await play(p);await p.click('#mo');await sleep(200);await p.click('#pp');await sleep(300);
 await p.evaluate(()=>window.__hide(true));await sleep(100);await p.evaluate(()=>window.__hide(false));await sleep(1500);
 const e=await el(p);ok('B. Pause oleh user tetap pause setelah background/foreground',e&&e.paused,JSON.stringify(e));await p.browserContext().close()}
// C. audioSession interrupted -> inactive tanpa visibility change
{const p=await fresh({as:true});await play(p);
 await p.evaluate(()=>{navigator.audioSession.state='interrupted';navigator.audioSession.dispatchEvent(new Event('statechange'))});await sleep(50);await sysPause(p);await sleep(300);
 await p.evaluate(()=>{navigator.audioSession.state='inactive';navigator.audioSession.dispatchEvent(new Event('statechange'))});await sleep(1500);
 const e=await el(p);ok('C. audioSession interrupted->selesai: lagu lanjut otomatis',e&&!e.paused,JSON.stringify(e));await p.browserContext().close()}
// D. pause bukan karena interupsi (mis. earphone dicabut) + audioSession tidak interrupted -> jangan lanjut
{const p=await fresh({as:true});await play(p);await sysPause(p);await sleep(3500);
 await p.evaluate(()=>window.__hide(true));await sleep(100);await p.evaluate(()=>window.__hide(false));await sleep(1500);
 const e=await el(p);ok('D. Pause non-interupsi (route change) tidak lanjut sendiri',e&&e.paused,JSON.stringify(e));await p.browserContext().close()}
// E. Tombol play lock screen/Control Center saat masih dalam status interupsi
{const p=await fresh({as:true});await play(p);
 await p.evaluate(()=>{navigator.audioSession.state='interrupted';navigator.audioSession.dispatchEvent(new Event('statechange'))});await sysPause(p);await sleep(300);
 await p.evaluate(()=>window.__ms.play());await sleep(800);
 const e=await el(p);ok('E. Media Session "play" (Control Center) memutar lagu',e&&!e.paused,JSON.stringify(e));await p.browserContext().close()}
// F. slider seek "nyangkut": input tanpa change -> waktu berhenti
{const p=await fresh();await play(p);await p.click('#mo');await sleep(300);
 await p.evaluate(()=>{const s=document.querySelector('#seek');s.value=500;s.dispatchEvent(new Event('input',{bubbles:true}))});
 await p.evaluate(()=>document.querySelector('#seek').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true})));
 await sleep(1000);const a=await p.$eval('#cur',e=>e.textContent);await sleep(2500);const b=await p.$eval('#cur',e=>e.textContent);
 ok('F. Angka detik tetap jalan setelah sentuhan slider dibatalkan',a!==b,`${a} -> ${b}`);await p.browserContext().close()}
// G. crossfade: next di tengah crossfade -> volume harus 1
{const p=await fresh({ls:{xf:'3'}});await play(p);
 await p.evaluate(()=>{const a=window.__a.filter(x=>x.src&&!x.paused).pop();a.currentTime=a.duration-3.7});await sleep(1700);
 await p.evaluate(()=>document.querySelector('#nx').click());await sleep(1500);
 const e=await el(p);ok('G. Volume kembali 1 setelah Next di tengah crossfade',e&&e.vol===1,JSON.stringify(e));await p.browserContext().close()}

const alog=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('alog')||'[]').map(x=>x[1]));
// H. Next dari lock screen saat halaman tersembunyi: bukan interupsi, lagu baru jalan
{const p=await fresh();await play(p);await p.evaluate(()=>window.__hide(true));await sleep(100);
 await p.evaluate(()=>window.__ms.nexttrack());await sleep(1200);let e=await el(p);const lg=await alog(p);
 ok('H. Next saat tersembunyi: lagu baru jalan & tidak dianggap interupsi',e&&!e.paused&&!lg.some(m=>/= interupsi/.test(m)),JSON.stringify(e)+' '+lg.slice(-3).join(' | '));await p.browserContext().close()}
// I. Lagu habis sendiri saat tersembunyi: lanjut ke lagu berikut, bukan interupsi
{const p=await fresh();await play(p);await p.evaluate(()=>window.__hide(true));
 await p.evaluate(()=>{const a=window.__a.filter(x=>x.src&&!x.paused).pop();a.currentTime=a.duration-0.5});await sleep(2200);
 const t=await p.$eval('#mt',e=>e.textContent),e=await el(p),lg=await alog(p);
 ok('I. Lagu habis saat tersembunyi: lanjut lagu berikut & tidak dianggap interupsi',e&&!e.paused&&t!=='Lagu Satu'&&!lg.some(m=>/= interupsi/.test(m)),`${t} ${JSON.stringify(e)} ${lg.slice(-3).join(' | ')}`);await p.browserContext().close()}
// J. audioSession masih interrupted saat app tampil -> TUNDA, lalu lanjut ketika selesai
{const p=await fresh({as:true});await play(p);
 await p.evaluate(()=>{navigator.audioSession.state='interrupted';navigator.audioSession.dispatchEvent(new Event('statechange'))});await sysPause(p);await sleep(200);
 await p.evaluate(()=>window.__hide(true));await sleep(100);await p.evaluate(()=>window.__hide(false));await sleep(800);
 let e=await el(p);const waited=e&&e.paused;
 await p.evaluate(()=>{navigator.audioSession.state='active';navigator.audioSession.dispatchEvent(new Event('statechange'))});await sleep(1200);e=await el(p);
 ok('J. Saat masih interrupted: menunggu; setelah selesai: lanjut',waited&&e&&!e.paused,`waited=${waited} ${JSON.stringify(e)}`);await p.browserContext().close()}
// K. play() ditolak 2x (NotAllowedError) lalu berhasil -> retry otomatis
{const p=await fresh();await play(p);
 await p.evaluate(()=>{window.__fail=2;const o=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(window.__fail>0){window.__fail--;return Promise.reject(new DOMException('x','NotAllowedError'))}return o.call(this)}});
 await p.evaluate(()=>window.__hide(true));await sysPause(p);await sleep(100);await p.evaluate(()=>window.__hide(false));await sleep(3500);
 const e=await el(p);ok('K. Retry otomatis setelah play() ditolak 2x',e&&!e.paused,JSON.stringify(e)+' '+(await alog(p)).slice(-4).join(' | '));await p.browserContext().close()}
// L. play() selalu ditolak -> toast ajakan ketuk play, tidak crash
{const p=await fresh();await play(p);
 await p.evaluate(()=>{HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('x','NotAllowedError'))}});
 await p.evaluate(()=>window.__hide(true));await sysPause(p);await sleep(100);await p.evaluate(()=>window.__hide(false));await sleep(10500);
 const tt=await p.$eval('#toast',e=>e.textContent);ok('L. Gagal terus -> toast "Ketuk tombol play", tanpa error JS',/Ketuk tombol play/.test(tt)&&p.errs.length===0,tt+' '+p.errs.join());await p.browserContext().close()}
// M. Setting "Lanjut otomatis" OFF -> tidak lanjut
{const p=await fresh({ls:{autoresume:'0'}});await play(p);await p.evaluate(()=>window.__hide(true));await sleep(100);await sysPause(p);await sleep(200);await p.evaluate(()=>window.__hide(false));await sleep(1500);
 const e=await el(p);ok('M. Setting auto-resume OFF dihormati',e&&e.paused,JSON.stringify(e));await p.browserContext().close()}
// N. Tombol play (pp) saat status interupsi: tidak malah pause
{const p=await fresh({as:true});await play(p);await p.click('#mo');await sleep(200);
 await p.evaluate(()=>{navigator.audioSession.state='interrupted';navigator.audioSession.dispatchEvent(new Event('statechange'))});await sysPause(p);await sleep(300);
 await p.click('#pp');await sleep(800);const e=await el(p);ok('N. Tap play di app setelah interupsi -> lagu jalan',e&&!e.paused,JSON.stringify(e));await p.browserContext().close()}
// O. Restore sesi: satu lagu di antrean tersimpan sudah dihapus -> sesi tetap dipulihkan
{const p=await fresh();await play(p);await sleep(500);
 await p.evaluate(async()=>{const o=indexedDB.open('sonora');await new Promise(r=>o.onsuccess=r);const db=o.result;const t=db.transaction('kv','readwrite');const g=t.objectStore('kv').get('last');await new Promise(r=>g.onsuccess=r);const v=g.result;v.ids=[...v.ids.slice(0,1),'id-hantu',...v.ids.slice(1)];if(v.i>=1)v.i++;t.objectStore('kv').put(v,'last');await new Promise(r=>t.oncomplete=r);db.close()});
 await p.reload({waitUntil:'networkidle0'});await sleep(800);
 ok('O. Restore sesi walau ada id lagu yang sudah dihapus',!(await p.$eval('#mini',e=>e.hidden)),'mini player tidak muncul');await p.browserContext().close()}
// P. Hapus library saat lagu main: lock screen/engine bersih
{const p=await fresh();await play(p);
 await p.click('#nav button[data-n=set]');await sleep(200);await p.click('[data-s=wipe]');await sleep(200);
 await p.evaluate(()=>[...document.querySelectorAll('#dlg button')].find(b=>/Ya/.test(b.textContent)).click());await sleep(600);
 const r=await p.evaluate(()=>({md:navigator.mediaSession.metadata,st:navigator.mediaSession.playbackState,pl:window.__a.some(a=>a.src&&!a.paused)}));
 ok('P. Wipe: metadata lock screen kosong & audio berhenti',r.md===null&&!r.pl&&p.errs.length===0,JSON.stringify(r)+p.errs.join());await p.browserContext().close()}

await browser.close();srv.close();const bad=res.filter(x=>!x).length;console.log(`\n${res.length-bad}/${res.length} PASS, ${bad} FAIL`);process.exit(bad?1:0);
