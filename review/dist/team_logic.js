(function(root){
 const numeric={melee:c=>c.stats.melee,arcane:c=>c.stats.arcane,evade:c=>c.stats.evade,range:c=>c.stats.melee_range_inches,hp:c=>c.stats.health,energy:c=>c.stats.energy,base:c=>c.base_size_mm,version:c=>c.card_version};
 function match(c,r){
  if(numeric[r.field]){const v=numeric[r.field](c),n=Number(r.value);if(v===null||v===undefined||r.value===''||!Number.isFinite(n))return false;return ({eq:()=>v===n,ne:()=>v!==n,gte:()=>v>=n,lte:()=>v<=n,gt:()=>v>n,lt:()=>v<n})[r.op]?.()??false}
  const values=r.field==='keyword'?c.keywords:r.field==='tag'?c.custom_tags:r.field==='faction'?c.factions:r.field==='eligibility'?[c.eligibility.summoned_only?'summon':'selectable']:r.field==='review'?[c.review.status]:[c.name];
  const found=values.some(v=>r.op==='contains'?v.toLowerCase().includes(String(r.value).toLowerCase()):v.toLowerCase()===String(r.value).toLowerCase());return r.op==='ne'?!found:found;
 }
 function combine(values,mode){return mode==='or'?values.some(Boolean):values.every(Boolean)}
 function matches(c,query){const groups=query.groups.filter(g=>g.rules.length);return !groups.length||combine(groups.map(g=>combine(g.rules.map(r=>match(c,r)),g.mode)),query.mode)}
 function compatible(c,faction){return faction==='Undecided'||c.factions.includes(faction)}
 function exclusionNames(c){return [...((c.raw_front_text||'')+' '+(c.abilities||[]).map(a=>a.text).join(' ')).matchAll(/Evolution\s*\[([^\]]+)\]/gi)].map(m=>m[1].replace(/\s+/g,' ').trim().toLowerCase())}
 function conflict(a,b){return exclusionNames(a).includes(b.name.toLowerCase())||exclusionNames(b).includes(a.name.toLowerCase())}
 function commonFactions(team){return team.reduce((f,c)=>f.filter(v=>c.factions.includes(v)),['Commonwealth','Dominion','Leshavult','Shades'])}
 function partnerSet(c,faction,team=[]){const rec=c.suggested_partners;if(!rec)return null;const options=rec.by_faction;if(faction!=='Undecided')return options[faction]?{faction,...options[faction]}:null;const possible=commonFactions(team);const chosen=[rec.default_faction,...Object.keys(options)].find(f=>options[f]&&possible.includes(f));return chosen?{faction:chosen,...options[chosen]}:null}
 function reason(c,team,faction,size){if(!c.eligibility.selectable)return 'Summon — cannot be selected';if(!compatible(c,faction))return 'Outside '+faction;if(team.some(t=>t.id===c.id||t.name.toLowerCase()===c.name.toLowerCase()))return 'Already in your troupe';if(team.length>=size)return 'Troupe is full';const excluded=team.find(t=>conflict(c,t));if(excluded)return 'Evolution — cannot join '+excluded.name;if(faction==='Undecided'&&!commonFactions([...team,c]).length)return 'No shared faction with your troupe';return ''}
 function tally(team,field){const counts=new Map();for(const c of team){const seen=new Set();for(const label of c[field]){const key=label.toLowerCase();if(seen.has(key))continue;seen.add(key);const v=counts.get(key)||{label,count:0};v.count++;counts.set(key,v)}}return [...counts.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label))}
 const metricAxes=['Tank','Damage','Support','Moonstone','Complexity','Range'];
 function troupeMetrics(team){return Object.fromEntries(metricAxes.map(key=>[key,team.length?team.reduce((sum,c)=>sum+Math.max(0,Math.min(5,Number(c.troupe_metrics?.[key])||0)),0)/team.length:0]))}
 const api={metricAxes,troupeMetrics,numeric,match,matches,compatible,exclusionNames,conflict,commonFactions,partnerSet,reason,tally};root.TeamLogic=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
