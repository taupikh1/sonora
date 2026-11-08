import * as S from './storage.js';
import * as E from './audio-engine.js';
import * as D from './dsp.js';
import {readInfo,quality,short} from './metadata.js';
import {esc,fmt,probe,parseName,dur,hue,ext} from './utils.js';
const {st,audio}=E,$=s=>document.querySelector(s);
let nav='home',grp=null,loaded=false,tab='songs',q='',plOpen=null,pls=[],seeking=false,timer=null,lastSave=0;
const toast=m=>{const t=$('#toast');t.textContent=m;t.dataset.k=/^(Gagal|Tidak)/.test(m)?'err':'';t.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),4000)};
const urls=new Map(),curl=t=>t.cover?(urls.get(t.id)||urls.set(t.id,URL.createObjectURL(t.cover)).get(t.id)):null;st.art=curl;
const cover=t=>L('art')!=='0'&&curl(t)?`<img class="cv" src="${curl(t)}" alt="">`:`<div class="cv" style="--h:${hue(t.title+t.artist)}">${esc((t.title[0]||'♪').toUpperCase())}</div>`;
const row=t=>`<div class="row"><button class="pl" data-play="${t.id}">${cover(t)}<span><b>${esc(t.title)}</b><small>${esc(t.artist)}${t.duration?' · '+fmt(t.duration):''}${short(t.info)?' · '+short(t.info):''}</small></span></button><button data-more="${t.id}" aria-label="Menu untuk ${esc(t.title)}">⋯</button></div>`;
const TT={home:'Beranda',lib:'Library',search:'Cari',pl:'Playlists',set:'Pengaturan'};
const sorted=()=>{const o=L('sort')||'added',a=[...st.lib.values()];return a.sort(o==='title'?(x,y)=>x.title.localeCompare(y.title):o==='artist'?(x,y)=>x.artist.localeCompare(y.artist)||x.title.localeCompare(y.title):(x,y)=>y.added-x.added)};
const visible=()=>{let a=sorted();
  if(plOpen){const p=pls.find(x=>x.id===plOpen);a=p?p.ids.map(i=>st.lib.get(i)).filter(Boolean):[]}
  else if(grp)a=a.filter(t=>(t[grp.k]||'')===grp.v);
  else if(nav==='lib'&&tab==='fav')a=a.filter(t=>t.fav);
  else if(nav==='lib'&&tab==='recent')a=a.filter(t=>t.played).sort((x,y)=>y.played-x.played);
  const k=nav==='search'?q.toLowerCase():'';return nav==='search'&&!k?[]:k?a.filter(t=>[t.title,t.artist,t.album].join(' ').toLowerCase().includes(k)):a};
const addBtn='<button class="btn pri" data-add>Add Your First Song</button>';
const emptyAll=`<div class="empty"><h2>Your music lives here.</h2><p>Tambahkan file musik dari perangkat. Semua tetap tersimpan lokal.</p>${addBtn}</div>`;
const skel='<div class="sk"></div>'.repeat(6);
const sec=(t,a)=>`<h3 class="sec">${t}</h3>`+a.map(row).join('');
const groups=k=>{const m=new Map();for(const t of sorted()){const v=t[k]||'';m.set(v,(m.get(v)||0)+1)}
  return m.size?[...m].map(([v,n])=>`<div class="row"><button class="pl" data-grp="${k}" data-v="${esc(v)}"><div class="cv" style="--h:${hue(v||k)}">${esc((v[0]||'?').toUpperCase())}</div><span><b>${esc(v||(k==='album'?'Album tidak diketahui':'Unknown Artist'))}</b><small>${n} lagu</small></span></button></div>`).join(''):emptyAll};
const homeHtml=()=>{const all=[...st.lib.values()];if(!all.length)return emptyAll;const c=st.cur(),rec=all.filter(t=>t.played).sort((x,y)=>y.played-x.played).slice(0,5),fav=all.filter(t=>t.fav).slice(0,5);
  return (c?sec('Lanjutkan',[c]):'')+(rec.length?sec('Terakhir diputar',rec):'')+(fav.length?sec('Favorit',fav):'')+`<h3 class="sec">Library</h3><div class="stats"><div><b>${all.length}</b><small>lagu</small></div><div><b>${new Set(all.map(t=>t.artist)).size}</b><small>artis</small></div><div><b>${pls.length}</b><small>playlist</small></div></div>`+(rec.length||fav.length||c?'':'<p class="empty">Putar sebuah lagu dari Library untuk mulai.</p>')};
