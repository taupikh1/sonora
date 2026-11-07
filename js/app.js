import * as S from './storage.js';
import * as E from './audio-engine.js';
import * as D from './dsp.js';
import {readInfo,quality,short} from './metadata.js';
import {esc,fmt,probe,parseName,dur,hue,ext} from './utils.js';
const {st,audio}=E,$=s=>document.querySelector(s);
let tab='songs',q='',plOpen=null,pls=[],seeking=false,timer=null,lastSave=0;
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),4000)};
const urls=new Map(),curl=t=>t.cover?(urls.get(t.id)||urls.set(t.id,URL.createObjectURL(t.cover)).get(t.id)):null;st.art=curl;
const cover=t=>curl(t)?`<img class="cv" src="${curl(t)}" alt="">`:`<div class="cv" style="--h:${hue(t.title+t.artist)}">${esc((t.title[0]||'♪').toUpperCase())}</div>`;
const row=t=>`<div class="row"><button class="pl" data-play="${t.id}">${cover(t)}<span><b>${esc(t.title)}</b><small>${esc(t.artist)}${t.duration?' · '+fmt(t.duration):''}${short(t.info)?' · '+short(t.info):''}</small></span></button><button data-more="${t.id}" aria-label="Menu untuk ${esc(t.title)}">⋯</button></div>`;
const visible=()=>{let a=[...st.lib.values()].sort((x,y)=>y.added-x.added);
  if(plOpen){const p=pls.find(x=>x.id===plOpen);a=p?p.ids.map(i=>st.lib.get(i)).filter(Boolean):[]}else if(tab==='fav')a=a.filter(t=>t.fav);
  const k=q.toLowerCase();return k?a.filter(t=>[t.title,t.artist,t.album].join(' ').toLowerCase().includes(k)):a};
function render(){
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab&&!plOpen));
  let h='';
  if(tab==='pl'&&!plOpen)h=`<button class="btn" data-newpl>+ Playlist baru</button>`+(pls.map(p=>`<div class="row"><button class="pl" data-openpl="${p.id}"><div class="cv" style="--h:${hue(p.name)}">♫</div><span><b>${esc(p.name)}</b><small>${p.ids.length} lagu</small></span></button><button data-plmenu="${p.id}" aria-label="Menu playlist ${esc(p.name)}">⋯</button></div>`).join('')||'<p class="empty">Belum ada playlist.</p>');
  else{const v=visible(),p=plOpen&&pls.find(x=>x.id===plOpen);
    if(p)h=`<div class="bar"><button class="btn" data-back>← Kembali</button><button class="btn pri" data-playall>Putar semua</button></div><h2>${esc(p.name)}</h2>`;
    h+=v.length?v.map(row).join(''):st.lib.size?'<p class="empty">Tidak ada lagu di sini.</p>':'<div class="empty"><h2>Your music lives here.</h2><button class="btn pri" data-add>Add Your First Song</button></div>'}
  $('#main').innerHTML=h}
const sheet=(title,items)=>{const s=$('#sheet');s.hidden=false;s.innerHTML=`<div class="card"><h3>${esc(title)}</h3>${items.map((x,i)=>`<button data-i="${i}">${esc(x[0])}</button>`).join('')}<button data-i="x">Tutup</button></div>`;
  s.onclick=async e=>{const b=e.target.closest('button');if(e.target===s||b?.dataset.i==='x'){s.hidden=true;return}if(b){s.hidden=true;await items[+b.dataset.i][1]()}}};
async function ensureInfo(t){const c=st.lib.get(t.id)||t;if(c.info?.v===2)return c.info;const b=await S.get('blobs',c.id);if(!b)return null;const i=await readInfo(b),g=i.tags||{};
  if(i.cover){c.cover=i.cover;delete i.cover}if(g.title)c.title=g.title;if(g.artist)c.artist=g.artist;if(g.album)c.album=g.album;i.v=2;c.info=i;await S.put('tracks',c);st.lib.set(c.id,c);return i}
