// Parser lirik: .lrc berwaktu dan sumber lirik lagu (file impor atau tag).
export const parseLrc=s=>{const out=[],re=/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  for(const ln of s.split(/\r?\n/)){const ts=[...ln.matchAll(re)];if(!ts.length)continue;const tx=ln.replace(re,'').trim();
    for(const m of ts)out.push({t:+m[1]*60+ +m[2]+(m[3]?+('0.'+m[3]):0),s:tx})}
  return out.sort((x,y)=>x.t-y.t)};
export const lyText=t=>t?.lrc||t?.info?.tags?.lyrics||'';