let vk='';
function render(){const m=$('#main'),pn=plOpen&&pls.find(x=>x.id===plOpen);document.body.dataset.nav=nav;
  document.querySelectorAll('#nav button').forEach(b=>{const on=b.dataset.n===nav;b.classList.toggle('on',on);on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current')});
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
  $('#ttl').textContent=grp?(grp.v||'Tanpa nama'):pn?pn.name:TT[nav];$('#ttl').hidden=nav==='search';$('#q').hidden=nav!=='search';$('#tabs').hidden=nav!=='lib'||!!grp;$('#add').hidden=nav==='set';
  let h='';
  if(!loaded)h=skel;
  else if(nav==='set')h=settingsHtml();
  else if(nav==='home')h=homeHtml();
  else if(nav==='pl'&&!plOpen)h=`<button class="btn" data-newpl>+ Playlist baru</button>`+(pls.map(p=>`<div class="row"><button class="pl" data-openpl="${p.id}"><div class="cv" style="--h:${hue(p.name)}">♫</div><span><b>${esc(p.name)}</b><small>${p.ids.length} lagu</small></span></button><button data-plmenu="${p.id}" aria-label="Menu playlist ${esc(p.name)}">⋯</button></div>`).join('')||'<div class="empty"><h2>Belum ada playlist</h2><p>Kelompokkan lagu favoritmu.</p></div>');
  else if(nav==='lib'&&!grp&&(tab==='albums'||tab==='artists'))h=groups(tab==='albums'?'album':'artist');
  else{const v=visible();
    if(pn||grp)h=`<div class="bar"><button class="btn" data-back>← Kembali</button><button class="btn pri" data-playall>Putar semua</button></div>`;
    h+=v.length?v.map(row).join(''):nav==='search'?`<p class="empty">${q?'Tidak ada hasil untuk “'+esc(q)+'”.':'Ketik judul, artis, atau album.'}</p>`:st.lib.size?'<p class="empty">Tidak ada lagu di sini.</p>':emptyAll}
  m.innerHTML=h;const k=[nav,tab,plOpen,grp&&grp.v,loaded].join();if(k!==vk){vk=k;m.classList.remove('in');void m.offsetWidth;m.classList.add('in')}}

const sheet=(title,items)=>{const s=$('#sheet');s.hidden=false;s.innerHTML=`<div class="card"><h3>${esc(title)}</h3>${items.map((x,i)=>`<button data-i="${i}">${esc(x[0])}</button>`).join('')}<button data-i="x">Tutup</button></div>`;
  s.onclick=async e=>{const b=e.target.closest('button');if(e.target===s||b?.dataset.i==='x'){s.hidden=true;return}if(b){s.hidden=true;await items[+b.dataset.i][1]()}}};
const thumb=async b=>{try{const m=await createImageBitmap(b),k=Math.min(1,512/Math.max(m.width,m.height));if(k>=1&&b.size<15e4){m.close?.();return b}const c=document.createElement('canvas');c.width=Math.round(m.width*k);c.height=Math.round(m.height*k);c.getContext('2d').drawImage(m,0,0,c.width,c.height);m.close?.();return await new Promise(r=>c.toBlob(x=>r(x||b),'image/jpeg',.85))}catch{return b}};
async function ensureInfo(t){const c=st.lib.get(t.id)||t;if(c.info?.v===3)return c.info;const b=await S.get('blobs',c.id);if(!b)return null;const i=await readInfo(b),g=i.tags||{};
  if(i.cover){c.cover=await thumb(i.cover);delete i.cover}if(g.title)c.title=g.title;if(g.artist)c.artist=g.artist;if(g.album)c.album=g.album;if(c.ov)Object.assign(c,c.ov);if('ovCover'in c)c.cover=c.ovCover||undefined;i.v=3;c.info=i;await S.put('tracks',c);st.lib.set(c.id,c);return i}
const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const bpOn=()=>localStorage.getItem('bp')==='1';
const bpStatus=()=>!bpOn()?'OFF (normal playback)':ios?'BIT-PERFECT UNAVAILABLE (iOS)':D.active()?'BIT-PERFECT UNAVAILABLE (Web Audio aktif)':'DIRECT PLAYBACK (output hardware tidak bisa diverifikasi)';
const NA='Not Available on This Platform',U='Tidak terbaca dari file';
const infoSheet=(title,rows,note)=>{const s=$('#sheet');s.hidden=false;s.innerHTML=`<div class="card"><h3>${esc(title)}</h3>${rows.map(r=>r.length<2?`<h4>${esc(r[0])}</h4>`:`<div class="kv"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}<p class="note">${esc(note||'')}</p><button data-i="x">Tutup</button></div>`;s.onclick=e=>{if(e.target===s||e.target.dataset.i==='x')s.hidden=true}};
const srcRows=(t,i)=>{const L=i.lossless,v=(x,u)=>x==null?U:x+u;const g=i.tags||{};return[['File name',t.fname||U],['File extension','.'+t.format],['Codec',i.codec||U],['Container',i.container||U],['Encoding',L===true?'Lossless':L===false?'Lossy':U],
  ['Sample rate',i.sr?i.sr.toLocaleString('en-US')+' Hz':U],['Bit depth',i.bits?i.bits+'-bit':L===false?'Tidak berlaku (lossy)':U],
  ['Bitrate',i.br?Math.round(i.br/1000)+' kbps'+(i.vbr===true?' (VBR, rata-rata)':i.vbr===false?' (CBR)':i.codec==='PCM'?' (konstan)':' (rata-rata file)'):U],
  ['Channels',i.ch?({1:'Mono',2:'Stereo'}[i.ch]||i.ch+' channel'):U],['Duration',i.dur?fmt(i.dur):U],['File size',(t.size/1048576).toFixed(1)+' MB'],['Album artist',g.albumArtist||'-'],['Album',t.album||g.album||'-'],['Track',g.track||'-'],['Disc',g.disc||'-'],['Genre',t.genre||g.genre||'-'],['Year',t.year||g.year||'-'],['Cover art',t.cover?'Ada':'Tidak ada'],['Quality',quality(i)||U],['ReplayGain (tag)',rgText(g.rg)]]};
async function audioInfo(t){if(!t)return;const i=await ensureInfo(t)||{};
  infoSheet(t.title,[['SOURCE AUDIO INFORMATION'],...srcRows(t,i),['PLAYBACK OUTPUT INFORMATION'],['Playback engine','HTMLAudioElement'],['Output sample rate',NA],['Playback route',NA],['Bit-perfect status',bpStatus()]],
    'Data dibaca dari header file, bukan dari ekstensi. Aplikasi tidak bisa membuktikan apakah file lossless berasal dari konversi file lossy.')}
function outputStatus(){const t=st.cur(),i=t?.info||{};
  infoSheet('Audio Output Status',[['SOURCE AUDIO INFORMATION'],['Sample rate',i.sr?i.sr.toLocaleString('en-US')+' Hz':t?U:'-'],['Bit depth',i.bits?i.bits+'-bit':t?U:'-'],['Bitrate',i.br?Math.round(i.br/1000)+' kbps':t?U:'-'],
    ['PLAYBACK OUTPUT INFORMATION'],['Playback engine','HTMLAudioElement (tanpa Web Audio)'],['Output sample rate',NA],['Playback route',NA],['Audio processing',D.active()?'Web Audio aktif':'Tidak ada (jalur langsung)'],['EQ',D.active()&&L('dsp_eq')==='1'?'ON ('+(L('eq_name')||'Flat')+')':'OFF'],['ReplayGain',D.active()&&(L('dsp_rg')||'off')!=='off'?L('dsp_rg')+' ('+rgGain(t).toFixed(1)+' dB)':'OFF'],['Crossfade',xfText()],['Gapless',gaplessText()],['Transisi lagu terakhir',gapText()],['Visualizer',D.active()&&L('viz')==='1'?'ON (Web Audio)':'OFF'],['Bit-perfect status',bpStatus()]],
    ios?'iOS/Safari memproses audio lewat mixer sistem dan bisa me-resample; bit-perfect tidak bisa dijamin atau diverifikasi dari browser.':'Browser/OS tetap bisa me-resample atau mencampur audio di luar kendali aplikasi, sehingga output hardware tidak bisa diverifikasi.')}
const L=k=>localStorage.getItem(k),dspOn=()=>!bpOn()&&(L('dsp_eq')==='1'||L('viz')==='1'||(L('dsp_rg')||'off')!=='off');
const rgGain=t=>{const m=L('dsp_rg')||'off',r=t?.info?.tags?.rg;if(m==='off'||!r)return 0;const g=m==='album'?(r.album??r.track):r.track;return g==null?0:Math.min(g,r.peak>0?-20*Math.log10(r.peak):0)};
const applyDsp=()=>D.apply({eq:L('dsp_eq')==='1',bands:eqBands(),pre:+L('eq_pre')||0,gain:rgGain(st.cur())});
const sync=()=>{if(dspOn()!==D.active()){toast('Memuat ulang untuk mengganti jalur audio...');setTimeout(()=>location.reload(),1200)}else applyDsp()};
const refreshCfg=()=>Object.assign(E.cfg,{xf:bpOn()||ios||D.active()?0:+L('xf')||0,gapless:L('gapless')==='1',allow:!ios&&!D.active()});
const xfText=()=>ios?'Tidak tersedia di iOS':bpOn()?'Nonaktif (Bit-Perfect)':D.active()?'Nonaktif (Web Audio aktif)':+L('xf')?L('xf')+' detik':'OFF';
const gaplessText=()=>L('gapless')==='1'?(E.cfg.allow?'ON (2 elemen)':'ON (muat-cepat)')+', '+gapText():'OFF';
let hid=null;document.addEventListener('visibilitychange',()=>{if(!D.active())return;if(document.hidden)hid={play:!audio.paused};
  else{D.resume();if(ios&&hid?.play)setTimeout(()=>{if(D.state()!=='running'){['dsp_eq','dsp_rg'].forEach(k=>localStorage.setItem(k,k==='dsp_eq'?'0':'off'));localStorage.setItem('viz','0');localStorage.setItem('dsp_note','1');location.reload()}},800)}});
const savePl=async p=>{await S.put('playlists',p);pls=await S.all('playlists');render()};
const saveTrack=async t=>{await S.put('tracks',t);st.lib.set(t.id,t);render();drawTrack()};
function addToPl(t){sheet('Tambah ke playlist',[['+ Playlist baru',async()=>{const n=await ask('Nama playlist');if(n?.trim())await savePl({id:crypto.randomUUID(),name:n.trim(),ids:[t.id]})}],...pls.map(p=>[p.name,()=>savePl({...p,ids:[...new Set([...p.ids,t.id])]})])])}
async function removeTrack(t){if(!await ok(`Hapus "${t.title}" dari library?`))return;
  await S.del('tracks',t.id);await S.del('blobs',t.id);st.lib.delete(t.id);
  for(const p of pls)if(p.ids.includes(t.id))await S.put('playlists',{...p,ids:p.ids.filter(i=>i!==t.id)});
  pls=await S.all('playlists');const cur=st.queue[st.i];st.queue=st.queue.filter(i=>i!==t.id);st.i=st.queue.indexOf(cur);
  if(cur===t.id){audio.pause();audio.removeAttribute('src');$('#mini').hidden=true;$('#np').hidden=true}render()}
const more=t=>sheet(t.title,[['Play Next',()=>E.playNext(t.id)],['Add to Queue',()=>E.addQueue(t.id)],['Add to Playlist',()=>addToPl(t)],[t.fav?'Hapus dari Favorites':'Add to Favorites',()=>saveTrack({...t,fav:!t.fav})],['Audio Information',()=>audioInfo(t)],['Edit Metadata',()=>editMeta(t)],['Remove from Library',()=>removeTrack(t)]]);
$('#main').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.play){const v=visible();E.setQueue(v.map(t=>t.id),v.findIndex(t=>t.id===d.play))}
  else if(d.more)more(st.lib.get(d.more));
  else if('add' in d)$('#file').click();
  else if('newpl' in d){const n=await ask('Nama playlist');if(n?.trim())savePl({id:crypto.randomUUID(),name:n.trim(),ids:[]})}
  else if(d.openpl){plOpen=d.openpl;render()}
  else if('back' in d){plOpen=null;grp=null;render()}
  else if(d.grp){grp={k:d.grp,v:d.v};render();scrollTo(0,0)}
  else if(d.th){localStorage.setItem('themeMode',d.th);applyTheme();render()}
  else if(d.ac){localStorage.setItem('accent',d.ac);applyTheme();render()}
  else if(d.s){await SA[d.s]?.();render()}
  else if('playall' in d){const v=visible();if(v.length)E.setQueue(v.map(t=>t.id),0)}
  else if(d.plmenu){const p=pls.find(x=>x.id===d.plmenu);sheet(p.name,[['Ubah nama',async()=>{const n=await ask('Nama baru',p.name);if(n?.trim())await savePl({...p,name:n.trim()})}],['Hapus playlist',async()=>{if(await ok('Hapus playlist ini? Lagu tetap ada di library.')){await S.del('playlists',p.id);pls=await S.all('playlists');render()}}]])}};
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;plOpen=null;grp=null;render()});
$('#q').oninput=e=>{q=e.target.value.trim();render()};
$('#add').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{const bad=[];let n=0,dup=0;
  for(const f of e.target.files){const mime=probe(f);if(!mime){bad.push(f.name);continue}
    if([...st.lib.values()].some(x=>x.fname===f.name&&x.size===f.size)){dup++;continue}
    try{const d=await dur(f),id=crypto.randomUUID(),{title,artist}=parseName(f.name);
      await S.put('blobs',new Blob([f],{type:mime.split(';')[0]}),id);
      const t={id,title,artist,album:'',duration:d,fname:f.name,format:ext(f.name),size:f.size,added:Date.now(),fav:false};
      await S.put('tracks',t);st.lib.set(id,t);await ensureInfo(t);n++}catch(err){bad.push(f.name)}}
  e.target.value='';render();
  if(n||dup)toast(`${n} lagu ditambahkan${dup?`, ${dup} dilewati (sudah ada)`:''}.`);if(n)navigator.storage?.persist?.();
  if(bad.length)setTimeout(()=>toast(`Tidak bisa dibaca atau tidak didukung browser ini: ${bad.slice(0,3).join(', ')}${bad.length>3?` (+${bad.length-3})`:''}`),n?4200:0)};
const set=(s,v)=>$(s).textContent=v;
function drawTrack(){const t=st.cur();if(!t)return;$('#mini').hidden=false;$('#mc').innerHTML=cover(t);$('#npc').innerHTML=cover(t);
  set('#mt',t.title);set('#ma',t.artist);set('#npt',t.title);set('#npa',t.artist);$('#fv').innerHTML=svg(IC.heart,t.fav);$('#fv').classList.toggle('act',!!t.fav);$('#npi').innerHTML=t.info?.codec?`<span>${esc(npLine(t.info))}</span><span class="bd">${esc(npBadge(t.info))}</span>`:'';drawTime();drawState();applyDsp()}
function drawState(){markPlayed();const p=svg(audio.paused?IC.play:IC.pause,1);$('#pp').innerHTML=p;$('#mpp').innerHTML=p;$('#pp').dataset.s=audio.paused?'play':'pause';startViz();$('#np').classList.toggle('play',!audio.paused);
  $('#sh').classList.toggle('act',st.shuffle);$('#rp').classList.toggle('act',st.repeat!=='off');$('#rp').innerHTML=svg(IC.rep)+(st.repeat==='one'?'<b class="one">1</b>':'')}
function drawTime(){const d=audio.duration;if(!seeking&&isFinite(d)&&d)$('#seek').value=audio.currentTime/d*1000;if(!seeking)set('#cur',fmt(audio.currentTime));set('#tot',isFinite(d)?fmt(d):fmt(st.cur()?.duration||0))}
E.setOnChange(k=>{if(k==='track')drawTrack();else if(k==='state')drawState();else if(k==='time'){drawTime();if(Date.now()-lastSave>5000){lastSave=Date.now();S.put('kv',{ids:st.queue,i:st.i,pos:audio.currentTime},'last')}}
  else if(k==='error'){const t=st.cur();toast(t?`Gagal memutar "${t.title}" (${t.format}). File rusak atau format tidak didukung browser ini.`:'Gagal memutar lagu.')}});
$('#mo').onclick=()=>$('#np').hidden=false;$('#npb').onclick=()=>$('#np').hidden=true;
$('#pp').onclick=$('#mpp').onclick=E.toggle;$('#nx').onclick=$('#mnx').onclick=E.next;$('#pv').onclick=E.prev;
$('#sh').onclick=()=>{E.toggleShuffle();drawState()};$('#rp').onclick=()=>{E.cycleRepeat();drawState()};
$('#ninfo').onclick=()=>audioInfo(st.cur());
$('#fv').onclick=()=>{const t=st.cur();if(t)saveTrack({...t,fav:!t.fav})};
$('#seek').oninput=e=>{seeking=true;set('#cur',fmt(e.target.value/1000*(audio.duration||0)))};
$('#seek').onchange=e=>{if(isFinite(audio.duration))audio.currentTime=e.target.value/1000*audio.duration;seeking=false};
$('#npq').onclick=()=>{const up=st.queue.slice(st.i+1).map((id,k)=>[st.lib.get(id)?.title||'?',()=>E.playAt(st.i+1+k)]);
  sheet(up.length?'Berikutnya':'Antrean kosong',[...up,...(up.length?[['Kosongkan antrean',()=>{st.queue=st.queue.slice(0,st.i+1)}]]:[])])};
if(dspOn())D.init(E.raw());refreshCfg();if(L('dsp_note')){localStorage.removeItem('dsp_note');setTimeout(()=>toast('EQ/ReplayGain/Visualizer dimatikan otomatis: iOS menangguhkan Web Audio saat layar terkunci.'),900)}
audio.addEventListener('play',D.resume);
(async()=>{try{const ts=await S.all('tracks');st.lib=new Map(ts.map(t=>[t.id,t]));pls=await S.all('playlists');loaded=true;render();
  const l=await S.get('kv','last');if(L('resume')!=='0'&&l&&l.ids.every(i=>st.lib.has(i)))E.restore(l.ids,l.i,L('rempos')==='0'?0:l.pos);for(const t of[...st.lib.values()])if(t.info?.v!==3)await ensureInfo(t);render();drawTrack()}catch(e){loaded=true;render();toast('Penyimpanan lokal tidak tersedia (mode privat?).')}
  if('serviceWorker'in navigator){const had=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had)toast('SONORA diperbarui. Tutup dan buka lagi untuk memakai versi baru.')});navigator.serviceWorker.register('service-worker.js').catch(()=>{})}})();

// ===== Phase 8: tema, navigasi, pengaturan, dialog =====
const A=[['coral','#FF6F61'],['blue','#3D8BFF'],['purple','#9B6BFF'],['green','#2FC77A'],['orange','#FF9F2E']],W=(k,v)=>localStorage.setItem(k,v);
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.substr(i,2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
function applyTheme(){const m=L('themeMode')||L('theme')||'system',r=m==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):m,
  ac=L('accent')==='custom'&&/^#[0-9a-f]{6}$/i.test(L('accentCustom')||'')?L('accentCustom'):(A.find(a=>a[0]===L('accent'))||A[0])[1],d=document.documentElement;
  d.dataset.theme=r;d.style.setProperty('--ac',ac);d.style.setProperty('--on',lum(ac)>.18?'#101116':'#fff');d.dataset.motion=L('reduce')==='1'?'off':'';
  document.querySelector('meta[name=theme-color]').content={light:'#F5F5F7',amoled:'#000',dark:'#0E0F13'}[r]}
applyTheme();matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',()=>(L('themeMode')||'system')==='system'&&applyTheme());
document.addEventListener('input',e=>{if(e.target.id==='cc'){W('accent','custom');W('accentCustom',e.target.value);applyTheme()}});
document.addEventListener('change',e=>{if(e.target.id==='cc')render()});
function dlg(title,val){return new Promise(r=>{const d=$('#dlg');d.hidden=false;d.innerHTML=`<div class="dbox" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h3>${esc(title)}</h3>${val==null?'':`<input id="dv" value="${esc(val)}" maxlength="60" aria-label="${esc(title)}">`}<div class="dbt"><button data-r="0">Batal</button><button class="pri" data-r="1">${val==null?'Ya, lanjutkan':'Simpan'}</button></div></div>`;
  const i=$('#dv');(i||d.querySelector('.pri')).focus();const end=v=>{d.hidden=true;r(v)};
  d.onclick=e=>{const x=e.target.dataset.r;if(x==='0'||e.target===d)end(null);else if(x==='1')end(i?i.value:true)};d.onkeydown=e=>{if(e.key==='Escape')end(null);if(e.key==='Enter'&&i)end(i.value)}})}
const ask=(t,v='')=>dlg(t,v),ok=m=>dlg(m,null);
const npLine=i=>[i.codec,i.lossless&&i.bits&&i.sr?`${i.bits}-bit / ${+(i.sr/1000).toFixed(1)} kHz`:i.br?Math.round(i.br/1000)+' kbps':''].filter(Boolean).join(' · ');
const npBadge=i=>{const q=quality(i);return i.lossless===true?'LOSSLESS'+(q==='Hi-Res'?' · HI-RES':q==='CD Quality'?' · CD':''):i.lossless===false?'LOSSY':''};
let lastP;const markPlayed=()=>{const t=st.cur();if(!t||audio.paused||lastP===t.id)return;lastP=t.id;t.played=Date.now();S.put('tracks',t);if(nav==='home')render()};
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{nav=b.dataset.n;plOpen=null;grp=null;render();scrollTo(0,0);if(nav==='search')$('#q').focus();if(nav==='set')loadUsage()});
let usage='...';async function loadUsage(){const e=await navigator.storage?.estimate?.()||{},mb=x=>((x||0)/1048576).toFixed(0)+' MB';usage=e.quota?`${mb(e.usage)} / ${mb(e.quota)}`:'Tidak tersedia';if(nav==='set')render()}
const onoff=v=>v?'ON':'OFF',seg=(k,o,c)=>`<div class="seg" role="group">${o.map(([v,l])=>`<button data-${k}="${v}" aria-pressed="${c===v}">${l}</button>`).join('')}</div>`;
function settingsHtml(){const th=L('themeMode')||L('theme')||'system',ac=L('accent')||'coral',bp=bpOn(),rg=L('dsp_rg')||'off',cc=L('accentCustom')||'#ff6f61';
  const r=(k,l,v)=>`<button class="srow" data-s="${k}"><span>${l}</span><small>${esc(v)}</small></button>`,i=(l,v)=>`<div class="srow"><span>${l}</span><small>${esc(v)}</small></div>`,g=(t,x)=>`<section class="grp"><h3 class="sec">${t}</h3><div class="card2">${x}</div></section>`;
  return g('General',i('Language','Indonesia (satu-satunya tersedia)')+`<div class="srow col"><span>Theme</span>${seg('th',[['dark','Dark'],['light','Light'],['amoled','AMOLED'],['system','System']],th)}</div><div class="srow col"><span>Accent Color</span><div class="sw">${A.map(([n,c])=>`<button class="dot" data-ac="${n}" style="--c:${c}" aria-label="${n}" aria-pressed="${ac===n}"></button>`).join('')}<label class="dot cust" aria-label="Custom color"><input type="color" id="cc" value="${cc}"></label></div></div>`+r('reduce','Appearance: kurangi animasi',onoff(L('reduce')==='1')))
  +g('Playback',r('gapless','Gapless Playback',gaplessText())+r('xf','Crossfade',xfText())+r('resume','Resume Playback',onoff(L('resume')!=='0'))+r('rempos','Remember Last Position',onoff(L('rempos')!=='0'))+r('sleep','Sleep Timer',timer?'ON':'OFF'))
  +g('Audio',r('bp','Bit-Perfect Mode',onoff(bp))+r('eq','Equalizer 10-band',bp?'Nonaktif (Bit-Perfect)':onoff(L('dsp_eq')==='1')+' · '+(L('eq_name')||'Flat'))+r('rg','ReplayGain / Volume Normalization',bp?'Nonaktif (Bit-Perfect)':rg)+r('viz','Visualizer',bp?'Nonaktif (Bit-Perfect)':onoff(L('viz')==='1'))+r('vizm','Visualizer mode',L('viz_mode')==='wave'?'Waveform':'Spectrum')+r('ainfo','Audio Information','Lihat'))
  +g('Library',r('scan','Scan Music','Pilih file')+r('sort','Sort Order',{added:'Terbaru',title:'Judul',artist:'Artis'}[L('sort')||'added'])+r('art','Album Artwork',onoff(L('art')!=='0'))+r('meta','Metadata Management','Baca ulang tag · edit via ⋯'))
  +g('Storage',r('usage','IndexedDB Usage',usage)+r('persist','Penyimpanan persisten','Minta')+r('tmp','Clear Temporary Data','Bersihkan')+r('backup','Ekspor backup JSON','Unduh')+r('wipe','Hapus seluruh library','Hapus'))
  +g('About',i('App Version','SONORA 1.2')+i('Developer Information','Proyek pribadi SONORA')+i('Supported Formats','MP3, AAC, M4A, WAV, FLAC, OGG, OPUS, AIFF (tergantung browser)')+i('Privacy Information','Data lokal di perangkat ini, tanpa akun & telemetri'))}
const SA={reduce:()=>W('reduce',L('reduce')==='1'?'0':'1')||applyTheme(),
  gapless:()=>{W('gapless',L('gapless')==='1'?'0':'1');refreshCfg()},
  xf:()=>{if(ios||bpOn()||D.active())return toast(xfText());W('xf',{0:3,3:6,6:10,10:0}[+L('xf')||0]);refreshCfg()},
  resume:()=>W('resume',L('resume')==='0'?'1':'0'),rempos:()=>W('rempos',L('rempos')==='0'?'1':'0'),
  sleep:()=>sheet('Sleep Timer',[...[15,30,45,60].map(m=>[`${m} menit`,()=>{clearTimeout(timer);timer=setTimeout(()=>{audio.pause();timer=null;render()},m*6e4);toast(`Musik berhenti dalam ${m} menit (best-effort saat background).`);render()}]),['Matikan',()=>{clearTimeout(timer);timer=null;render()}]]),
  bp:()=>{W('bp',bpOn()?'0':'1');refreshCfg();if(dspOn()!==D.active())sync()},
  eq:()=>bpOn()?toast('Dinonaktifkan karena Bit-Perfect Mode aktif.'):eqSheet(),
  rg:()=>{if(bpOn())return toast('Dinonaktifkan karena Bit-Perfect Mode aktif.');W('dsp_rg',{off:'track',track:'album',album:'off'}[L('dsp_rg')||'off']);toast('ReplayGain memakai tag di file; lagu tanpa tag tidak diubah.');sync()},
  ainfo:outputStatus,scan:()=>$('#file').click(),
  sort:()=>W('sort',{added:'title',title:'artist',artist:'added'}[L('sort')||'added']),art:()=>W('art',L('art')==='0'?'1':'0'),
  meta:async()=>{toast('Membaca ulang tag...');for(const t of st.lib.values()){if(t.info)t.info.v=0;await ensureInfo(t)}toast('Metadata diperbarui.');drawTrack()},
  persist:async()=>toast(await navigator.storage?.persist?.()?'Penyimpanan persisten aktif.':'Browser tidak memberi penyimpanan persisten.'),
  tmp:async()=>{if(!await ok('Bersihkan data sementara (cache cover & posisi terakhir)? Library tetap aman.'))return;urls.forEach(u=>URL.revokeObjectURL(u));urls.clear();await S.del('kv','last');toast('Data sementara dibersihkan.');drawTrack()},
  backup:()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({tracks:[...st.lib.values()],playlists:pls})],{type:'application/json'}));a.download='sonora-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e4)},
  wipe:async()=>{if(!await ok('Hapus SEMUA lagu dan playlist dari browser ini? Tindakan ini tidak bisa dibatalkan.'))return;audio.pause();audio.removeAttribute('src');for(const s of['tracks','blobs','playlists','kv'])await S.clear(s);st.lib.clear();st.queue=[];st.i=-1;pls=[];$('#mini').hidden=true;$('#np').hidden=true;toast('Library dihapus.')}};
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!$('#dlg').hidden)return;if(!$('#sheet').hidden)$('#sheet').hidden=true;else if(!$('#np').hidden)$('#np').hidden=true});

// ===== Phase 10: ikon, EQ 10-band + preset/profil, ReplayGain info, gapless info, visualizer, editor metadata =====
const IC={play:'M8 5v14l11-7z',pause:'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',heart:'M12 20.5S3.5 15.4 3.5 9.2C3.5 6.4 5.6 4.5 8 4.5c1.6 0 3 .8 4 2.2 1-1.4 2.4-2.2 4-2.2 2.4 0 4.5 1.9 4.5 4.7 0 6.2-8.5 11.3-8.5 11.3z',rep:'M17 3l4 4-4 4M3 11V9.5A2.5 2.5 0 0 1 5.5 7H21M7 21l-4-4 4-4M21 13v1.5a2.5 2.5 0 0 1-2.5 2.5H3'};
const svg=(d,f)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="${f?'currentColor':'none'}" stroke="currentColor" stroke-width="${f?1.4:1.9}" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const gapText=()=>st.gap==null?'belum diukur':st.gap<0?`tumpang tindih ${-st.gap} ms`:`jeda ${st.gap} ms`;
const rgText=r=>!r||(r.track==null&&r.album==null)?'Tidak ada tag di file':[r.track!=null&&`Track ${r.track.toFixed(1)} dB`,r.album!=null&&`Album ${r.album.toFixed(1)} dB`,r.peak>0&&`Peak ${r.peak}`].filter(Boolean).join(' · ');
// --- Equalizer ---
const PRE={Flat:[0,0,0,0,0,0,0,0,0,0],'Bass Boost':[6,5,4,2,0,0,0,0,0,0],'Bass Reducer':[-6,-5,-4,-2,0,0,0,0,0,0],'Treble Boost':[0,0,0,0,0,1,2,4,5,6],'Treble Reducer':[0,0,0,0,0,-1,-2,-4,-5,-6],'Vocal Boost':[-2,-2,-1,1,3,4,4,3,1,0],'Spoken Word':[-4,-3,-1,1,3,4,4,3,1,-2],Loudness:[6,4,1,0,-1,-1,0,2,4,5],Rock:[5,4,2,-1,-2,-1,2,4,5,5],Pop:[-1,1,3,4,3,0,-1,-1,1,2],Jazz:[3,2,1,2,-2,-2,0,1,3,4],Blues:[2,3,2,0,-1,0,2,2,3,3],Classical:[0,0,0,0,0,0,-3,-3,-3,-4],Acoustic:[4,4,3,1,2,2,3,3,3,2],Piano:[2,1,0,2,3,1,3,4,2,3],Lounge:[-3,-1,1,2,1,-1,-2,0,1,0],Live:[-2,0,2,3,3,3,2,1,1,1],Electronic:[5,4,1,0,-2,2,1,1,4,5],Dance:[6,4,2,0,0,-2,-4,-4,0,0],'Hip-Hop':[6,5,2,3,-1,-1,2,0,2,3],'R&B':[3,7,6,1,-2,-1,2,2,3,3],Metal:[5,4,0,-2,-2,1,3,5,6,5],'Small Speakers':[6,5,4,3,2,0,-1,-2,-3,-4]};
const FL=['31','62','125','250','500','1k','2k','4k','8k','16k'],fdb=v=>(v>0?'+':v<0?'−':'')+Math.abs(v).toFixed(1)+' dB';
const eqBands=()=>{try{const b=JSON.parse(L('eq_bands'));if(Array.isArray(b)&&b.length===10)return b.map(v=>+v||0)}catch{}return Array(10).fill(0)};
const eqProfiles=()=>{try{const p=JSON.parse(L('eq_profiles'));return p&&typeof p==='object'?p:{}}catch{return{}}};
const eqSet=(b,p,n)=>{W('eq_bands',JSON.stringify(b));W('eq_pre',p);W('eq_name',n);applyDsp()};
function eqSheet(){const on=L('dsp_eq')==='1',b=eqBands(),pre=+L('eq_pre')||0,nm=L('eq_name')||'Flat',pf=eqProfiles(),s=$('#sheet'),o=(n,x)=>`<option${x?' selected':''}>${esc(n)}</option>`;s.hidden=false;
  s.innerHTML=`<div class="card eq" role="dialog" aria-label="Equalizer"><div class="eqh"><h3>Equalizer 10-band</h3><button class="btn ${on?'pri':''}" data-a="t" aria-pressed="${on}">${on?'ON':'OFF'}</button></div>
  <label class="eqs">Preset<select id="eqp" aria-label="Preset"><optgroup label="Preset bawaan">${Object.keys(PRE).map(n=>o(n,n===nm)).join('')}</optgroup>${Object.keys(pf).length?`<optgroup label="Profil saya">${Object.keys(pf).map(n=>o(n,n===nm)).join('')}</optgroup>`:''}${nm==='Custom'?o('Custom',1):''}</select></label>
  <div class="eqg">${FL.map((f,i)=>`<div class="eqc"><b>${b[i]}</b><div class="eqt" data-i="${i}" role="slider" tabindex="0" aria-label="${D.FREQ[i]} Hz" aria-valuemin="-12" aria-valuemax="12" aria-valuenow="${b[i]}" style="--v:${b[i]}"><i class="fl"></i><i class="th"></i></div><small>${f}</small></div>`).join('')}</div>
  <label class="eqs">Pre-amp<input id="eqpre" type="range" min="-12" max="6" step="0.5" value="${pre}" aria-label="Pre-amp"><b id="eqprv">${fdb(pre)}</b></label>
  <p class="note">${on&&D.active()?'':'EQ belum aktif: tekan OFF untuk menyalakan (halaman dimuat ulang agar jalur audio berubah). '}Preset menurunkan pre-amp otomatis untuk mencegah clipping.${ios?' Di iOS EQ memakai Web Audio; jika audio berhenti saat layar terkunci, EQ dimatikan otomatis.':''}</p>
  <div class="eqa"><button data-a="save">Simpan profil…</button><button data-a="r">Reset (Flat)</button>${pf[nm]?'<button data-a="del">Hapus profil ini</button>':''}<button data-a="x">Tutup</button></div></div>`;
  s.querySelectorAll('.eqt').forEach(t=>{const i=+t.dataset.i,set=v=>{v=Math.max(-12,Math.min(12,Math.round(v*2)/2));b[i]=v;t.style.setProperty('--v',v);t.setAttribute('aria-valuenow',v);t.previousElementSibling.textContent=v;eqSet(b,+L('eq_pre')||0,'Custom');const p=$('#eqp');if(![...p.options].some(x=>x.text==='Custom'))p.add(new Option('Custom'));p.value='Custom'},
    y=e=>12-(e.clientY-t.getBoundingClientRect().top)/t.getBoundingClientRect().height*24;
    t.onpointerdown=e=>{t.setPointerCapture(e.pointerId);set(y(e));t.onpointermove=ev=>set(y(ev))};t.onpointerup=t.onpointercancel=()=>{t.onpointermove=null};
    t.onkeydown=e=>{const d={ArrowUp:.5,ArrowRight:.5,ArrowDown:-.5,ArrowLeft:-.5,PageUp:2,PageDown:-2}[e.key];if(d){e.preventDefault();set(b[i]+d)}}});
  $('#eqp').onchange=e=>{const n=e.target.value,v=PRE[n]||pf[n]?.b;if(!v)return;eqSet([...v],PRE[n]?-Math.max(0,...v):+pf[n].p||0,n);eqSheet()};
  $('#eqpre').oninput=e=>{W('eq_pre',e.target.value);applyDsp();$('#eqprv').textContent=fdb(+e.target.value)};
  s.onclick=async e=>{const a=e.target.dataset.a;if(e.target===s||a==='x'){s.hidden=true;return}
    if(a==='t'){W('dsp_eq',on?'0':'1');s.hidden=true;sync();render()}
    else if(a==='r'||a==='r2'){eqSet(Array(10).fill(0),0,'Flat');eqSheet()}
    else if(a==='save'){const n=(await ask('Nama profil EQ',PRE[nm]||nm==='Custom'?'':nm))?.trim();if(!n)return;if(PRE[n]||n==='Custom')return toast('Gagal: nama itu dipakai preset bawaan.');pf[n]={b:[...b],p:pre};W('eq_profiles',JSON.stringify(pf));W('eq_name',n);toast(`Profil "${n}" disimpan.`);eqSheet()}
    else if(a==='del'){if(!await ok(`Hapus profil "${nm}"?`))return;delete pf[nm];W('eq_profiles',JSON.stringify(pf));eqSet(Array(10).fill(0),0,'Flat');eqSheet()}}}
// --- Visualizer (hanya saat Web Audio aktif dan Bit-Perfect OFF) ---
let vraf=0,vt=0;const vizOn=()=>L('viz')==='1'&&D.active()&&!bpOn();
function startViz(){const c=$('#viz');if(!c)return;c.hidden=!vizOn();const go=vizOn()&&!audio.paused&&!$('#np').hidden&&!document.hidden;if(go&&!vraf)vraf=requestAnimationFrame(vloop);if(!go){cancelAnimationFrame(vraf);vraf=0}}
function vloop(ts){if(!vizOn()||audio.paused||$('#np').hidden||document.hidden){vraf=0;return}if(ts-vt>=33){vt=ts;vdraw()}vraf=requestAnimationFrame(vloop)}
function vdraw(){const c=$('#viz'),x=c.getContext('2d'),A=D.analyser(),r=Math.min(devicePixelRatio||1,2),w=c.clientWidth*r|0,h=c.clientHeight*r|0;if(!A||!w)return;if(c.width!==w||c.height!==h){c.width=w;c.height=h}
  x.clearRect(0,0,w,h);x.fillStyle=x.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--ac').trim()||'#fff';
  if(L('viz_mode')==='wave'){const d=new Uint8Array(A.fftSize);A.getByteTimeDomainData(d);x.lineWidth=2*r;x.lineJoin='round';x.beginPath();for(let j=0;j<256;j++){const px=j*w/255,py=d[j*d.length/256|0]/255*h;j?x.lineTo(px,py):x.moveTo(px,py)}x.stroke()}
  else{const d=new Uint8Array(A.frequencyBinCount);A.getByteFrequencyData(d);const n=40,mx=Math.min(d.length-1,Math.floor(d.length*16000/((D.rate()||48000)/2))),bw=w/n;for(let i=0;i<n;i++){const a=Math.floor(2*(mx/2)**(i/n)),b=Math.max(a+1,Math.floor(2*(mx/2)**((i+1)/n)));let m=0;for(let k=a;k<b;k++)m=Math.max(m,d[k]);const bh=Math.max(2*r,m/255*h*.95);x.beginPath();x.roundRect?x.roundRect(i*bw+bw*.15,h-bh,bw*.7,bh,bw*.2):x.rect(i*bw+bw*.15,h-bh,bw*.7,bh);x.fill()}}}
new MutationObserver(startViz).observe($('#np'),{attributes:true,attributeFilter:['hidden']});document.addEventListener('visibilitychange',startViz);
$('#viz').onclick=()=>{W('viz_mode',L('viz_mode')==='wave'?'spec':'wave');vdraw?.()};$('#viz').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#viz').click()}};
SA.viz=()=>{if(bpOn())return toast('Dinonaktifkan karena Bit-Perfect Mode aktif.');W('viz',L('viz')==='1'?'0':'1');sync()};
SA.vizm=()=>W('viz_mode',L('viz_mode')==='wave'?'spec':'wave');
// --- Editor metadata: disimpan di library (IndexedDB), file audio asli tidak diubah ---
const dropUrl=id=>{const u=urls.get(id);if(u)URL.revokeObjectURL(u);urls.delete(id)};
function editMeta(t){return new Promise(res=>{const d=$('#dlg');let art,clr=0,inp;const f=(k,l,v,m=120)=>`<label class="mf">${l}<input data-k="${k}" value="${esc(v||'')}" maxlength="${m}"></label>`,pv=u=>{const el=d.querySelector('.mart>:first-child');const i=document.createElement('img');i.alt='';i.src=u;el.replaceWith(i)};
  d.hidden=false;d.innerHTML=`<div class="dbox mbox" role="dialog" aria-modal="true" aria-label="Edit Metadata"><h3>Edit Metadata</h3>${f('title','Judul',t.title)}${f('artist','Artis',t.artist)}${f('album','Album',t.album)}${f('genre','Genre',t.genre)}${f('year','Tahun',t.year,4)}
  <div class="mart">${t.cover?`<img alt="" src="${curl(t)}">`:`<div class="cv" style="--h:${hue(t.title)}">♪</div>`}<div><button data-m="pic">Pilih artwork…</button><button data-m="nopic">Hapus artwork</button><small id="mst">${t.cover?'Artwork saat ini':'Tanpa artwork'}</small></div></div>
  ${t.album?'<label class="chk"><input type="checkbox" id="mall"> Terapkan album &amp; artwork ke semua lagu di album ini</label>':''}<p class="note">Perubahan hanya disimpan di library SONORA. File audio asli tidak diubah.</p>
  <div class="dbt"><button data-m="reset">Tag asli</button><button data-m="x">Batal</button><button class="pri" data-m="ok">Simpan</button></div></div>`;
  const end=()=>{d.hidden=true;d.onclick=d.onkeydown=null;res()};d.querySelector('input').focus();
  d.onkeydown=e=>{if(e.key==='Escape')end()};
  d.onclick=async e=>{const m=e.target.dataset.m;if(e.target===d||m==='x')return end();if(!m)return;
    if(m==='pic'){inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.onchange=async()=>{const g=inp.files[0];if(!g)return;try{if(g.size>15e6)throw 0;(await createImageBitmap(g)).close?.()}catch{return toast('Gagal: gambar tidak valid atau terlalu besar.')}art=await thumb(g);clr=0;pv(URL.createObjectURL(art));$('#mst').textContent='Artwork baru dipilih'};inp.click();return}
    if(m==='nopic'){art=null;clr=1;$('#mst').textContent='Artwork akan dihapus';return}
    if(m==='reset'){if(!await ok('Kembalikan metadata lagu ini ke tag asli di file?'))return;const c={...st.lib.get(t.id),...parseName(t.fname||t.title),album:''};delete c.ov;delete c.ovCover;delete c.genre;delete c.year;c.cover=undefined;dropUrl(t.id);if(c.info)c.info.v=0;st.lib.set(c.id,c);await ensureInfo(c);render();drawTrack();E.refreshMeta();toast('Metadata dikembalikan ke tag asli.');return end()}
    const v=k=>d.querySelector(`[data-k=${k}]`).value.trim();if(!v('title'))return toast('Gagal: judul tidak boleh kosong.');
    const ov={title:v('title'),artist:v('artist')||'Unknown Artist',album:v('album')};if(v('genre'))ov.genre=v('genre');if(/^\d{4}$/.test(v('year')))ov.year=v('year');
    const tg=$('#mall')?.checked?[...st.lib.values()].filter(x=>x.album===t.album):[st.lib.get(t.id)];
    for(const c of tg){const n={...c};if(c.id===t.id){n.ov=ov;Object.assign(n,ov);if(!ov.genre)delete n.genre;if(!ov.year)delete n.year}else{n.ov={...(c.ov||{}),album:ov.album};n.album=ov.album}
      if(art||clr){n.ovCover=art||null;n.cover=art||undefined;dropUrl(c.id)}await S.put('tracks',n);st.lib.set(n.id,n)}
    render();drawTrack();E.refreshMeta();toast('Metadata disimpan.');end()}})}

// ===== Phase 11 enhancements: speed, queue, keyboard, multi-select, import progress =====
let speed=+(localStorage.getItem('speed')||1);
function applySpeed(){E.setSpeed(speed);const b=$('#sp');if(b)b.textContent=speed.toFixed(1).replace('.0','')+'x'}
applySpeed();
$('#sp')&&($('#sp').onclick=()=>{speed=speed>=2?0.5:speed+0.25;localStorage.setItem('speed',speed);applySpeed();toast('Kecepatan '+speed+'x')});

// Enhanced queue sheet
function showQueue(){
  const items=st.queue.map((id,i)=>{const t=st.lib.get(id);return [ (i===st.i?'▶ ':'')+(t?t.title:'?')+(i===st.i?' (sekarang)':''), ()=>{if(i!==st.i)E.playAt(i)} ]});
  items.push(['Hapus lagu ini dari antrean',()=>{if(st.i>=0){st.queue.splice(st.i,1);if(st.i>=st.queue.length)st.i=Math.max(0,st.queue.length-1);E.playAt(st.i||0);toast('Dihapus dari antrean')}}]);
  items.push(['Kosongkan antrean',()=>{st.queue=[];st.i=-1;audio.pause();$('#mini').hidden=true;$('#np').hidden=true;toast('Antrean dikosongkan')}]);
  sheet('Antrean',items);
}
$('#npq').onclick=showQueue;

// Keyboard shortcuts
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea')||!$('#dlg').hidden||!$('#sheet').hidden)return;
  if(e.key===' '||e.code==='Space'){e.preventDefault();E.toggle()}
  else if(e.key==='ArrowRight'){e.preventDefault();audio.currentTime=Math.min((audio.duration||0),audio.currentTime+10)}
  else if(e.key==='ArrowLeft'){e.preventDefault();audio.currentTime=Math.max(0,audio.currentTime-10)}
  else if(e.key==='n'||e.key==='N')E.next()
  else if(e.key==='p'||e.key==='P')E.prev()
  else if(e.key==='s'||e.key==='S'){E.toggleShuffle();drawState()}
  else if(e.key==='r'||e.key==='R'){E.cycleRepeat();drawState()}
  else if(e.key==='f'||e.key==='F'){const t=st.cur();if(t)saveTrack({...t,fav:!t.fav})}
  else if(e.key==='q'||e.key==='Q')showQueue()
  else if(e.key==='Escape'&&!$('#np').hidden)$('#np').hidden=true;
});

// Multi-select mode (basic)
let multi=false,sel=new Set();
function toggleMulti(){multi=!multi;sel.clear();toast(multi?'Mode pilih aktif. Ketuk lagu untuk pilih.':'Mode pilih mati');render()}
document.addEventListener('click',e=>{
  if(!multi||!e.target.closest('[data-play]'))return;
  e.stopPropagation();const id=e.target.closest('[data-play]').dataset.play;
  sel.has(id)?sel.delete(id):sel.add(id);e.target.closest('.row')?.classList.toggle('sel',sel.has(id));
},{capture:true});

// Import progress
const oldFileHandler=document.getElementById('file').onchange;
document.getElementById('file').onchange=async function(e){
  const fs=[...e.target.files||[]];if(!fs.length)return;
  toast(`Mengimpor ${fs.length} file...`);
  let n=0,dup=0,bad=[];
  for(const f of fs){
    try{
      const mime=probe(f);if(!mime){bad.push(f.name);continue}
      const id=crypto.randomUUID(),d=await dur(f).catch(()=>0);
      if([...st.lib.values()].some(t=>t.fname===f.name&&t.size===f.size)){dup++;continue}
      const {title,artist}=parseName(f.name);
      await S.put('blobs',new Blob([f],{type:mime.split(';')[0]}),id);
      const t={id,title,artist,album:'',duration:d,fname:f.name,format:ext(f.name),size:f.size,added:Date.now(),fav:false};
      await S.put('tracks',t);st.lib.set(id,t);await ensureInfo(t);n++;
      if(n%5===0)toast(`Diimpor ${n}/${fs.length}...`);
    }catch{bad.push(f.name)}
  }
  e.target.value='';render();
  toast(`${n} lagu ditambahkan${dup?`, ${dup} dilewati`:''}.`);
  if(bad.length)setTimeout(()=>toast(`Gagal: ${bad.slice(0,2).join(', ')}`),1500);
};

// Note in settings about backup (override via render hook if needed)
console.log('SONORA Phase 11 enhancements loaded');