const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const bpOn=()=>localStorage.getItem('bp')==='1';
const bpStatus=()=>!bpOn()?'OFF (normal playback)':ios?'BIT-PERFECT UNAVAILABLE':'DIRECT PLAYBACK';
const NA='Not Available on This Platform',U='Tidak terbaca dari file';
const infoSheet=(title,rows,note)=>{const s=$('#sheet');s.hidden=false;s.innerHTML=`<div class="card"><h3>${esc(title)}</h3>${rows.map(r=>r.length<2?`<h4>${esc(r[0])}</h4>`:`<div class="kv"><span>${esc(r[0])}</span><b>${esc(r[1])}</b></div>`).join('')}<p class="note">${esc(note||'')}</p><button data-i="x">Tutup</button></div>`;s.onclick=e=>{if(e.target===s||e.target.dataset.i==='x')s.hidden=true}};
const srcRows=(t,i)=>{const L=i.lossless,v=(x,u)=>x==null?U:x+u;const g=i.tags||{};return[['File name',t.fname||U],['Format',t.format.toUpperCase()],['Codec',i.codec||U],['Container',i.container||U],['Encoding',L===true?'Lossless':L===false?'Lossy':U],
  ['Sample rate',i.sr?i.sr.toLocaleString('en-US')+' Hz':U],['Bit depth',i.bits?i.bits+'-bit':L===false?'Tidak berlaku (lossy)':U],
  ['Bitrate',i.br?Math.round(i.br/1000)+' kbps'+(i.vbr===true?' (VBR, rata-rata)':i.vbr===false?' (CBR)':L?' (rata-rata)':''):U],
  ['Channels',i.ch?({1:'Mono',2:'Stereo'}[i.ch]||i.ch+' channel'):U],['Duration',i.dur?fmt(i.dur):U],['File size',(t.size/1048576).toFixed(1)+' MB'],['Album artist',g.albumArtist||'-'],['Album',g.album||'-'],['Track',g.track||'-'],['Disc',g.disc||'-'],['Genre',g.genre||'-'],['Year',g.year||'-'],['Cover art',t.cover?'Ada':'Tidak ada'],['Quality',quality(i)||U]]};
async function audioInfo(t){if(!t)return;const i=await ensureInfo(t)||{};
  infoSheet(t.title,[['SOURCE AUDIO INFORMATION'],...srcRows(t,i),['PLAYBACK OUTPUT INFORMATION'],['Playback engine','HTMLAudioElement'],['Output sample rate',NA],['Playback route',NA],['Bit-perfect status',bpStatus()]],
    'Data dibaca dari header file, bukan dari ekstensi. Aplikasi tidak bisa membuktikan apakah file lossless berasal dari konversi file lossy.')}
function outputStatus(){const t=st.cur(),i=t?.info||{};
  infoSheet('Audio Output Status',[['SOURCE AUDIO INFORMATION'],['Sample rate',i.sr?i.sr.toLocaleString('en-US')+' Hz':t?U:'-'],['Bit depth',i.bits?i.bits+'-bit':t?U:'-'],['Bitrate',i.br?Math.round(i.br/1000)+' kbps':t?U:'-'],
    ['PLAYBACK OUTPUT INFORMATION'],['Playback engine','HTMLAudioElement (tanpa Web Audio)'],['Output sample rate',NA],['Playback route',NA],['Audio processing',D.active()?'Web Audio aktif':'Tidak ada (jalur langsung)'],['EQ',D.active()&&L('dsp_eq')==='1'?'ON':'OFF'],['ReplayGain',D.active()&&(L('dsp_rg')||'off')!=='off'?L('dsp_rg')+' ('+rgGain(t).toFixed(1)+' dB)':'OFF'],['Crossfade','Tidak tersedia'],['Gapless','Tidak dijamin (HTMLAudioElement)'],['Bit-perfect status',bpStatus()]],
    ios?'iOS/Safari memproses audio lewat mixer sistem dan bisa me-resample; bit-perfect tidak bisa dijamin atau diverifikasi dari browser.':'Browser/OS tetap bisa me-resample atau mencampur audio di luar kendali aplikasi, sehingga output hardware tidak bisa diverifikasi.')}
const L=k=>localStorage.getItem(k),dspOn=()=>!bpOn()&&(L('dsp_eq')==='1'||(L('dsp_rg')||'off')!=='off');
const rgGain=t=>{const m=L('dsp_rg')||'off',r=t?.info?.tags?.rg;if(m==='off'||!r)return 0;const g=m==='album'?(r.album??r.track):r.track;return g==null?0:Math.min(g,r.peak>0?-20*Math.log10(r.peak):0)};
const applyDsp=()=>D.apply({eq:L('dsp_eq')==='1',bands:JSON.parse(L('dsp_bands')||'[0,0,0,0,0]'),gain:rgGain(st.cur())});
const sync=()=>{if(dspOn()!==D.active()){toast('Memuat ulang untuk mengganti jalur audio...');setTimeout(()=>location.reload(),1200)}else applyDsp()};
function eqSheet(){const on=L('dsp_eq')==='1',b=JSON.parse(L('dsp_bands')||'[0,0,0,0,0]'),s=$('#sheet');s.hidden=false;
  s.innerHTML=`<div class="card"><h3>Equalizer (Web Audio)</h3>${['60 Hz','230 Hz','910 Hz','3.6 kHz','14 kHz'].map((f,i)=>`<label class="kv"><span>${f}</span><input type="range" min="-12" max="12" value="${b[i]}" data-b="${i}" aria-label="${f}"><b>${b[i]} dB</b></label>`).join('')}<button data-a="t">${on?'Matikan':'Aktifkan'} equalizer</button><button data-a="r">Reset</button><button data-a="x">Tutup</button></div>`;
  s.oninput=e=>{const i=e.target.dataset.b;if(i==null)return;b[i]=+e.target.value;e.target.nextElementSibling.textContent=b[i]+' dB';localStorage.setItem('dsp_bands',JSON.stringify(b));applyDsp()};
  s.onclick=e=>{const a=e.target.dataset.a;if(e.target===s||a==='x')s.hidden=true;else if(a==='t'){localStorage.setItem('dsp_eq',on?'0':'1');s.hidden=true;sync()}else if(a==='r'){localStorage.setItem('dsp_bands','[0,0,0,0,0]');applyDsp();eqSheet()}}}
