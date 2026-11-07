let db;
const open=()=>db?Promise.resolve(db):new Promise((res,rej)=>{const r=indexedDB.open('sonora',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('tracks',{keyPath:'id'});d.createObjectStore('playlists',{keyPath:'id'});d.createObjectStore('blobs');d.createObjectStore('kv')};r.onsuccess=()=>res(db=r.result);r.onerror=()=>rej(r.error)});
const tx=async(s,m,f)=>{const d=await open();return new Promise((res,rej)=>{const t=d.transaction(s,m),q=f(t.objectStore(s));t.oncomplete=()=>res(q&&q.result);t.onerror=t.onabort=()=>rej(t.error)})};
export const put=(s,v,k)=>tx(s,'readwrite',o=>k===undefined?o.put(v):o.put(v,k));
export const get=(s,k)=>tx(s,'readonly',o=>o.get(k));
export const all=s=>tx(s,'readonly',o=>o.getAll());
export const del=(s,k)=>tx(s,'readwrite',o=>o.delete(k));
export const clear=s=>tx(s,'readwrite',o=>o.clear());
