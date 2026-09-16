const L=TeamLogic,$=id=>document.getElementById(id),clone=v=>JSON.parse(JSON.stringify(v));
let cards=[],focus=null,teamIds=[],filterSettings={},visits=[],visitIndex=-1,savedTroupes=[],activeTroupeId=null,troupeName='New troupe',favouriteIds=new Set(),draggedMemberId=null,factionQuickFilter=false;
const fields={favourite:'Favourite',keyword:'Keyword',keyword2:'Keyword 2',tag:'Tags',faction:'Faction',eligibility:'Summon',melee:'Melee',arcane:'Arcane',evade:'Evade',range:'Melee range',hp:'Health',energy:'Energy',base:'Base size'};
const tagDescriptions={Healer:'Can heal or restore wounds.',Tank:'Has at least 8 health.',Energetic:'Has at least 4 energy.',Blue:'Has a blue arcane action.',Green:'Has a green arcane action.',Red:'Has a red arcane action.',Shover:'Has an action, arcane action or passive that moves another character.',Woodland:'Creates or interacts with wood tiles.',Wet:'Creates or interacts with water tiles.'};
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function option(value,text){const n=node('option',text);n.value=value;return n}
function labelledSelect(label,values,value,fn){const s=node('select');s.setAttribute('aria-label',label);for(const [v,t] of values)s.append(option(v,t));s.value=value;s.onchange=()=>fn(s.value);return s}
function members(){return teamIds.map(id=>cards.find(c=>c.id===id)).filter(Boolean)}
function troupeFactions(){const team=members();if(!team.length)return [];const shared=L.commonFactions(team);return shared.length?shared:team[0].factions}
function troupeFaction(){const factions=troupeFactions();return factions.length===1?factions[0]:'Undecided'}
function compatibleWithTroupe(c){const factions=troupeFactions();return !factions.length||factions.some(f=>c.factions.includes(f))}
function troupeReason(c){if(!compatibleWithTroupe(c))return 'Outside '+troupeFactions().join(' / ');return L.reason(c,members(),'Undecided',6)}
function inspectionReason(c,reason){const prefix='This hero cannot be added to your team. ';if(!compatibleWithTroupe(c)){const factions=troupeFactions();return prefix+(factions.length===1?'It is not part of the '+factions[0]+' faction.':'It is not part of any of your troupe’s available factions: '+factions.join(' or ')+'.')}if(!c.eligibility.selectable)return prefix+'It can only enter play when summoned.';if(reason==='Troupe is full')return prefix+'All six troupe slots are filled.';if(reason.startsWith('Evolution'))return prefix+'Its Evolution rules prevent it from joining '+reason.replace('Evolution — cannot join ','')+'.';if(reason==='No shared faction with your troupe')return prefix+'All characters in a troupe must share a faction.';return prefix+reason+'.'}
function reorderMember(id,targetIndex){const from=teamIds.indexOf(id);if(from<0||!Number.isInteger(targetIndex)||targetIndex<0||targetIndex>5)return;const to=Math.min(targetIndex,teamIds.length-1);if(from===to)return;teamIds.splice(from,1);teamIds.splice(to,0,id);persist();repaintTroupe()}
function wireMemberDrop(row,index){row.ondragover=e=>{if(!draggedMemberId)return;e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';row.setAttribute('data-drag-over','true')};row.ondragleave=()=>row.removeAttribute('data-drag-over');row.ondrop=e=>{if(!draggedMemberId)return;e.preventDefault();const id=draggedMemberId;draggedMemberId=null;reorderMember(id,index)}}
const storageKey='moonstone-troupes-v2';
function troupeSnapshot(){return {name:troupeName,ids:[...teamIds],faction:troupeFaction(),size:6}}
function cleanTroupe(value){if(!value||!Array.isArray(value.ids))return null;const ids=[...new Set(value.ids)].filter(id=>cards.some(c=>c.id===id&&c.eligibility.selectable)).slice(0,6),team=ids.map(id=>cards.find(c=>c.id===id)),shared=team.length?L.commonFactions(team):[],factions=shared.length?shared:team[0]?.factions||[];return {name:typeof value.name==='string'?value.name.slice(0,100):'New troupe',ids,faction:factions.length===1?factions[0]:'Undecided',size:6}}
function updateStorageControls(){
 const select=$('saved-troupes'),previous=select.value;select.replaceChildren();
 if(!savedTroupes.length)select.append(option('','No troupes'));
 for(const troupe of savedTroupes)select.append(option(troupe.id,troupe.name));
 select.value=savedTroupes.some(t=>t.id===previous)?previous:savedTroupes.some(t=>t.id===activeTroupeId)?activeTroupeId:savedTroupes[0]?.id||'';
 const chosen=savedTroupes.some(t=>t.id===select.value),active=savedTroupes.find(t=>t.id===activeTroupeId);
 $('rename-troupe').disabled=!chosen;$('delete-troupe').disabled=!chosen;
 $('storage-status').textContent=!savedTroupes.length?'Click + to create a troupe.':!active?'Select a troupe.':'';
}
function persist(){const before=clone(savedTroupes),index=savedTroupes.findIndex(t=>t.id===activeTroupeId);if(index>=0)savedTroupes[index]={id:activeTroupeId,...troupeSnapshot()};try{localStorage.setItem(storageKey,JSON.stringify({version:2,activeId:activeTroupeId,draft:troupeSnapshot(),troupes:savedTroupes}));try{localStorage.setItem('moonstone-troupe-v1',JSON.stringify(troupeSnapshot()))}catch{}updateStorageControls();return true}catch{savedTroupes=before;$('storage-status').textContent='Changes could not be saved. Browser storage is unavailable.';return false}}
function restoreTroupes(){try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');let draft;if(saved?.version===2&&Array.isArray(saved.troupes)){const used=new Set();savedTroupes=saved.troupes.flatMap(t=>{const clean=cleanTroupe(t);if(!clean||typeof t.id!=='string'||used.has(t.id))return [];used.add(t.id);return [{id:t.id,...clean}]});activeTroupeId=savedTroupes.some(t=>t.id===saved.activeId)?saved.activeId:null;draft=cleanTroupe(saved.draft)}else draft=cleanTroupe(JSON.parse(localStorage.getItem('moonstone-troupe-v1')||'null'));if(draft)applyTroupe(draft);if(activeTroupeId)persist();else updateStorageControls()}catch{$('storage-status').textContent='Saved troupe data could not be read. You can create a new troupe.'}}
function applyTroupe(troupe){teamIds=[...troupe.ids];troupeName=troupe.name;factionQuickFilter=teamIds.length>0}
function repaintTroupe(){if(!teamIds.length)showGettingStarted();renderCards();refreshTeam();if(focus)show(focus,false)}
function switchTroupe(id){if(id===activeTroupeId||!savedTroupes.some(t=>t.id===id))return false;$('saved-troupes').value=activeTroupeId||'';if(!persist())return false;const before=troupeCheckpoint(),target=savedTroupes.find(t=>t.id===id);activeTroupeId=id;applyTroupe(cleanTroupe(target));$('saved-troupes').value=id;if(!persist()){rollbackTroupe(before,'The troupe was not switched. Browser storage is unavailable.');return false}repaintTroupe();return true}
$('saved-troupes').onchange=()=>switchTroupe($('saved-troupes').value);
function troupeId(){return globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
function rollbackTroupe(before,message){savedTroupes=before.troupes;activeTroupeId=before.id;applyTroupe(before.draft);$('saved-troupes').value=before.selected;updateStorageControls();$('storage-status').textContent=message}
function troupeCheckpoint(){return {troupes:clone(savedTroupes),id:activeTroupeId,draft:troupeSnapshot(),selected:$('saved-troupes').value}}
let nameDialogAction=null;
function openTroupeNameDialog(id=null){const saved=id?savedTroupes.find(t=>t.id===id):null;if(id&&!saved)return;nameDialogAction={id};$('troupe-name-title').textContent=id?'Rename troupe':'New troupe';$('troupe-name-confirm').textContent=id?'Rename':'Create troupe';$('troupe-name-input').value=saved?.name||'';$('troupe-name-error').textContent='';$('troupe-name-dialog').showModal();$('troupe-name-input').focus();if(id)$('troupe-name-input').select()}
function closeTroupeNameDialog(){nameDialogAction=null;$('troupe-name-dialog').close()}
$('new-troupe').onclick=()=>openTroupeNameDialog();
$('rename-troupe').onclick=()=>{const id=$('saved-troupes').value;if(savedTroupes.some(t=>t.id===id))openTroupeNameDialog(id)};
let deletingTroupeId=null;
$('delete-troupe').onclick=()=>{const troupe=savedTroupes.find(t=>t.id===$('saved-troupes').value);if(!troupe)return;deletingTroupeId=troupe.id;$('delete-description').textContent='Delete “'+troupe.name+'” from this browser? This cannot be undone.';$('delete-error').textContent='';$('delete-dialog').showModal()};
function closeDeleteDialog(){deletingTroupeId=null;$('delete-dialog').close()}
$('delete-cancel').onclick=closeDeleteDialog;$('delete-dialog').oncancel=()=>{deletingTroupeId=null};$('delete-dialog').onclick=e=>{if(e.target===$('delete-dialog'))closeDeleteDialog()};
$('delete-confirm').onclick=()=>{const index=savedTroupes.findIndex(t=>t.id===deletingTroupeId);if(index<0){closeDeleteDialog();return}if(!persist()){$('delete-error').textContent='Browser storage is unavailable. Nothing was deleted.';return}const before=troupeCheckpoint();savedTroupes.splice(index,1);if(activeTroupeId===deletingTroupeId){const next=savedTroupes[Math.min(index,savedTroupes.length-1)];activeTroupeId=next?.id||null;applyTroupe(next||{name:'New troupe',ids:[]});$('saved-troupes').value=activeTroupeId||''}if(!persist()){rollbackTroupe(before,'The troupe could not be deleted.');$('delete-error').textContent='Browser storage is unavailable. Nothing was deleted.';return}closeDeleteDialog();repaintTroupe()};
$('troupe-name-cancel').onclick=closeTroupeNameDialog;
$('troupe-name-dialog').oncancel=()=>{nameDialogAction=null};
$('troupe-name-dialog').onclick=e=>{if(e.target===$('troupe-name-dialog'))closeTroupeNameDialog()};
$('troupe-name-form').onsubmit=e=>{e.preventDefault();if(!nameDialogAction)return;const name=$('troupe-name-input').value.trim().slice(0,100);if(!name){$('troupe-name-error').textContent='Enter a troupe name.';$('troupe-name-input').focus();return}const before=troupeCheckpoint(),id=nameDialogAction.id;if(id){const saved=savedTroupes.find(t=>t.id===id);if(!saved)return;saved.name=name;if(id===activeTroupeId)troupeName=name}else{activeTroupeId=troupeId();applyTroupe({name,ids:[]});savedTroupes.push({id:activeTroupeId,...troupeSnapshot()});$('saved-troupes').value=activeTroupeId}if(!persist()){rollbackTroupe(before,'Browser storage is unavailable. Changes were not saved.');$('troupe-name-error').textContent='Browser storage is unavailable. Try again.';return}closeTroupeNameDialog();$('notice').textContent='';repaintTroupe()};
function svgNode(tag,attributes){const element=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);return element}
function drawTroupeChart(team,parent){const axes=L.metricAxes,values=L.troupeMetrics(team);parent.replaceChildren();const svg=svgNode('svg',{viewBox:'-10 0 380 320',role:'img','aria-label':'Troupe profile: '+axes.map(key=>key+' '+values[key].toFixed(1)+' out of 5').join(', '),class:'troupe-radar'});const point=(index,scale)=>{const angle=-Math.PI/2+index*Math.PI/3;return [180+Math.cos(angle)*scale,160+Math.sin(angle)*scale]},points=scale=>axes.map((_,i)=>point(i,scale).join(',')).join(' ');for(let level=1;level<=5;level++)svg.append(svgNode('polygon',{points:points(level*20),class:'radar-grid'}));axes.forEach((key,index)=>{const [x,y]=point(index,100);svg.append(svgNode('line',{x1:180,y1:160,x2:x,y2:y,class:'radar-spoke'}));const [lx,ly]=point(index,126),label=svgNode('text',{x:lx,y:ly,'text-anchor':index===0||index===3?'middle':index<3?'start':'end','dominant-baseline':'middle',class:'radar-label'});label.textContent=key;svg.append(label)});svg.append(svgNode('polygon',{points:axes.map((key,i)=>point(i,values[key]*20).join(',')).join(' '),class:'radar-area'}));axes.forEach((key,i)=>{const [cx,cy]=point(i,values[key]*20);svg.append(svgNode('circle',{cx,cy,r:3,class:'radar-dot'}))});parent.append(svg);return values}
function renderTroupeChart(){const axes=L.metricAxes,values=drawTroupeChart(members(),$('troupe-chart'));const summary=$('metric-summary');summary.replaceChildren();for(const key of axes){const row=node('span');row.append(node('span',key),node('strong',values[key].toFixed(1)));summary.append(row)}}
function chips(parent,labels){parent.replaceChildren();for(const label of labels)parent.append(node('span',label,'chip tag'))}
function summary(id,field){const values=L.tally(members(),field);chips($(id),values.map(v=>`${v.label} ×${v.count}`));values.forEach((v,i)=>{$(id).children[i].title=field==='custom_tags'?(tagDescriptions[v.label]||v.label):v.label+' keyword: '+v.count+' in your troupe'});if(!values.length)$(id).append(node('span','None yet','help'))}
function refreshTeam(){
 const list=$('team');list.replaceChildren();const current=members();$('troupe-heading').textContent=activeTroupeId||current.length?'Your Troupe: '+troupeName:'Your Troupe';
 for(let index=0;index<6;index++){
  const c=current[index],row=node('div',undefined,'member'+(!c?' empty-slot':compatibleWithTroupe(c)?'':' incompatible'));
  row.append(node('span',String(index+1),'slot-number'));wireMemberDrop(row,index);
  if(c){
   row.draggable=true;row.setAttribute('data-member-id',c.id);
   const handle=node('button','','drag-handle');handle.type='button';handle.title='Drag to reorder, or use arrow keys';handle.setAttribute('aria-label','Reorder '+c.name+'. Use up and down arrow keys.');handle.onkeydown=e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();const target=index+(e.key==='ArrowUp'?-1:1);reorderMember(c.id,target);const replacement=[...$('team').children].find(n=>n.getAttribute('data-member-id')===c.id);replacement?.children[1]?.focus()};
   const open=node('button',c.name,'member-name');open.type='button';open.title='View '+c.name+' card';open.onclick=()=>{show(c);renderCards()};
   const removeButton=node('button','×','member-remove');removeButton.type='button';removeButton.title='Remove '+c.name+' from troupe';removeButton.setAttribute('aria-label','Remove '+c.name);removeButton.onclick=()=>remove(c);
   row.append(handle,open,removeButton);
   row.ondragstart=e=>{draggedMemberId=c.id;if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',c.id)}row.setAttribute('data-dragging','true')};
   row.ondragend=()=>{draggedMemberId=null;for(const slot of $('team').children){slot.removeAttribute('data-drag-over');slot.removeAttribute('data-dragging')}};
  }else row.append(node('span','Empty slot','help'));
  list.append(row);
 }
 const factions=troupeFactions(),bad=current.filter(c=>!compatibleWithTroupe(c)||!c.eligibility.selectable||current.some(t=>t.id!==c.id&&L.conflict(c,t))),noShared=current.length>0&&!L.commonFactions(current).length;
 $('troupe-faction').textContent=current.length?'Faction · '+factions.join(' / '):'Faction · add a character to slot 1';
 $('team-status').textContent=[bad.length?`${bad.length} incompatible`:'',noShared?'No shared faction':''].filter(Boolean).join(' · ');$('team-status').className=bad.length||noShared?'invalid':'';
 summary('tag-summary','custom_tags');summary('keyword-summary','keywords');renderTroupeChart();if(focus)renderPartners(focus);
}
function remove(c){teamIds=teamIds.filter(id=>id!==c.id);persist();refreshTeam();renderCards();if(focus)show(focus,false)}
function add(c,keepFocus=false){const reason=troupeReason(c);if(reason){$('notice').textContent=reason;return}if(!teamIds.length)factionQuickFilter=true;teamIds.push(c.id);$('notice').textContent='';persist();refreshTeam();renderCards();show(keepFocus&&focus?focus:c,!keepFocus)}
const favouritesKey='moonstone-favourites-v1';
function restoreFavourites(){try{const saved=JSON.parse(localStorage.getItem(favouritesKey)||'[]');favouriteIds=new Set(Array.isArray(saved)?saved.filter(id=>typeof id==='string'&&cards.some(c=>c.id===id)):[])}catch{favouriteIds=new Set()}}
function toggleFavourite(c){if(favouriteIds.has(c.id))favouriteIds.delete(c.id);else favouriteIds.add(c.id);try{localStorage.setItem(favouritesKey,JSON.stringify([...favouriteIds]))}catch{$('notice').textContent='Browser storage is unavailable. Favourites will last until this page closes.'}renderCards()}
function updateFactionQuickFilter(){const button=$('faction-filter');button.disabled=!members().length;if(button.disabled)factionQuickFilter=false;button.setAttribute('aria-pressed',String(factionQuickFilter));button.title=factionQuickFilter?'Show all factions':'Filter characters by troupe faction'}
$('faction-filter').onclick=()=>{if(!members().length)return;factionQuickFilter=!factionQuickFilter;renderCards()};
function renderCards(){
 updateFactionQuickFilter();
 const q=$('find').value.toLowerCase().trim();
 const filtered=cards.filter(c=>(!q||[c.name,...c.keywords,...c.custom_tags].join(' ').toLowerCase().includes(q))&&matchesFilters(c)&&(!factionQuickFilter||compatibleWithTroupe(c)));
 const sort=$('sort').value;filtered.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):(L.numeric[sort](b)??-Infinity)-(L.numeric[sort](a)??-Infinity)||a.name.localeCompare(b.name));
 $('result-count').textContent=`${filtered.length} / ${cards.length}`;const list=$('catalogue'),scrollTop=list.scrollTop;list.replaceChildren();
 for(const c of filtered){
  const incompatible=!compatibleWithTroupe(c),inTeam=teamIds.includes(c.id),favourite=favouriteIds.has(c.id);
  const panel=node('div',undefined,'character'+(focus?.id===c.id?' active':'')+(incompatible?' incompatible':''));
  const open=node('button',undefined,'character-open');open.type='button';open.setAttribute('aria-label','View '+c.name);
  const heading=node('span',undefined,'character-heading');heading.append(node('strong',c.name));
  if(inTeam&&!incompatible){const tick=node('span','✓','troupe-tick');tick.title='In your troupe';tick.setAttribute('role','img');tick.setAttribute('aria-label','In your troupe');heading.append(tick)}else if(incompatible){const blocked=node('span','','troupe-incompatible');blocked.title='Incompatible with troupe faction: '+troupeFactions().join(' / ');blocked.setAttribute('role','img');blocked.setAttribute('aria-label',blocked.title);heading.append(blocked)}
  open.append(heading,node('small',c.factions.join(' / ')+(c.eligibility.summoned_only?' · Summon':'')),node('div',`HP ${c.stats.health} · Energy ${c.stats.energy} · Melee ${c.stats.melee??'—'} · Arcane ${c.stats.arcane??'—'} · Evade ${c.stats.evade??'—'}`,'statline'));
  const footer=node('div',undefined,'character-footer'),star=node('button',favourite?'★':'☆','favourite-star'+(favourite?' selected':''));star.type='button';star.title=(favourite?'Remove from':'Add to')+' favourites';star.setAttribute('aria-label',(favourite?'Remove '+c.name+' from':'Add '+c.name+' to')+' favourites');star.setAttribute('aria-pressed',String(favourite));star.onclick=e=>{e.stopPropagation();toggleFavourite(c)};
  footer.append(node('small',c.keywords.join(' · ')),star);panel.append(open,footer);

  panel.onclick=()=>{show(c);renderCards()};list.append(panel);
 }
 if(!filtered.length)list.append(node('p','No cards match these filters.'));list.scrollTop=scrollTop;
}
function showGettingStarted(){focus=null;visits=[];visitIndex=-1;const intro=node('section',undefined,'getting-started');intro.append(node('h2','Build your troupe'),node('p','Choose a character from the list to inspect its card, then add it to your troupe.'));const steps=node('ul');for(const text of ['Use the filters to find heroes by stats, keywords or tags.','Your first hero sets the available factions and filters the character list.','Explore Strategy and Partners for ideas, then fill up to six slots.','Create a named troupe with +. Changes save automatically in this browser; Share lets you exchange troupe codes.'])steps.append(node('li',text));intro.append(steps);$('focused').replaceChildren(intro);$('strategy-panel').replaceChildren();$('partners').replaceChildren();$('advice-tabs').hidden=true;$('strategy-panel').hidden=true;$('partner-section').hidden=true}
function show(c,recordVisit=true){
 if(recordVisit&&visits[visitIndex]!==c.id){visits=visits.slice(0,visitIndex+1);visits.push(c.id);visitIndex=visits.length-1}
 $('advice-tabs').hidden=false;selectAdviceTab($('partners-tab').getAttribute('aria-selected')==='true'?'partners':'strategy');focus=c;renderPartners(c);const p=$('focused');p.replaceChildren();
 const actions=node('div',undefined,'focus-actions');
 const inTeam=teamIds.includes(c.id),reason=troupeReason(c);
 const b=node('button',inTeam?'Remove from troupe':'Add to troupe','primary');b.disabled=!inTeam&&!!reason;b.onclick=()=>inTeam?remove(c):add(c);actions.append(b);
 const navigation=node('div',undefined,'card-navigation');
 for(const [label,offset] of [['Previous',-1],['Next',1]]){const nav=node('button',label);nav.type='button';nav.disabled=offset<0?visitIndex<=0:visitIndex>=visits.length-1;nav.setAttribute('aria-label',label+' viewed character');nav.title=offset<0?'Go back to the previously viewed character':'Go forward in browsing history';nav.onclick=()=>{const next=visitIndex+offset;if(next<0||next>=visits.length)return;visitIndex=next;show(cards.find(v=>v.id===visits[visitIndex]),false);renderCards()};navigation.append(nav)}
 actions.append(navigation);
 const links=node('div',undefined,'focus-links');
 if(!inTeam&&reason)links.append(node('span',inspectionReason(c,reason),'compatibility'));
 const review=node('a','Review this card ↗');review.href='/?page='+c.source.pdf_page;review.title='Open the official character card';review.target='_blank';review.rel='noopener';links.append(review);
 if(c.miniature?.store_url){const store=node('a','Mini store ↗');store.href=c.miniature.store_url;store.title='Open the miniature in the official store';store.target='_blank';store.rel='noopener';links.append(store)}
 if(c.miniature?.image_url){const photo=node('button','▧','mini-photo');photo.type='button';photo.title='View painted miniature';photo.setAttribute('aria-label','View painted miniature for '+c.name);photo.onclick=()=>openMiniature(c);links.append(photo)}
 actions.append(...links.children);p.append(actions);
 const imageFrame=node('div',undefined,'focus-image-frame'),image=node('img');image.src='/'+c.source.image_path+'?quality=360';image.alt='Original cards for '+c.name;image.className='focused-image';imageFrame.append(image);p.append(imageFrame);
 renderRelated(c,p);$('strategy-panel').replaceChildren();renderGuide(c,$('strategy-panel'));
}
function renderRelated(c,parent){
 for(const [key,title] of [['summons','Summons / transformations'],['summoned_by','Called into play by']]){
  if(!c[key]?.length)continue;
  const section=node('section',undefined,'related-characters');section.append(node('h3',title));
  for(const relation of c[key]){
   const row=node('div',undefined,'related-row');row.append(node('span',relation.ability+': ','help'));
   for(const id of relation.character_ids){const target=cards.find(v=>v.id===id);if(!target)continue;const link=node('button',target.name,'related-name');link.type='button';link.onclick=()=>{show(target);renderCards()};row.append(link)}
   if(relation.condition)row.append(node('small',relation.condition,'help'));
   section.append(row);
  }
  parent.append(section);
 }
}
function selectAdviceTab(selected){for(const name of ['strategy','partners']){const tab=$(name+'-tab'),active=name===selected;tab.setAttribute('aria-selected',String(active));tab.setAttribute('tabindex',active?'0':'-1');$(name==='strategy'?'strategy-panel':'partner-section').hidden=!active}}
for(const name of ['strategy','partners']){const tab=$(name+'-tab');tab.onclick=()=>selectAdviceTab(name);tab.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?'strategy':e.key==='End'?'partners':name==='strategy'?'partners':'strategy';selectAdviceTab(next);$(next+'-tab').focus()}}

