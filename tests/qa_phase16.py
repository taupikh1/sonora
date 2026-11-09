# QA Phase 16 (Playwright Python): pip install playwright && playwright install chromium && python3 tests/qa_phase16.py
import os,wave,struct,math
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'));os.makedirs('tests/_wav',exist_ok=True)
for n,f in [('Artis A - Lagu Satu',440),('Artis A - Lagu Dua',523),('Artis B - Lagu Tiga',659)]:
    w=wave.open(f'tests/_wav/{n}.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(44100)
    w.writeframes(b''.join(struct.pack('<hh',int(8000*math.sin(2*math.pi*f*i/44100)),int(8000*math.sin(2*math.pi*f*i/44100))) for i in range(44100*20)));w.close()
import subprocess, time, os, json
from playwright.sync_api import sync_playwright
W=lambda f:[f'tests/_wav/{x}' for x in f]
F3=['Artis A - Lagu Satu.wav','Artis A - Lagu Dua.wav','Artis B - Lagu Tiga.wav']
res=[]
def chk(n,ok,info=''): res.append((n,bool(ok),str(info)));print(('PASS ' if ok else 'FAIL ')+n,info)
srv=subprocess.Popen(['python3','-m','http.server','8130','-d','.'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
SEED="""(m)=>new Promise(res=>{const r=indexedDB.open('sonora');r.onsuccess=()=>{const d=r.result,t=d.transaction('tracks','readwrite'),s=t.objectStore('tracks');s.getAll().onsuccess=e=>{for(const x of e.target.result){x.info=x.info||{};x.info.tags=x.info.tags||{};m(x,s)}};t.oncomplete=()=>res()}})"""
def seed(pg,js): pg.evaluate("(js)=>new Promise(res=>{const f=new Function('x','s',js);const r=indexedDB.open('sonora');r.onsuccess=()=>{const d=r.result,t=d.transaction('tracks','readwrite'),s=t.objectStore('tracks');s.getAll().onsuccess=e=>{for(const x of e.target.result){x.info=x.info||{};x.info.tags=x.info.tags||{};f(x,s);s.put(x)}};t.oncomplete=()=>res()}})",js)
def boot(b,w=390,h=844,files=F3,theme='dark',pre=None):
    c=b.new_context(viewport={'width':w,'height':h},has_touch=True,accept_downloads=True);c.add_init_script(f"if(!localStorage.themeMode)localStorage.themeMode='{theme}'")
    pg=c.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append('console:'+m.text))
    pg.goto('http://localhost:8130/');pg.wait_for_timeout(700)
    if files: pg.set_input_files('#file',W(files));pg.wait_for_timeout(2200)
    return c,pg,errs
try:
  with sync_playwright() as p:
    b=p.chromium.launch()
    # 1 kosong + semua halaman
    c,pg,e=boot(b,files=[])
    for n in ['lib','search','pl','set','home']: pg.click(f'[data-n={n}]');pg.wait_for_timeout(150)
    chk('boot kosong + 5 halaman tanpa error',not e,e); c.close()
    # 2 impor, duplikat, rak, grup album/artis
    c,pg,e=boot(b)
    pg.set_input_files('#file',W(F3));pg.wait_for_timeout(1200);t=pg.inner_text('#toast')
    chk('duplikat dilewati',('dilewati' in t) or ('0 lagu' in t),t)
    seed(pg,"x.album=x.artist==='Artis A'?'Greatest':(x.title==='Lagu Tiga'?'Greatest':'');x.plays=x.title==='Lagu Satu'?3:0")
    pg.reload();pg.wait_for_timeout(1200)
    pg.click('[data-n=lib]');pg.click('[data-t=albums]');pg.wait_for_timeout(250)
    names=pg.eval_on_selector_all('.grid .cd b','x=>x.map(e=>e.textContent)')
    chk('2 "Greatest" beda artis = 2 kartu',names.count('Greatest')==2,names)
    pg.click('[data-t=artists]');chk('artis: 2 kartu',pg.locator('.grid.ar .cd').count()==2)
    # 3 XSS lewat metadata
    seed(pg,"if(x.title==='Lagu Satu'){x.title='<img src=x onerror=\"window.__xss=1\">';x.artist='<b>x</b>';x.album='<i>y</i>'}")
    pg.reload();pg.wait_for_timeout(1200)
    for n in ['home','lib']: pg.click(f'[data-n={n}]');pg.wait_for_timeout(200)
    pg.click('[data-t=albums]');pg.wait_for_timeout(200);pg.click('[data-t=songs]')
    chk('XSS metadata tidak jalan',pg.evaluate('window.__xss')!=1 and pg.locator('#main img[src=x]').count()==0)
    # 4 rapid next/prev + putar
    pg.click('[data-play] >> nth=0');pg.wait_for_timeout(500);pg.click('#mo');pg.wait_for_timeout(300)
    for i in range(12): pg.click('#nx' if i%3 else '#pv');
    pg.wait_for_timeout(500);chk('next/prev cepat tanpa error',not [x for x in e if 'Error' in x or 'console' in x][:1],e)
    # 5 lirik: txt, lrc, hapus; panel + seek
    open('tests/_wav/p.txt','w').write('Baris A\n\nBaris B\n')
    pg.click('#sly')
    with pg.expect_file_chooser() as fc: pg.click('#lyi')
    fc.value.set_files('tests/_wav/p.txt');pg.wait_for_timeout(500)
    chk('lirik txt tampil polos',pg.locator('#lys p.ll.p').count()==3,pg.inner_text('#lys')[:30])
    pg.click('#lyd');pg.wait_for_timeout(400);chk('hapus lirik -> kosong',pg.locator('.lyn').count()==1)
    pg.click('#lyx')
    # 6 backup berisi lrc/plays
    pg.click('#npb');pg.click('[data-n=set]')
    with pg.expect_download() as dl: pg.click('[data-s=backup]')
    j=json.load(open(dl.value.path()));chk('backup: tanpa blob/cover, ada plays',all('cover' not in t and 'info' not in t for t in j['tracks']) and any(t.get('plays') for t in j['tracks']))
    # 7 hapus lagu saat NP/lirik terbuka
    pg.click('[data-n=lib]');pg.click('[data-t=songs]');pg.click('[data-play] >> nth=0');pg.wait_for_timeout(400);pg.click('#mo');pg.click('#sly');pg.click('#lyx');pg.click('#npb')
    pg.click('[data-more] >> nth=0');pg.click('#sheet button:has-text("Hapus dari pustaka")');pg.click('#dlg .pri');pg.wait_for_timeout(500)
    chk('hapus lagu yang diputar tanpa error',not [x for x in e if 'Error' in x or 'console' in x][:1],e);c.close()
    # 8 layout sempit (overflow horizontal) light+dark
    for th in ['dark','light']:
      for w,h in [(320,568),(390,844)]:
        c,pg,e=boot(b,w,h,theme=th);bad=[]
        for n in ['home','lib','search','pl','set']:
            pg.click(f'[data-n={n}]');pg.wait_for_timeout(150)
            if n=='lib':
                for tt in ['albums','artists','songs']:
                    pg.click(f'[data-t={tt}]');pg.wait_for_timeout(100)
                    if pg.evaluate('document.documentElement.scrollWidth>innerWidth+1'):bad.append(f'lib/{tt}')
            if pg.evaluate('document.documentElement.scrollWidth>innerWidth+1'):bad.append(n)
        pg.click('[data-n=lib]');pg.click('[data-t=songs]');pg.click('[data-play] >> nth=0');pg.wait_for_timeout(500);pg.click('#mo');pg.wait_for_timeout(300)
        if pg.evaluate('(()=>{const n=document.getElementById("np");n.scrollLeft=50;return n.scrollLeft>0})()'):bad.append('np')
        bt=pg.evaluate('(()=>{const r=document.getElementById("pp").getBoundingClientRect();return r.bottom})()')
        chk(f'layout {w}x{h} {th}: tanpa overflow',not bad,bad)
        chk(f'  tombol play terlihat {w}x{h}',bt<=h,round(bt))
        if w==320 and th=='light': pg.screenshot(path='q_np320.png')
        c.close()
    # 9 offline
    c,pg,e=boot(b);pg.reload();pg.wait_for_timeout(1500)
    sw=pg.evaluate('navigator.serviceWorker.controller!=null');c.set_offline(True);pg.reload();pg.wait_for_timeout(1500)
    chk('offline: SW aktif & app tampil',sw and pg.locator('#nav').is_visible() and pg.locator('.shelf .cd').count()>0,sw)
    chk('offline: tanpa error modul',not [x for x in e if 'Failed' in x or 'module' in x.lower()],e);c.close()
    b.close()
finally: srv.terminate()
print('\nGAGAL:',[r[0] for r in res if not r[1]])
