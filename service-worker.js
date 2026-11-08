const C='sonora-v8',A=['./','index.html','manifest.webmanifest','css/main.css','js/app.js','js/audio-engine.js','js/storage.js','js/utils.js','js/metadata.js','js/tags.js','js/dsp.js','assets/icons/icon-192.png','assets/icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)).catch(()=>e.request.mode==='navigate'?caches.match('index.html'):Response.error()))});