function renderGuide(c,parent){
 const guide=c.strategy_guide;if(!guide)return;
 const section=node('section',undefined,'strategy-guide');section.append(node('h3','Strategy Summary'),node('p',guide.role,'guide-role'));
 for(const [field,label] of [['play','Game plan'],['needs','Needs help with'],['caution','Watch out']]){const paragraph=node('p');paragraph.append(node('strong',label+': '),node('span',guide[field]));section.append(paragraph)}
 section.append(node('p','Based on current cards and tactical judgement, with published advice linked below.','help'));
 const sources=node('div',undefined,'guide-sources');
 const card=node('a','Current card ↗');card.href=c.source.card_url;card.target='_blank';card.rel='noopener';sources.append(card);
 for(const source of guide.sources){const link=node('a',source.kind+': '+source.title+' ↗');link.href=source.url;link.target='_blank';link.rel='noopener';sources.append(link)}
 section.append(sources);parent.append(section);
}
function openMiniature(c){
 const mini=c.miniature;if(!mini?.image_url)return;
 $('mini-title').textContent=mini.photo_scope||c.name;$('mini-image').alt='Painted miniature: '+(mini.photo_scope||c.name);
 $('mini-loading').textContent='Loading photo…';$('mini-image').hidden=true;
 $('mini-image').onload=()=>{$('mini-image').hidden=false;$('mini-loading').textContent=''};
 $('mini-image').onerror=()=>{$('mini-image').hidden=true;$('mini-loading').textContent='Photo could not load. You can view the miniature in the store.'};
 $('mini-image').src=mini.image_url;$('mini-store').href=mini.store_url;$('mini-dialog').showModal();
}
$('mini-close').onclick=()=>$('mini-dialog').close();
$('mini-dialog').onclick=e=>{if(e.target===$('mini-dialog'))$('mini-dialog').close()};
function renderPartners(c){
 const target=$('partners');target.replaceChildren();$('partner-heading').textContent='Suggested Partners';
 const set=L.partnerSet(c,troupeFaction(),members());
 if(!set){target.append(node('p','No compatible partner core for this troupe. Reorder or remove members to change its faction.','help'));return}
 target.append(node('p',set.faction+(c.eligibility.summoned_only?' · summon support core':' · four-character core'),'partner-faction'),node('p',set.plan,'partner-plan'));
 for(const suggested of set.partners){
  const partner=cards.find(v=>v.id===suggested.character_id);if(!partner)continue;
  const row=node('div',undefined,'partner'),name=node('button',partner.name,'partner-name');name.onclick=()=>{show(partner);renderCards()};
  const reason=troupeReason(partner),inTeam=teamIds.includes(partner.id),b=node('button',inTeam?'✓':'+','partner-add');b.disabled=inTeam||!!reason;b.title=inTeam?'Already in your troupe':reason||'Add '+partner.name+' to troupe';b.setAttribute('aria-label',b.title);b.onclick=()=>add(partner,true);
  const heading=node('div',undefined,'partner-heading');heading.append(name,b);row.append(heading,node('p',suggested.reason,'partner-reason'));if(reason&&!inTeam)row.append(node('small',reason,'compatibility'));target.append(row);
 }
}
function choices(field){if(field==='keyword2')field='keyword';if(field==='keyword'||field==='tag'||field==='faction')return [...new Set(cards.flatMap(c=>field==='keyword'?c.keywords:field==='tag'?c.custom_tags:c.factions))].sort().map(v=>[v,v]);return null}
function sliderValues(field){return [...new Set(cards.map(c=>L.numeric[field](c)).filter(v=>typeof v==='number'&&Number.isFinite(v)))].sort((a,b)=>a-b)}
function minimumField(field){return !!L.numeric[field]&&!['base','version'].includes(field)}
function filterLabel(field){return minimumField(field)?'Min '+fields[field].toLowerCase():fields[field]}
function matchesFilters(c){return Object.entries(filterSettings).every(([field,setting])=>!setting.active||L.match(c,{field:field==='keyword2'?'keyword':field,op:minimumField(field)?'gte':'eq',value:setting.value},{favourites:favouriteIds}))}
function renderFilters(){const parent=$('filter-fields');parent.replaceChildren();for(const field of Object.keys(fields)){
 const setting=filterSettings[field]||(filterSettings[field]={value:'',active:false}),row=node('div',undefined,'filter-row'),label=node('label',filterLabel(field));label.htmlFor='filter-'+field;
 const slider=!!L.numeric[field],toggle=field==='eligibility'||field==='favourite',values=slider?sliderValues(field):choices(field),control=node(slider||toggle?'input':'select');control.id='filter-'+field;control.setAttribute('aria-label',filterLabel(field));
 const clear=node('button','×','filter-clear');clear.type='button';clear.setAttribute('aria-label','Clear '+fields[field]+' filter');clear.title='Exclude '+fields[field]+' from search';
 let content=control,readout=null;
 if(slider){control.type='range';control.min=0;control.max=values.length;control.step=1;control.value=setting.active?values.indexOf(Number(setting.value))+1:0;control.className='discrete-slider';content=node('div',undefined,'slider-setting');const track=node('div',undefined,'slider-track'),dots=node('div',undefined,'slider-dots');dots.setAttribute('aria-hidden','true');for(let i=0;i<=values.length;i++)dots.append(node('span'));track.append(dots,control);readout=node('output',undefined,'slider-value');readout.htmlFor=control.id;content.append(track,readout)}
 else if(toggle){control.type='checkbox';control.className='summon-toggle';control.setAttribute('role','switch');control.title=field==='favourite'?'Show favourites only; off includes all characters':'Show summons only; off includes all characters';control.checked=setting.active;content=node('div',undefined,'toggle-setting');content.append(control)}
 else{control.append(option('','Any'));for(const [value,text] of values)control.append(option(value,text));control.value=setting.value}
 const updateRow=()=>{row.className='filter-row'+(setting.active?' filter-active':'');row.setAttribute('data-active',String(setting.active));clear.disabled=!setting.active;if(readout){readout.textContent=setting.active?(field==='base'?setting.value+' mm':'≥ '+setting.value):'Any';control.setAttribute('aria-valuetext',readout.textContent)}};
 const edit=()=>{if(slider){const index=Number(control.value);setting.active=Number.isInteger(index)&&index>0&&index<=values.length;setting.value=setting.active?String(values[index-1]):''}else if(toggle){setting.active=control.checked;setting.value=control.checked?(field==='favourite'?'yes':'summon'):''}else{setting.value=control.value;setting.active=control.value!==''}updateRow();renderCards()};if(slider)control.oninput=edit;else control.onchange=edit;
 clear.onclick=()=>{setting.active=false;setting.value='';if(toggle)control.checked=false;else control.value=slider?'0':'';updateRow();renderCards()};updateRow();row.append(label,content,clear);parent.append(row);
}}
let comparedTroupeIds=new Set();
function openCardLightbox(c){$('compare-card-title').textContent=c.name;const image=$('compare-card-image');image.src='/'+c.source.image_path+'?quality=360';image.alt='Original cards for '+c.name;$('compare-card-dialog').showModal()}
function renderComparer(){const picker=$('compare-picker'),grid=$('compare-grid');picker.replaceChildren();grid.replaceChildren();for(const troupe of savedTroupes){const label=node('label',undefined,'compare-choice'),check=node('input');check.type='checkbox';check.checked=comparedTroupeIds.has(troupe.id);check.onchange=()=>{if(check.checked)comparedTroupeIds.add(troupe.id);else comparedTroupeIds.delete(troupe.id);renderComparer()};label.append(check,node('span',troupe.name));picker.append(label);if(!comparedTroupeIds.has(troupe.id))continue;const team=troupe.ids.map(id=>cards.find(c=>c.id===id)).filter(Boolean),panel=node('section',undefined,'compare-troupe');panel.append(node('h3',troupe.name));const factions=L.commonFactions(team);panel.append(node('p',team.length?(factions.length?factions.join(' / '):'No shared faction'):'Undecided','help'));const names=node('div',undefined,'compare-members');for(const c of team){const b=node('button',c.name);b.type='button';b.title='View '+c.name+' card';b.onclick=()=>openCardLightbox(c);names.append(b)}if(!team.length)names.append(node('p','Empty troupe','help'));panel.append(names);const chart=node('div');drawTroupeChart(team,chart);panel.append(chart);const keywords=node('div',undefined,'chips');for(const value of L.tally(team,'keywords'))keywords.append(node('span',value.label+' ×'+value.count,'chip'));panel.append(keywords);grid.append(panel)}if(!savedTroupes.length)picker.append(node('p','Create or import a troupe to compare it.','help'));else if(!grid.children.length)grid.append(node('p','Select troupes above to compare them.','help'))}
$('compare-troupes').onclick=()=>{comparedTroupeIds=new Set([...comparedTroupeIds].filter(id=>savedTroupes.some(t=>t.id===id)));if(!comparedTroupeIds.size)comparedTroupeIds=new Set([...new Set([activeTroupeId,...savedTroupes.map(t=>t.id)].filter(Boolean))].slice(0,2));renderComparer();$('compare-dialog').showModal()};
for(const [button,dialog] of [['compare-close','compare-dialog'],['compare-card-close','compare-card-dialog'],['share-close','share-dialog']])$(button).onclick=()=>$(dialog).close();
function encodeTroupe(troupe){const payload=JSON.stringify({n:troupe.name,c:troupe.ids.map(id=>cards.find(c=>c.id===id)?.name)});return 'MS1.'+btoa(Array.from(new TextEncoder().encode(payload),b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decodeTroupe(code){const value=code.trim();if(value.length>12000||!/^MS1\.[A-Za-z0-9_-]+$/.test(value))throw new Error('Enter a valid MS1 troupe code.');let data;try{const bytes=Uint8Array.from(atob(value.slice(4).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{throw new Error('This troupe code is damaged or incomplete.')}if(!data||typeof data.n!=='string'||!data.n.trim()||data.n.length>100||!Array.isArray(data.c)||data.c.length>6||!data.c.every(name=>typeof name==='string'))throw new Error('This code does not contain a valid six-slot troupe.');const team=[];for(const name of data.c){const c=cards.find(c=>c.name===name);if(!c)throw new Error('Unknown character: '+name);const reason=L.reason(c,team,'Undecided',6);if(reason)throw new Error(name+': '+reason);team.push(c)}return {name:data.n.trim(),ids:team.map(c=>c.id)}}
$('share-troupe').onclick=()=>{$('share-code').value=encodeTroupe(troupeSnapshot());$('import-code').value='';$('share-status').textContent='';$('share-dialog').showModal()};
$('copy-code').onclick=async()=>{try{await navigator.clipboard.writeText($('share-code').value);$('share-status').textContent='Code copied.'}catch{$('share-code').focus();$('share-code').select();$('share-status').textContent='Copy the selected code to share it.'}};
$('import-troupe').onclick=()=>{try{const troupe=decodeTroupe($('import-code').value),before=troupeCheckpoint();activeTroupeId=troupeId();applyTroupe(troupe);savedTroupes.push({id:activeTroupeId,...troupeSnapshot()});$('saved-troupes').value=activeTroupeId;if(!persist()){rollbackTroupe(before,'The imported troupe could not be saved.');throw new Error('Browser storage is unavailable. Import was not saved.')}repaintTroupe();$('share-dialog').close()}catch(error){$('share-status').textContent=error.message}};
$('clear-filters').onclick=()=>{factionQuickFilter=false;filterSettings={};renderFilters();renderCards()};$('find').oninput=renderCards;$('sort').onchange=renderCards;
(async()=>{try{const r=await fetch('/api/cards');if(!r.ok)throw new Error('Could not load cards');cards=(await r.json()).cards;restoreFavourites();restoreTroupes();$('load-status').textContent='';renderFilters();renderCards();refreshTeam();if(teamIds.length)show(members()[0]);else showGettingStarted();renderCards()}catch(e){$('load-status').textContent=e.message}})();
