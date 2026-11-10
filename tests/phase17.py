# QA Phase 17 (Playwright Python): pip install playwright && playwright install chromium && python3 tests/phase17.py
# Mensimulasikan perilaku iOS: metadata baru dimuat saat play (__lazy) dan audioSession tiruan. iPhone asli tetap NOT TESTED.
import os,wave,json,subprocess,time,math
from array import array
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'));os.makedirs('tests/_wav',exist_ok=True)
NAMES=[('Artis A - Lagu Satu',440),('Artis A - Lagu Dua',523),('Artis B - Lagu Tiga',659)]
for n,f in NAMES:
    a=array('h');[a.extend((int(8000*math.sin(2*math.pi*f*i/44100)),)*2) for i in range(44100*30)]
    w=wave.open(f'tests/_wav/{n}.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(44100);w.writeframes(a.tobytes());w.close()
from playwright.sync_api import sync_playwright
FILES=[f'tests/_wav/{n}.wav' for n,_ in NAMES]
INIT="""
window.__a=[];const A0=window.Audio;window.Audio=function(){const a=new A0();window.__a.push(a);return a};
const as=new EventTarget();as.state='active';as.type='auto';Object.defineProperty(navigator,'audioSession',{configurable:true,value:as});window.__as=as;
(()=>{const P=HTMLMediaElement.prototype,d=Object.getOwnPropertyDescriptor(P,'src'),op=P.play;if(!localStorage.__lazy)return;
 Object.defineProperty(P,'src',{configurable:true,get(){return this.__s||''},set(v){this.__s=v;this.__applied=false}});
 P.play=function(){if(!this.__applied&&this.__s){this.__applied=true;d.set.call(this,this.__s)}return op.call(this)}})();"""
HID="(h)=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>h});document.dispatchEvent(new Event('visibilitychange'))}"
KV="""()=>new Promise(r=>{const q=indexedDB.open('sonora');q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get('last');g.onsuccess=()=>r(g.result)}})"""
SEEK="""()=>{const s=document.querySelector('#seek');s.value=400;s.dispatchEvent(new Event('input'));s.dispatchEvent(new Event('change'))}"""
res=[]
def chk(n,ok,info=''): res.append(bool(ok));print(('PASS ' if ok else 'FAIL ')+n,info)
srv=subprocess.Popen(['python3','-m','http.server','8140','-d','.'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
secs=lambda t:int(t.split(':')[0])*60+int(t.split(':')[1])
def log(pg): return [m for t,m in json.loads(pg.evaluate("localStorage.getItem('alog')||'[]'"))]
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    def boot():
        c=b.new_context(viewport={'width':390,'height':844},has_touch=True,accept_downloads=True);c.add_init_script(INIT)
        pg=c.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8140/');pg.wait_for_timeout(600)
        pg.set_input_files('#file',FILES);pg.wait_for_timeout(3500);pg.click('[data-n=lib]');pg.wait_for_timeout(200);return c,pg,errs
    # 1-3 posisi tersimpan dan pulih (mode normal)
    c,pg,errs=boot();pg.click('.row .pl');pg.wait_for_timeout(1000);pg.click('#mo');pg.evaluate(SEEK);pg.wait_for_timeout(3000)
    lp=json.loads(pg.evaluate("localStorage.lp"));chk('posisi disimpan sinkron di localStorage (<=3 dtk setelah seek)',lp['pos']>=11,lp)
    pg.reload();pg.wait_for_timeout(2500);t=pg.inner_text('#cur');chk('buka lagi: posisi pulih (mode normal)',secs(t)>=11,t)
    # 4-6 mode iOS: metadata baru dimuat saat play
    pg.evaluate("localStorage.__lazy=1");pg.reload();pg.wait_for_timeout(2500)
    t=pg.inner_text('#cur');chk('iOS-sim: detik tersimpan tampil walau metadata belum dimuat',secs(t)>=11,t)
    pg.evaluate(HID.replace('(h)','(h)')+";0") if False else pg.evaluate(f"({HID})(true)");pg.wait_for_timeout(500)
    k=pg.evaluate(KV);lp=json.loads(pg.evaluate("localStorage.lp"));chk('iOS-sim: ke background tanpa play TIDAK menimpa posisi dengan 0',k['pos']>=11 and lp['pos']>=11,(k['pos'],lp['pos']))
    pg.evaluate(f"({HID})(false)");pg.reload();pg.wait_for_timeout(2500);pg.click('#mpp');pg.wait_for_timeout(1800)
    ct=pg.evaluate("window.__a[0].currentTime");chk('iOS-sim: tekan play -> lanjut dari menit tersimpan, bukan 0',ct>=11,round(ct,1));pg.evaluate("localStorage.removeItem('__lazy')")
    # 7-10 interupsi
    pg.evaluate("localStorage.removeItem('__lazy')");pg.reload();pg.wait_for_timeout(2000);pg.click('#mpp');pg.wait_for_timeout(800)
    pg.evaluate("()=>{window.__as.state='interrupted';window.__as.dispatchEvent(new Event('statechange'));window.__a[0].pause()}");pg.wait_for_timeout(300)
    pg.evaluate("()=>{window.__as.state='active';window.__as.dispatchEvent(new Event('statechange'))}");pg.wait_for_timeout(1500)
    chk('interupsi dilaporkan audioSession -> lanjut otomatis',not pg.evaluate("window.__a[0].paused"),log(pg)[-2:])
    pg.wait_for_timeout(3500)  # lewati jendela 3 dtk audioSession supaya ini benar-benar kasus 'lemah'
    pg.evaluate(f"({HID})(true)");pg.evaluate("window.__a[0].pause()");pg.wait_for_timeout(400);pg.evaluate(f"({HID})(false)");pg.wait_for_timeout(1500)
    chk('pause saat background tanpa laporan audioSession (kasus sosmed) -> lanjut saat kembali',not pg.evaluate("window.__a[0].paused") and any('lemah' in m for m in log(pg)),log(pg)[-3:])
    pg.evaluate("window.__a[0].pause()");pg.wait_for_timeout(300);pg.evaluate("dispatchEvent(new Event('focus'))");pg.wait_for_timeout(1500)
    chk('pause saat layar tampil (bukan interupsi) -> tidak lanjut sendiri',pg.evaluate("window.__a[0].paused"))
    pg.click('#mpp');pg.wait_for_timeout(600);pg.click('#mpp');pg.wait_for_timeout(300)
    pg.evaluate(f"({HID})(true)");pg.wait_for_timeout(200);pg.evaluate(f"({HID})(false)");pg.wait_for_timeout(1500)
    chk('pause manual oleh pengguna -> tidak lanjut sendiri',pg.evaluate("window.__a[0].paused"))
    chk('tanpa error JS (bagian 1)',not errs,errs);c.close()
    # 11-12 shuffle & repeat
    c,pg,errs=boot();pg.click('.row .pl');pg.wait_for_timeout(800);pg.click('#mo')
    def q():
        pg.click('#npq');pg.wait_for_timeout(200);r=pg.eval_on_selector_all('.qrow .qt b','e=>e.map(x=>x.textContent.replace("▶ ",""))');pg.click('[data-q=x]');pg.wait_for_timeout(150);return r
    q0=q();pg.click('#sh');pg.wait_for_timeout(200);pg.click('#sh');pg.wait_for_timeout(200);q1=q()
    chk('shuffle ON lalu OFF mengembalikan urutan asli',q0==q1,(q0,q1))
    pg.click('#rp');pg.click('#rp');pg.click('#sh');rp=pg.evaluate("[localStorage.repeat,localStorage.shuffle]")
    pg.reload();pg.wait_for_timeout(2000);chk('repeat dan shuffle bertahan setelah buka lagi',rp==['one','1'] and pg.evaluate("[localStorage.repeat,localStorage.shuffle]")==rp,rp)
    # 13 timer tidur memakai jam dinding
    pg.click('[data-n=set]');pg.click('[data-s=sleep]');pg.click('#sheet button:has-text("15 menit")');pg.wait_for_timeout(200)
    pg.click('[data-n=lib]');pg.click('#mpp');pg.wait_for_timeout(600)
    pg.evaluate("()=>{const o=Date.now;Date.now=()=>o()+16*60000}");pg.wait_for_timeout(1500)
    chk('timer tidur berhenti walau setTimeout tertunda (cek jam dinding)',pg.evaluate("window.__a[0].paused"));c.close()
    # 14 hapus lagu yang sedang diputar
    c,pg,errs=boot();pg.click('.row .pl');pg.wait_for_timeout(1000);t0=pg.inner_text('#mt')
    pg.click('.row [data-more]');pg.click('#sheet button:has-text("Hapus dari pustaka")');pg.click('#dlg .pri');pg.wait_for_timeout(1500)
    t1=pg.inner_text('#mt');chk('hapus lagu yang diputar -> lanjut ke lagu berikutnya',t1!=t0 and not pg.evaluate("window.__a[0].paused"),(t0,t1));chk('tanpa error JS (bagian 3)',not errs,errs)
    # 15 restore backup: ov dari file disaring
    pg.click('[data-n=set]');
    tr=pg.evaluate("""()=>new Promise(r=>{const q=indexedDB.open('sonora');q.onsuccess=()=>{const g=q.result.transaction('tracks').objectStore('tracks').getAll();g.onsuccess=()=>r(g.result.map(x=>({id:x.id,fname:x.fname,size:x.size})))}})""")
    bk={'app':'sonora','version':2,'tracks':[{**tr[0],'ov':{'title':'Judul Baru','id':'EVIL','info':{'v':4},'cover':1}}],'playlists':[]}
    open('tests/_wav/bk.json','w').write(json.dumps(bk))
    with pg.expect_file_chooser() as fc: pg.click('[data-s=restore]')
    fc.value.set_files('tests/_wav/bk.json');pg.wait_for_timeout(1200)
    got=pg.evaluate("""()=>new Promise(r=>{const q=indexedDB.open('sonora');q.onsuccess=()=>{const g=q.result.transaction('tracks').objectStore('tracks').getAll();g.onsuccess=()=>r(g.result)}})""")
    ids={x['id'] for x in got};ok_=all(x['id'] in ids for x in tr) and 'EVIL' not in ids and any(x.get('ov',{}).get('title')=='Judul Baru' for x in got) and not any(set(x.get('ov',{}))-{'title','artist','album','genre','year'} for x in got)
    chk('restore backup: ov disaring (id/cover/info dari file tidak masuk)',ok_,[x.get('ov') for x in got if x.get('ov')])
    c.close();b.close()
  print(f'\n{sum(res)}/{len(res)} PASS')
finally: srv.kill()
