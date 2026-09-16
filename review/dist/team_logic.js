(function(root){
 const numeric={melee:c=>c.stats.melee,arcane:c=>c.stats.arcane,evade:c=>c.stats.evade,range:c=>c.stats.melee_range_inches,hp:c=>c.stats.health,energy:c=>c.stats.energy,base:c=>c.base_size_mm,version:c=>c.card_version};
 function match(c,r){
  if(numeric[r.field]){const v=numeric[r.field](c),n=Number(r.value);if(v===null||v===undefined||r.value===''||!Number.isFinite(n))return false;return ({eq:()=>v===n,ne:()=>v!==n,gte:()=>v>=n,lte:()=>v<=n,gt:()=>v>n,lt:()=>v<n})[r.op]?.()??false}
  const values=r.field==='keyword'?c.keywords:r.field==='tag'?c.custom_tags:r.field==='faction'?c.factions:r.field==='eligibility'?[c.eligibility.summoned_only?'summon':'selectable']:r.field==='review'?[c.review.status]:[c.name];
  const found=values.some(v=>r.op==='contains'?v.toLowerCase().includes(String(r.value).toLowerCase()):v.toLowerCase()===String(r.value).toLowerCase());return r.op==='ne'?!found:found;
 }
 function combine(values,mode){return mode==='or'?values.some(Boolean):values.every(Boolean)}
 function matches(c,query){const groups=query.groups.filter(g=>g.rules.length);return !groups.length||combine(groups.map(g=>combine(g.rules.map(r=>match(c,r)),g.mode)),query.mode)}
 function reason(c,team,faction,size){if(!c.eligibility.selectable)return 'Summon — cannot be selected';if(!c.factions.includes(faction))return 'Outside '+faction;if(team.some(t=>t.id===c.id||t.name.toLowerCase()===c.name.toLowerCase()))return 'Already in your troupe';if(team.length>=size)return 'Troupe is full';return ''}
 function tally(team,field){const counts=new Map();for(const c of team){const seen=new Set();for(const label of c[field]){const key=label.toLowerCase();if(seen.has(key))continue;seen.add(key);const v=counts.get(key)||{label,count:0};v.count++;counts.set(key,v)}}return [...counts.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label))}
 const api={numeric,match,matches,reason,tally};root.TeamLogic=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