function audioSettings(){const bp=bpOn(),rg=L('dsp_rg')||'off',why='Dinonaktifkan karena Bit-Perfect Mode aktif.';
  sheet('Audio Settings',[[`Bit-Perfect Mode: ${bp?'ON':'OFF'}`,()=>{localStorage.setItem('bp',bp?'0':'1');if(dspOn()===D.active())outputStatus();else sync()}],
    [`Equalizer: ${bp?'nonaktif (Bit-Perfect)':L('dsp_eq')==='1'?'ON':'OFF'}`,()=>bp?toast(why):eqSheet()],
    [`ReplayGain/Normalization: ${bp?'nonaktif (Bit-Perfect)':rg}`,()=>{if(bp)return toast(why);localStorage.setItem('dsp_rg',{off:'track',track:'album',album:'off'}[rg]);toast('ReplayGain memakai tag di file. Lagu tanpa tag tidak diubah.');sync()}],
    ['Audio Processing Status',outputStatus]])}
const savePl=async p=>{await S.put('playlists',p);pls=await S.all('playlists');render()};
const saveTrack=async t=>{await S.put('tracks',t);st.lib.set(t.id,t);render();drawTrack()};
function addToPl(t){sheet('Tambah ke playlist',[['+ Playlist baru',async()=>{const n=prompt('Nama playlist');if(n?.trim())await savePl({id:crypto.randomUUID(),name:n.trim(),ids:[t.id]})}],...pls.map(p=>[p.name,()=>savePl({...p,ids:[...new Set([...p.ids,t.id])]})])])}
async function removeTrack(t){if(!confirm(`Hapus "${t.title}" dari library?`))return;
  await S.del('tracks',t.id);await S.del('blobs',t.id);st.lib.delete(t.id);
  for(const p of pls)if(p.ids.includes(t.id))await S.put('playlists',{...p,ids:p.ids.filter(i=>i!==t.id)});
  pls=await S.all('playlists');const cur=st.queue[st.i];st.queue=st.queue.filter(i=>i!==t.id);st.i=st.queue.indexOf(cur);
  if(cur===t.id){audio.pause();audio.removeAttribute('src');$('#mini').hidden=true;$('#np').hidden=true}render()}
const more=t=>sheet(t.title,[['Play Next',()=>E.playNext(t.id)],['Add to Queue',()=>E.addQueue(t.id)],['Add to Playlist',()=>addToPl(t)],[t.fav?'Hapus dari Favorites':'Add to Favorites',()=>saveTrack({...t,fav:!t.fav})],['View Details',()=>toast(`${t.format.toUpperCase()}, ${(t.size/1048576).toFixed(1)} MB`)],['Remove from Library',()=>removeTrack(t)]]);
$('#main').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const d=b.dataset;
  if(d.play){const v=visible();E.setQueue(v.map(t=>t.id),v.findIndex(t=>t.id===d.play))}
  else if(d.more)more(st.lib.get(d.more));
  else if('add' in d)$('#file').click();
  else if('newpl' in d){const n=prompt('Nama playlist');if(n?.trim())savePl({id:crypto.randomUUID(),name:n.trim(),ids:[]})}
  else if(d.openpl){plOpen=d.openpl;render()}
  else if('back' in d){plOpen=null;render()}
  else if('playall' in d){const v=visible();if(v.length)E.setQueue(v.map(t=>t.id),0)}
  else if(d.plmenu){const p=pls.find(x=>x.id===d.plmenu);sheet(p.name,[['Ubah nama',async()=>{const n=prompt('Nama baru',p.name);if(n?.trim())await savePl({...p,name:n.trim()})}],['Hapus playlist',async()=>{if(confirm('Hapus playlist ini? Lagu tetap ada di library.')){await S.del('playlists',p.id);pls=await S.all('playlists');render()}}]])}};
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;plOpen=null;render()});
$('#q').oninput=e=>{q=e.target.value.trim();render()};
$('#add').onclick=()=>$('#file').click();
$('#file').onchange=async e=>{const bad=[];let n=0;
  for(const f of e.target.files){const mime=probe(f);if(!mime){bad.push(f.name);continue}
    try{const d=await dur(f),id=crypto.randomUUID(),{title,artist}=parseName(f.name);
      await S.put('blobs',new Blob([f],{type:mime.split(';')[0]}),id);
      const t={id,title,artist,album:'',duration:d,fname:f.name,format:ext(f.name),size:f.size,added:Date.now(),fav:false};
      await S.put('tracks',t);st.lib.set(id,t);await ensureInfo(t);n++}catch(err){bad.push(f.name)}}
  e.target.value='';render();
  if(n)toast(`${n} lagu ditambahkan.`);
  if(bad.length)setTimeout(()=>toast(`Tidak bisa dibaca atau tidak didukung browser ini: ${bad.slice(0,3).join(', ')}${bad.length>3?` (+${bad.length-3})`:''}`),n?4200:0)};
