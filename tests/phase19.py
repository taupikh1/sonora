# QA Phase 19 (Playwright Python): pip install playwright && playwright install chromium && python3 tests/phase19.py
# audioSession TIRUAN dengan `state` undefined (seperti iPhone pengguna). Mengecek: statechange tanpa state = sinyal interupsi, lanjut otomatis,
# log play/pause/seek dengan status tersembunyi/tampil, tombol "Salin log". iPhone asli tetap NOT TESTED.
import os,wave,json,subprocess,time,math
from array import array
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'));os.makedirs('tests/_wav',exist_ok=True)
for n,f in [('Artis A - Lagu Satu',440),('Artis A - Lagu Dua',523)]:
    a=array('h');[a.extend((int(8000*math.sin(2*math.pi*f*i/44100)),)*2) for i in range(44100*30)]
    w=wave.open(f'tests/_wav/{n}.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(44100);w.writeframes(a.tobytes());w.close()
from playwright.sync_api import sync_playwright
FILES=['tests/_wav/Artis A - Lagu Satu.wav','tests/_wav/Artis A - Lagu Dua.wav']
INIT="""
window.__a=[];const A0=window.Audio;window.Audio=function(){const a=new A0();window.__a.push(a);return a};
(()=>{const es=new EventTarget();es.type='auto';/* state sengaja undefined */Object.defineProperty(navigator,'audioSession',{configurable:true,value:es});window.__as=es})();"""
res=[]
def chk(n,ok,info=''): res.append(bool(ok));print(('PASS ' if ok else 'FAIL ')+n,info)
srv=subprocess.Popen(['python3','-m','http.server','8142','-d','.'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
def log(pg): return [m for t,m in json.loads(pg.evaluate("localStorage.getItem('alog')||'[]'"))]
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx=b.new_context(viewport={'width':390,'height':844},has_touch=True,permissions=['clipboard-read','clipboard-write'],service_workers='block');ctx.add_init_script(INIT)
    pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8142/');pg.wait_for_timeout(600)
    pg.set_input_files('#file',FILES);pg.wait_for_timeout(3000);pg.click('[data-n=lib]');pg.wait_for_timeout(200)
    pg.click('.row .pl');pg.wait_for_timeout(1200)
    L=log(pg)
    chk('log play memuat status hidden dan posisi',any(m.startswith('play (hidden=false, pos=') for m in L),L[-3:])
    # 1) iOS mengirim statechange tanpa state, lalu mem-pause elemen (sosmed mulai)
    pg.evaluate("window.__as.dispatchEvent(new Event('statechange'))");pg.wait_for_timeout(100)
    pg.evaluate("window.__a[0].pause()");pg.wait_for_timeout(300)
    L=log(pg)
    chk('statechange tanpa state dicatat sebagai sinyal',any('tanpa state, dianggap sinyal' in m for m in L))
    chk('log pause memuat want=true',any(m.startswith('pause (') and 'want=true' in m for m in L))
    chk('pause setelah sinyal dihitung interupsi (kuat)',any('pause oleh sistem = interupsi (dilaporkan audioSession)' in m for m in L),[m for m in L if 'sistem' in m])
    # 2) sosmed ditutup: statechange tanpa state lagi saat halaman tampil -> lanjut otomatis
    pg.evaluate("window.__as.dispatchEvent(new Event('statechange'))");pg.wait_for_timeout(1500)
    L=log(pg)
    chk('lanjut otomatis setelah sinyal kedua',any(m.startswith('lanjut otomatis OK') for m in L) and not pg.evaluate("window.__a[0].paused"),[m for m in L if 'lanjut' in m])
    # 3) pause manual (tombol) tidak dilanjutkan
    pg.evaluate("document.querySelector('#mo').click()");pg.wait_for_timeout(200)
    # seek tercatat
    pg.evaluate("(v)=>{const s=document.querySelector('#seek');s.value=v;s.dispatchEvent(new Event('input'));s.dispatchEvent(new Event('change'))}",10);pg.wait_for_timeout(500)
    chk('log seek tercatat',any(m.startswith('seek ke ') for m in log(pg)))
    # 4) halaman tersembunyi + sinyal tanpa state: tunggu halaman tampil
    pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
    pg.evaluate("window.__as.dispatchEvent(new Event('statechange'))");pg.evaluate("window.__a[0].pause()");pg.wait_for_timeout(200)
    L=log(pg)
    chk('log halaman tersembunyi memuat want/paused',any(m.startswith('halaman tersembunyi (want=true') for m in L))
    chk('pause tersembunyi dihitung interupsi',any('pause oleh sistem = interupsi' in m and 'hidden=true' in m for m in L))
    pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))");pg.wait_for_timeout(1500)
    chk('lanjut saat halaman tampil lagi',not pg.evaluate("window.__a[0].paused"))
    # 5) tombol Salin log
    pg.click('#npb');pg.wait_for_timeout(200);pg.click('[data-n=set]');pg.wait_for_timeout(300)
    pg.click('[data-s=diag]');pg.wait_for_timeout(600)
    chk('tombol Salin log ada',pg.query_selector('#sheet button[data-i=copy]') is not None)
    pg.click('#sheet button[data-i=copy]');pg.wait_for_timeout(400)
    txt=pg.evaluate("navigator.clipboard.readText()")
    chk('salinan berisi versi, cache, dan log lengkap',('SONORA 1.11' in txt) and ('sonora-v20' in txt or 'cache' in txt) and 'LOG AUDIO' in txt and 'tanpa state' in txt,txt[:90].replace('\n',' | '))
    chk('tombol berubah jadi Tersalin',pg.inner_text('#sheet button[data-i=copy]').startswith('Tersalin'))
    pg.click('#sheet [data-i=x]')
    chk('versi 1.11 di Pengaturan','SONORA 1.11' in pg.inner_text('body'))
    chk('tanpa pageerror',not errs,errs)
    b.close()
finally:
  srv.terminate()
print(f"{sum(res)}/{len(res)} PASS")
