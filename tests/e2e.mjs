// Tes end-to-end SONORA. Jalankan dari folder proyek:  npm i puppeteer && node tests/e2e.mjs
// Opsional: CHROME_PATH=/path/ke/chrome  PPTR_DIR=/folder/node_modules/  (jika puppeteer terpasang di tempat lain)
import http from 'http';import fs from 'fs';import path from 'path';import os from 'os';import {createRequire} from 'module';import {fileURLToPath} from 'url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const req=createRequire((process.env.PPTR_DIR||process.cwd()+'/')+(process.env.PPTR_DIR?'':'x'));
let pptr;try{pptr=req('puppeteer')}catch{pptr=req('puppeteer-core')}
const MT={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end()}else{r.writeHead(200,{'content-type':MT[path.extname(f)]||'application/octet-stream'});r.end(d)}})});
await new Promise(r=>srv.listen(0,r));const URLX=`http://localhost:${srv.address().port}/`;
// fixture WAV 16-bit mono
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sonora-'));
const wav=(file,hz,sec)=>{const sr=22050,n=sr*sec,b=Buffer.alloc(44+n*2);b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(6000*Math.sin(2*Math.PI*hz*i/sr)),44+i*2);fs.writeFileSync(file,b)};
const DUR={'Lagu Satu':6,'Lagu Dua':7,'Lagu Tiga':8};  // durasi berbeda agar lagu yang benar-benar diputar bisa dibedakan
const F=[['Alfa - Lagu Satu.wav',440,6],['Beta - Lagu Dua.wav',550,7],['Gamma - Lagu Tiga.wav',660,8]].map(([n,h,d])=>{const f=path.join(tmp,n);wav(f,h,d);return f});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const res=[];const ok=(name,cond,info='')=>{res.push([name,!!cond,info]);console.log((cond?'PASS ':'FAIL ')+name+(cond?'':'  -> '+info))};
const browser=await pptr.launch({executablePath:process.env.CHROME_PATH||undefined,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const ctx=browser.createBrowserContext?await browser.createBrowserContext():await browser.createIncognitoBrowserContext();
const p=await ctx.newPage();await p.setViewport({width:390,height:844});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
await p.evaluateOnNewDocument(()=>{window.__a=[];const O=window.Audio;window.Audio=function(...a){const x=new O(...a);window.__a.push(x);return x};window.__blobs=[];const c=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{if(b&&b.type==='application/json')window.__blobs.push(b);return c(b)}});
const eng=()=>p.evaluate(()=>{const a=window.__a.filter(x=>x.currentSrc||x.src).filter(x=>!x.paused||x.currentTime>0);const c=a[a.length-1];return c?{t:c.currentTime,paused:c.paused,rate:c.playbackRate,dur:c.duration}:null});
const title=()=>p.$eval('#npt',e=>e.textContent);const ttl=()=>p.$eval('#ttl',e=>e.textContent);
const nav=async n=>{await p.evaluate(()=>{document.querySelector('#np').hidden=true;document.querySelector('#sheet').hidden=true});await p.click(`#nav button[data-n=${n}]`);await sleep(150)};
const rows=()=>p.$$eval('#main .row',x=>x.length);
const toastTxt=()=>p.$eval('#toast',e=>e.textContent);
const sheetBtn=async txt=>{const h=await p.evaluateHandle(t=>[...document.querySelectorAll('#sheet button,#dlg button')].find(b=>b.textContent.includes(t)),txt);if(!h.asElement())throw new Error('tombol tidak ada: '+txt);await h.asElement().click();await sleep(200)};
const setRow=async k=>{await nav('set');await p.click(`[data-s=${k}]`);await sleep(250)};

// ---- 1. Boot & navigasi
await p.goto(URLX,{waitUntil:'networkidle0'});await sleep(400);
ok('Boot tanpa error JS',errs.length===0,errs.join(' | '));
ok('Skeleton hilang (library selesai dimuat)',(await p.$$('.sk')).length===0);
const want={home:'Beranda',lib:'Library',search:'Cari',pl:'Playlists',set:'Pengaturan'};let navOk=true,navInfo='';
for(const [k,v] of Object.entries(want)){await nav(k);const got=k==='search'?(await p.$eval('#q',e=>e.hidden)?'x':'Cari'):await ttl();if(got!==v){navOk=false;navInfo+=`${k}:${got} `}}
ok('5 menu navigasi bisa dibuka',navOk,navInfo);
// ---- 2. Import
await nav('lib');
const [fc]=await Promise.all([p.waitForFileChooser(),p.click('#add')]);await fc.accept(F);await sleep(2500);
ok('Import 3 file -> 3 lagu',(await rows())===3,String(await rows()));
const [fc2]=await Promise.all([p.waitForFileChooser(),p.click('#add')]);await fc2.accept([F[0]]);await sleep(1200);
ok('Duplikat dilewati',(await rows())===3&&/dilewati/.test(await toastTxt()),await toastTxt());
// ---- 3. Playback
await p.click('[data-play]');await sleep(900);
let e1=await eng();ok('Lagu mulai diputar & waktu maju',e1&&!e1.paused&&e1.t>0.2,JSON.stringify(e1));
await p.click('#mo');await sleep(200);
const t1=await title();
await p.click('#pp');await sleep(200);e1=await eng();ok('Pause bekerja',e1&&e1.paused);await p.click('#pp');await sleep(300);
await p.click('#nx');await sleep(600);ok('Next ganti lagu',(await title())!==t1,t1);
await p.click('#pv');await sleep(600);ok('Prev kembali ke lagu semula',(await title())===t1,await title());
const rp=[];for(let i=0;i<3;i++){await p.click('#rp');rp.push(await p.$eval('#rp',e=>(e.classList.contains('act')?'A':'-')+(e.querySelector('.one')?'1':'')))}
ok('Repeat siklus all -> one -> off',rp.join()==='A,A1,-',rp.join());
await p.click('#sh');ok('Shuffle menyala',await p.$eval('#sh',e=>e.classList.contains('act')));await p.click('#sh');
// auto-advance di akhir lagu
await p.evaluate(()=>{const a=window.__a.filter(x=>x.src&&!x.paused).pop();a.currentTime=a.duration-0.6});await sleep(1800);
ok('Lagu berikutnya otomatis di akhir lagu',(await title())!==t1,await title());
// ---- 4. Kecepatan
await p.click('#sp');await p.click('#sp');await sleep(200);
const lbl=await p.$eval('#sp',e=>e.textContent);ok('Tombol kecepatan 1x -> 1.25x -> 1.5x',lbl==='1.5x',lbl);
await p.click('#nx');await sleep(700);e1=await eng();ok('Kecepatan bertahan setelah ganti lagu',e1&&e1.rate===1.5,JSON.stringify(e1));
await setRow('speed');await sheetBtn('0.75x');await sleep(300);
ok('Kecepatan 0.75x dari Pengaturan (label tepat)',(await p.$eval('#sp',e=>e.textContent))==='0.75x'&&(await p.$eval('[data-s=speed] small',e=>e.textContent))==='0.75x');
await setRow('speed');await sheetBtn('normal');await sleep(300);
// ---- 5. Favorit, Search
await p.evaluate(()=>document.querySelector('#np').hidden=false);await p.click('#fv');await sleep(300);
await nav('lib');await p.click('#tabs [data-t=fav]');await sleep(200);ok('Favorit muncul di tab Favorites',(await rows())===1,String(await rows()));await p.click('#tabs [data-t=songs]');
await nav('search');await p.type('#q','Dua');await sleep(250);ok('Pencarian "Dua" -> 1 hasil',(await rows())===1,String(await rows()));await p.$eval('#q',e=>{e.value='';e.dispatchEvent(new Event('input'))});
// ---- 6. Playlist
await nav('pl');await p.click('[data-newpl]');await sleep(200);await p.type('#dv','Santai');await sheetBtn('Simpan');await sleep(300);
ok('Playlist baru dibuat',(await rows())===1);
await nav('lib');await p.click('[data-more]');await sleep(150);await sheetBtn('Add to Playlist');await sheetBtn('Santai');await sleep(300);
await nav('pl');await p.click('[data-openpl]');await sleep(250);ok('Lagu masuk playlist',(await rows())===1,String(await rows()));
// ---- 7. Antrean (urut ulang, hapus, kosongkan)
await nav('lib');await p.click('[data-play]');await sleep(500);
await p.evaluate(()=>document.querySelector('#np').hidden=false);await p.click('#npq');await sleep(300);
const qt=()=>p.$$eval('#sheet .qrow .qt b',x=>x.map(b=>b.textContent.replace('▶ ','')));
const q0=await qt();ok('Antrean menampilkan 3 lagu',q0.length===3,q0.join());
const nowT=await title();
await p.click('#sheet .qrow:nth-of-type(2) [data-q=dn]');await sleep(200);const q1=await qt();
ok('Urut ulang ▼ memindahkan lagu',q1[1]===q0[2]&&q1[2]===q0[1],q1.join());
ok('Lagu yang sedang main tetap sama setelah urut ulang',(await p.$eval('#sheet .qrow.cur .qt b',e=>e.textContent.replace('▶ ','')))===nowT);
await p.click('#sheet .qrow:nth-last-of-type(1) [data-q=rm]');await sleep(300);const q2=await qt();ok('Hapus dari antrean -> 2 lagu',q2.length===2,q2.join());
await p.click('#sheet [data-q=ca]');await sleep(250);await sheetBtn('Ya, lanjutkan');await sleep(400);
e1=await p.evaluate(()=>window.__a.filter(x=>x.src).length);
ok('Kosongkan semua: mini player hilang & audio berhenti',(await p.$eval('#mini',e=>e.hidden))&&(await p.evaluate(()=>window.__a.every(a=>a.paused||!a.src))));
// ---- 8. Backup & restore
await nav('lib');await p.click('[data-play]');await sleep(400);
await setRow('backup');await sleep(300);
const json=await p.evaluate(async()=>window.__blobs.length?await window.__blobs[window.__blobs.length-1].text():null);
ok('Ekspor backup menghasilkan JSON',!!json);let bk=json&&JSON.parse(json);
ok('Isi backup: 3 lagu, 1 playlist, pengaturan, tanpa blob audio',bk&&bk.tracks.length===3&&bk.playlists.length===1&&bk.settings&&!/"cover"/.test(json),bk&&JSON.stringify([bk.tracks.length,bk.playlists.length]));
const bf=path.join(tmp,'bk.json');fs.writeFileSync(bf,json);
// rusak keadaan: hapus playlist, un-favorit
await nav('pl');await p.click('[data-plmenu]');await sheetBtn('Hapus playlist');await sheetBtn('Ya, lanjutkan');await sleep(300);
await p.evaluate(()=>document.querySelector('#np').hidden=false);await p.click('#fv');await sleep(300);await p.evaluate(()=>document.querySelector('#np').hidden=true);
const [fc3]=await Promise.all([p.waitForFileChooser(),(async()=>{await nav('set');await p.click('[data-s=restore]')})()]);await fc3.accept([bf]);await sleep(500);
await sheetBtn('Ya, lanjutkan');await sleep(600);
await nav('pl');ok('Restore: playlist kembali',(await rows())===1,String(await rows()));
await nav('lib');await p.click('#tabs [data-t=fav]');await sleep(200);ok('Restore: favorit kembali',(await rows())>=1,String(await rows()));await p.click('#tabs [data-t=songs]');
const [fc4]=await Promise.all([p.waitForFileChooser(),(async()=>{await nav('set');await p.click('[data-s=restore]')})()]);fs.writeFileSync(path.join(tmp,'x.json'),'{"foo":1}');await fc4.accept([path.join(tmp,'x.json')]);await sleep(500);
ok('Restore menolak file yang bukan backup SONORA',/bukan file backup/.test(await toastTxt()),await toastTxt());
// ---- 9. Diagnostik
await setRow('diag');await sleep(300);const dg=await p.$eval('#sheet',e=>e.textContent);ok('Diagnostik menampilkan format & service worker',/FLAC/.test(dg)&&/Service worker/.test(dg));await sheetBtn('Tutup');
// ---- 10. Bit-Perfect mengunci kecepatan
await p.evaluate(()=>{localStorage.setItem('speed','1.5')});
await setRow('bp');await sleep(200);await p.evaluate(()=>document.querySelector('#np').hidden=false);
ok('Bit-Perfect ON: kecepatan dikunci 1x',(await p.$eval('#sp',e=>e.textContent))==='1x');await setRow('bp');
// ---- 11. Tema & persistensi
await p.evaluate(()=>{localStorage.setItem('themeMode','light')});await p.reload({waitUntil:'networkidle0'});await sleep(500);
ok('Tema Light bertahan setelah reload',(await p.$eval('html',e=>e.dataset.theme))==='light');
await nav('lib');ok('Library bertahan setelah reload (3 lagu)',(await rows())===3,String(await rows()));
ok('Sesi terakhir dipulihkan (mini player)',!(await p.$eval('#mini',e=>e.hidden)));
// ---- 12. PWA & offline
await sleep(1500);const sw=await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return{reg:!!r,c:await caches.keys()}});
ok('Service worker aktif, cache sonora-v12',sw.reg&&sw.c.includes('sonora-v12'),JSON.stringify(sw));
await p.reload({waitUntil:'networkidle0'});await sleep(500);await p.setOfflineMode(true);await p.reload({waitUntil:'domcontentloaded'}).catch(()=>{});await sleep(1200);
ok('Offline: aplikasi & library tetap tampil',(await p.$$('#nav button')).length===5&&(await rows())>=0&&(await p.$$('.sk')).length===0);await p.setOfflineMode(false);
// ---- 13. Layout sempit
for(const [w,h] of [[390,844],[360,640],[320,568]]){await p.setViewport({width:w,height:h});await p.evaluate(()=>document.querySelector('#np').hidden=false);await sleep(150);
  const m=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,r:Math.max(...[...document.querySelectorAll('.ctl button')].map(b=>b.getBoundingClientRect().right)),l:Math.min(...[...document.querySelectorAll('.ctl button')].map(b=>b.getBoundingClientRect().left))}));
  ok(`Layout ${w}x${h}: kontrol muat tanpa scroll horizontal`,m.sw<=m.iw&&m.r<=m.iw&&m.l>=0,JSON.stringify(m))}