const set=(s,v)=>$(s).textContent=v;
function drawTrack(){const t=st.cur();if(!t)return;$('#mini').hidden=false;$('#mc').innerHTML=cover(t);$('#npc').innerHTML=cover(t);
  set('#mt',t.title);set('#ma',t.artist);set('#npt',t.title);set('#npa',t.artist);set('#fv',t.fav?'♥':'♡');$('#fv').classList.toggle('act',!!t.fav);const qi=quality(t.info);set('#npi',t.info?.codec?short(t.info).replace(/ (\d+)\/([\d.]+)$/,(m,b,r)=>` · ${b}-bit / ${r} kHz`)+(qi?' · '+qi.toUpperCase():''):'');drawTime();drawState();applyDsp()}
function drawState(){const p=audio.paused?'▶':'❚❚';set('#pp',p);set('#mpp',p);$('#np').classList.toggle('play',!audio.paused);
  $('#sh').classList.toggle('act',st.shuffle);$('#rp').classList.toggle('act',st.repeat!=='off');set('#rp',st.repeat==='one'?'↻1':'↻')}
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
const theme=t=>{document.documentElement.dataset.theme=t;localStorage.setItem('theme',t)};
theme(localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'));
$('#set').onclick=async()=>{const e=await navigator.storage?.estimate?.()||{},mb=x=>((x||0)/1048576).toFixed(0)+' MB',tot=[...st.lib.values()].reduce((a,t)=>a+t.size,0);
  const sleep=m=>[`Sleep timer ${m} menit`,()=>{clearTimeout(timer);timer=setTimeout(()=>audio.pause(),m*6e4);toast(`Musik berhenti dalam ${m} menit (best-effort; browser bisa menunda saat background).`)}];
  sheet(`${st.lib.size} lagu, ${mb(tot)}. Browser: ${mb(e.usage)} dari ${mb(e.quota)}`,[sleep(15),sleep(30),sleep(45),sleep(60),['Matikan sleep timer',()=>clearTimeout(timer)],
    ['Minta penyimpanan persisten',async()=>toast(await navigator.storage?.persist?.()?'Penyimpanan persisten aktif.':'Browser tidak memberi penyimpanan persisten.')],
    ['Audio Settings',audioSettings],['Audio Output Status',outputStatus],['Ganti tema terang/gelap',()=>theme(document.documentElement.dataset.theme==='light'?'dark':'light')],
    ['Ekspor backup JSON (tanpa file audio)',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({tracks:[...st.lib.values()],playlists:pls})],{type:'application/json'}));a.download='sonora-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e4)}],
    ['Hapus seluruh library',async()=>{if(confirm('Hapus SEMUA lagu dan playlist dari browser ini?')){audio.pause();audio.removeAttribute('src');for(const s of['tracks','blobs','playlists','kv'])await S.clear(s);st.lib.clear();st.queue=[];st.i=-1;pls=[];$('#mini').hidden=true;$('#np').hidden=true;render()}}],
    ['Tentang: SONORA 1.0. Data tetap lokal, tanpa telemetri.',()=>{}]])};
if(dspOn())D.init(audio);audio.addEventListener('play',D.resume);
(async()=>{try{const ts=await S.all('tracks');st.lib=new Map(ts.map(t=>[t.id,t]));pls=await S.all('playlists');render();
  const l=await S.get('kv','last');if(l&&l.ids.every(i=>st.lib.has(i)))E.restore(l.ids,l.i,l.pos);for(const t of[...st.lib.values()])if(t.info?.v!==2)await ensureInfo(t);render();drawTrack()}catch(e){render();toast('Penyimpanan lokal tidak tersedia (mode privat?).')}
  if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{})})();
