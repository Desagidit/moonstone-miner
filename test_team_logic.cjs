const assert=require('node:assert/strict'),L=require('./review/dist/team_logic.js');
const c={id:'one',name:'One',stats:{health:8,energy:3,melee:4,arcane:5,evade:-1,melee_range_inches:1},base_size_mm:30,card_version:1,keywords:['Human','Soldier'],custom_tags:['Healer'],factions:['Commonwealth','Leshavult'],eligibility:{selectable:true,summoned_only:false},review:{status:'in_progress'}};
const rule=(field,op,value)=>({field,op,value});
assert.ok(L.matches(c,{mode:'and',groups:[{mode:'or',rules:[rule('energy','gte','4'),rule('hp','gte','8')]},{mode:'and',rules:[rule('keyword','eq','Soldier'),rule('faction','eq','Leshavult')]}]}));
assert.equal(L.matches(c,{mode:'and',groups:[{mode:'and',rules:[rule('energy','gte',4),rule('hp','gte',8)]}]}),false);
assert.ok(L.matches(c,{mode:'or',groups:[{mode:'and',rules:[rule('energy','gte',4)]},{mode:'and',rules:[rule('tag','eq','Healer')]}]}));
assert.ok(L.matches(c,{mode:'or',groups:[]}));assert.ok(L.match(c,rule('evade','lte',-1)));
assert.equal(L.match({...c,stats:{...c.stats,melee:null}},rule('melee','eq',0)),false);
assert.equal(L.reason(c,[],'Leshavult',6),'');assert.match(L.reason(c,[],'Dominion',6),/Outside/);
assert.match(L.reason({...c,eligibility:{selectable:false}},[],'Commonwealth',6),/Summon/);
assert.match(L.reason(c,[c],'Commonwealth',6),/Already/);assert.match(L.reason(c,[{id:'other',name:'Other'}],'Commonwealth',1),/full/);
assert.equal(L.tally([c,{...c,keywords:['human','Human']}],'keywords').find(v=>v.label==='Human').count,2);
console.log('Grouped AND/OR, numeric filters, mixed factions, summons, duplicates, size and summaries passed.');

assert.equal(L.reason(c,[],'Undecided',6),'');assert.ok(L.compatible(c,'Undecided'));assert.match(L.reason({...c,eligibility:{selectable:false}},[],'Undecided',6),/Summon/);
