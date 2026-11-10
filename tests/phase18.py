# QA Phase 18 (Playwright Python): pip install playwright && playwright install chromium && python3 tests/phase18.py
# Mensimulasikan elemen audio iOS yang macet: metadata baru dimuat saat play (__lazy), seek diabaikan (__ign), fragmen #t= diabaikan (__nofrag).
# iPhone asli tetap NOT TESTED.
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
(()=>{const P=HTMLMediaElement.prototype,d=Object.getOwnPropertyDescriptor(P,'src'),op=P.play;
 if(localStorage.__lazy){Object.defineProperty(P,'src',{configurable:true,get(){return this.__s||''},set(v){this.__s=v;this.__applied=false}});
  P.play=function(){if(!this.__applied&&this.__s){this.__applied=true;d.set.call(this,this.__s)}return op.call(this)}}
 const d2=Object.getOwnPropertyDescriptor(P,'src');
 if(localStorage.__nofrag)Object.defineProperty(P,'src',{configurable:true,get(){return d2.get.call(this)},set(v){d2.set.call(this,String(v).split('#')[0])}});
 const c=Object.getOwnPropertyDescriptor(P,'currentTime');window.__ign=localStorage.__ign==='all'?true:(+localStorage.__ign||0);
 Object.defineProperty(P,'currentTime',{configurable:true,get(){return c.get.call(this)},set(v){if(window.__ign===true||(window.__ign>0&&window.__ign--))return;c.set.call(this,v)}});})();"""
SEEK="(v)=>{const s=document.querySelector('#seek');s.value=v;s.dispatchEvent(new Event('input'));s.dispatchEvent(new Event('change'))}"
res=[]
def chk(n,ok,info=''): res.append(bool(ok));print(('PASS ' if ok else 'FAIL ')+n,info)
srv=subprocess.Popen(['python3','-m','http.server','8141','-d','.'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(1)
secs=lambda t:int(t.split(':')[0])*60+int(t.split(':')[1])
def log(pg): return [m for t,m in json.loads(pg.evaluate("localStorage.getItem('alog')||'[]'"))]
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx=b.new_context(viewport={'width':390,'height':844},has_touch=True);ctx.add_init_script(INIT)
    pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto('http://localhost:8141/');pg.wait_for_timeout(600)
    pg.set_input_files('#file',FILES);pg.wait_for_timeout(3000);pg.click('[data-n=lib]');pg.wait_for_timeout(200)
    pg.click('.row .pl');pg.wait_for_timeout(1000);pg.click('#mo');pg.evaluate(SEEK,430);pg.wait_for_timeout(3000)
    saved=json.loads(pg.evaluate("localStorage.lp"))['pos'];print('posisi tersimpan',saved)
    def reopen(flags):
        pg.evaluate("()=>{for(const k of ['__lazy','__nofrag','__ign'])localStorage.removeItem(k)}")
        for k,v in flags.items(): pg.evaluate(f"localStorage.{k}='{v}'")
        pg.reload();pg.wait_for_timeout(2200)
    def moving():
        a=secs(pg.inner_text('#cur'));pg.wait_for_timeout(1500);bb=secs(pg.inner_text('#cur'));return a,bb
    # A normal
    reopen({});pg.click('#mpp');pg.wait_for_timeout(2500);ct=pg.evaluate("window.__a[0].currentTime");a,bb=moving()
    chk('A normal: lanjut dari posisi tersimpan dan detik berjalan',ct>=saved-1 and bb>a,(round(ct,1),a,bb))
    # B iOS macet: metadata lazy + fragmen diabaikan + seek pertama diabaikan -> pulih lewat muat ulang/seek ulang
    reopen({'__lazy':1,'__nofrag':1,'__ign':1});pg.click('#mpp');pg.wait_for_timeout(11000);ct=pg.evaluate("window.__a[0].currentTime");a,bb=moving()
    chk('B elemen macet (seek pertama dan fragmen diabaikan): akhirnya sampai di posisi tersimpan, detik berjalan',ct>=saved-1 and bb>a,(round(ct,1),a,bb,log(pg)[-3:]))
    # C semua seek dan fragmen gagal -> menyerah, UI tidak membeku
    reopen({'__lazy':1,'__nofrag':1,'__ign':'all'});pg.click('#mpp');pg.wait_for_timeout(13500);a,bb=moving();t=pg.inner_text('#toast')
    chk('C semua seek gagal: menyerah, detik tetap berjalan (tidak beku) + pesan',bb>a and 'melompat' in t,(a,bb,t[:50]))
    # D seek di tengah lagu diabaikan elemen -> dimuat ulang di posisi target
    reopen({});pg.click('#mpp');pg.wait_for_timeout(1500);pg.click('#mo')
    pg.evaluate("window.__ign=1");pg.evaluate(SEEK,700);pg.wait_for_timeout(6500);ct=pg.evaluate("window.__a[0].currentTime")
    chk('D seek slider diabaikan elemen -> pulih ke target (~21 dtk)',ct>=20,(round(ct,1),log(pg)[-2:]))
    # E seek normal tidak memicu muat ulang
    n0=len([m for m in log(pg) if 'dimuat ulang' in m]);pg.evaluate(SEEK,200);pg.wait_for_timeout(4000);n1=len([m for m in log(pg) if 'dimuat ulang' in m])
    chk('E seek normal tidak memicu muat ulang',n1==n0,(n0,n1))
    chk('tanpa error JS',not errs,errs);b.close()
  print(f'\n{sum(res)}/{len(res)} PASS')
finally: srv.kill()
