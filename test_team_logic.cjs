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

const cards=JSON.parse(require('node:fs').readFileSync('data/characters.json','utf8'));
let cores=0;
for(const anchor of cards){
 const rec=anchor.suggested_partners;assert.ok(rec,'Missing partners: '+anchor.name);
 for(const [faction,set] of Object.entries(rec.by_faction)){
  assert.equal(set.partners.length,3);const core=anchor.eligibility.selectable?[anchor]:[];
  for(const p of set.partners){const partner=cards.find(c=>c.id===p.character_id);assert.ok(partner);assert.equal(L.reason(partner,core,faction,4),'',anchor.name+' / '+faction+' / '+partner.name);core.push(partner)}cores++;
 }
}
const grub=cards[20],herbert=cards[49];assert.match(L.reason(grub,[herbert],'Dominion',6),/Evolution/);assert.match(L.reason(herbert,[grub],'Dominion',6),/Evolution/);
assert.match(L.reason(cards[13],[cards[0]],'Undecided',6),/No shared faction/);
assert.equal(L.partnerSet(cards[27],'Commonwealth').faction,'Commonwealth');assert.equal(L.partnerSet(cards[27],'Dominion').faction,'Dominion');assert.equal(L.partnerSet(cards[27],'Leshavult'),null);
assert.equal(L.partnerSet(cards[27],'Undecided',[cards[0]]).faction,'Commonwealth');
assert.equal(L.partnerSet(cards[63],'Commonwealth').partners[0].character_id,cards[62].id);
console.log('All '+cores+' partner cores pass builder legality; Evolution exclusions and faction routes passed.');

const boris=cards.find(c=>c.name.startsWith("Boris,")),knoll=cards.find(c=>c.name==="Knoll");assert.deepEqual(knoll.factions,["Dominion","Leshavult"]);assert.deepEqual(L.commonFactions([boris,knoll]),["Leshavult"]);assert.equal(L.reason(knoll,[boris],"Undecided",6),"");assert.equal(L.reason(boris,[knoll],"Undecided",6),"");