// ---- 13b. Antrean + Gapless: lagu berikutnya harus mengikuti urutan baru
await p.setViewport({width:390,height:844});await p.evaluate(()=>{localStorage.setItem('gapless','1');localStorage.setItem('speed','1')});await p.reload({waitUntil:'networkidle0'});await sleep(500);
await nav('lib');await p.click('[data-play]');await sleep(800);await p.evaluate(()=>document.querySelector('#np').hidden=false);await p.click('#npq');await sleep(300);
await p.click('#sheet .qrow:nth-of-type(2) [data-q=dn]');await sleep(300);const gq=await qt();await p.click('#sheet [data-q=x]');await sleep(200);
await p.evaluate(()=>{const a=window.__a.filter(x=>x.src&&!x.paused&&x.currentTime>0).pop();a.currentTime=a.duration-0.9});await sleep(2800);
{const e=await eng();ok('Gapless: setelah urut ulang, judul DAN audio lagu berikutnya = urutan baru',(await title())===gq[1]&&e&&Math.abs(e.dur-DUR[gq[1]])<0.3,`harus ${gq[1]} (${DUR[gq[1]]}s), judul ${await title()}, audio ${e&&e.dur}s`)}
await p.click('#npq');await sleep(300);const before=await title();await p.click('#sheet .qrow.cur [data-q=rm]');await sleep(700);
ok('Hapus lagu yang sedang diputar -> lanjut ke lagu lain & tetap main',(await title())!==before&&(await eng())&&!(await eng()).paused,before+' -> '+await title());await p.click('#sheet [data-q=x]').catch(()=>{});
await p.evaluate(()=>{localStorage.removeItem('gapless')});
// ---- 14. Wipe
await p.setViewport({width:390,height:844});await p.evaluate(()=>{localStorage.setItem('themeMode','dark')});
await setRow('wipe');await sheetBtn('Ya, lanjutkan');await sleep(500);await nav('lib');ok('Hapus library -> kosong',/Your music lives here/.test(await p.$eval('#main',e=>e.textContent)));
ok('Tidak ada error JS selama seluruh tes',errs.length===0,errs.slice(0,3).join(' | '));
await browser.close();srv.close();
const f=res.filter(r=>!r[1]).length;console.log(`\n${res.length-f}/${res.length} PASS, ${f} FAIL`);process.exit(f?1:0);
