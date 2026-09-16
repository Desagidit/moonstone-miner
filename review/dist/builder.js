const L=TeamLogic,$=id=>document.getElementById(id),clone=v=>JSON.parse(JSON.stringify(v));
let cards=[],focus=null,teamIds=[],query={mode:'and',groups:[]},visits=[],visitIndex=-1,savedTroupes=[],activeTroupeId=null,troupeName='New troupe',favouriteIds=new Set(),draggedMemberId=null;
const fields={favourite:'Favourite',keyword:'Keyword',tag:'Custom tag',faction:'Faction',eligibility:'Selectable / summon',melee:'Melee',arcane:'Arcane',evade:'Evade',range:'Melee range',hp:'Health',energy:'Energy',base:'Base size',version:'Card version',review:'Review status'};
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function option(value,text){const n=node('option',text);n.value=value;return n}
function labelledSelect(label,values,value,fn){const s=node('select');s.setAttribute('aria-label',label);for(const [v,t] of values)s.append(option(v,t));s.value=value;s.onchange=()=>fn(s.value);return s}
function members(){return teamIds.map(id=>cards.find(c=>c.id===id)).filter(Boolean)}
function troupeFactions(){const team=members();if(!team.length)return [];const shared=L.commonFactions(team);return shared.length?shared:team[0].factions}
function troupeFaction(){const factions=troupeFactions();return factions.length===1?factions[0]:'Undecided'}
function compatibleWithTroupe(c){const factions=troupeFactions();return !factions.length||factions.some(f=>c.factions.includes(f))}
function troupeReason(c){if(!compatibleWithTroupe(c))return 'Outside '+troupeFactions().join(' / ');return L.reason(c,members(),'Undecided',6)}
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
 $('rename-troupe').disabled=!chosen;$('save-troupe').disabled=!active||select.value!==activeTroupeId;
 $('storage-status').textContent=!savedTroupes.length?'Click New to create a troupe.':!active?'Select a troupe.':JSON.stringify(troupeSnapshot())===JSON.stringify(cleanTroupe(active))?'Saved locally':'Unsaved changes · click Save to keep this troupe';
}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify({version:2,activeId:activeTroupeId,draft:troupeSnapshot(),troupes:savedTroupes}));try{localStorage.setItem('moonstone-troupe-v1',JSON.stringify(troupeSnapshot()))}catch{}updateStorageControls();return true}catch{$('storage-status').textContent='Browser storage is unavailable. Troupes cannot be saved.';return false}}
function restoreTroupes(){try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');let draft;if(saved?.version===2&&Array.isArray(saved.troupes)){const used=new Set();savedTroupes=saved.troupes.flatMap(t=>{const clean=cleanTroupe(t);if(!clean||typeof t.id!=='string'||used.has(t.id))return [];used.add(t.id);return [{id:t.id,...clean}]});activeTroupeId=savedTroupes.some(t=>t.id===saved.activeId)?saved.activeId:null;draft=cleanTroupe(saved.draft)}else draft=cleanTroupe(JSON.parse(localStorage.getItem('moonstone-troupe-v1')||'null'));if(draft)applyTroupe(draft);updateStorageControls()}catch{$('storage-status').textContent='Saved troupe data could not be read. You can create a new troupe.'}}
function applyTroupe(troupe){teamIds=[...troupe.ids];troupeName=troupe.name}
function repaintTroupe(){renderCards();refreshTeam();if(focus)show(focus,false)}
let pendingTroupeId=null;
function closeTroupeSwitchDialog(){pendingTroupeId=null;$('troupe-switch-dialog').close()}
function switchTroupe(id,saveCurrent=false){const target=savedTroupes.find(t=>t.id===id);if(!target)return false;const before=troupeCheckpoint();if(saveCurrent){const index=savedTroupes.findIndex(t=>t.id===activeTroupeId);if(index<0)return false;savedTroupes[index]={id:activeTroupeId,...troupeSnapshot()}}activeTroupeId=id;applyTroupe(cleanTroupe(target));$('saved-troupes').value=id;if(!persist()){rollbackTroupe(before,'Browser storage is unavailable. The troupe was not switched.');$('troupe-switch-error').textContent='Changes could not be saved. Try again or Cancel.';return false}repaintTroupe();return true}
$('saved-troupes').onchange=()=>{const id=$('saved-troupes').value;if(id===activeTroupeId||!savedTroupes.some(t=>t.id===id))return;$('saved-troupes').value=activeTroupeId||'';const active=savedTroupes.find(t=>t.id===activeTroupeId);if(active&&JSON.stringify(troupeSnapshot())!==JSON.stringify(cleanTroupe(active))){pendingTroupeId=id;$('troupe-switch-message').textContent=troupeName+' has unsaved changes.';$('troupe-switch-error').textContent='';$('troupe-switch-dialog').showModal();$('troupe-switch-save').focus()}else switchTroupe(id)};
$('troupe-switch-cancel').onclick=closeTroupeSwitchDialog;
$('troupe-switch-dialog').oncancel=()=>{pendingTroupeId=null};
$('troupe-switch-dialog').onclick=e=>{if(e.target===$('troupe-switch-dialog'))closeTroupeSwitchDialog()};
$('troupe-switch-discard').onclick=()=>{if(pendingTroupeId&&switchTroupe(pendingTroupeId))closeTroupeSwitchDialog()};
$('troupe-switch-save').onclick=()=>{if(pendingTroupeId&&switchTroupe(pendingTroupeId,true))closeTroupeSwitchDialog()};
function troupeId(){return globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)}
function rollbackTroupe(before,message){savedTroupes=before.troupes;activeTroupeId=before.id;applyTroupe(before.draft);$('saved-troupes').value=before.selected;updateStorageControls();$('storage-status').textContent=message}
function troupeCheckpoint(){return {troupes:clone(savedTroupes),id:activeTroupeId,draft:troupeSnapshot(),selected:$('saved-troupes').value}}
$('save-troupe').onclick=()=>{const index=savedTroupes.findIndex(t=>t.id===activeTroupeId);if(index<0||$('saved-troupes').value!==activeTroupeId)return;const before=troupeCheckpoint();savedTroupes[index]={id:activeTroupeId,...troupeSnapshot()};if(!persist())rollbackTroupe(before,'Browser storage is unavailable. Troupes cannot be saved.')};
let nameDialogAction=null;
function openTroupeNameDialog(id=null){const saved=id?savedTroupes.find(t=>t.id===id):null;if(id&&!saved)return;nameDialogAction={id};$('troupe-name-title').textContent=id?'Rename troupe':'New troupe';$('troupe-name-confirm').textContent=id?'Rename':'Create troupe';$('troupe-name-input').value=saved?.name||'';$('troupe-name-error').textContent='';$('troupe-name-dialog').showModal();$('troupe-name-input').focus();if(id)$('troupe-name-input').select()}
function closeTroupeNameDialog(){nameDialogAction=null;$('troupe-name-dialog').close()}
$('new-troupe').onclick=()=>openTroupeNameDialog();
$('rename-troupe').onclick=()=>{const id=$('saved-troupes').value;if(savedTroupes.some(t=>t.id===id))openTroupeNameDialog(id)};
$('troupe-name-cancel').onclick=closeTroupeNameDialog;
$('troupe-name-dialog').oncancel=()=>{nameDialogAction=null};
$('troupe-name-dialog').onclick=e=>{if(e.target===$('troupe-name-dialog'))closeTroupeNameDialog()};
$('troupe-name-form').onsubmit=e=>{e.preventDefault();if(!nameDialogAction)return;const name=$('troupe-name-input').value.trim().slice(0,100);if(!name){$('troupe-name-error').textContent='Enter a troupe name.';$('troupe-name-input').focus();return}const before=troupeCheckpoint(),id=nameDialogAction.id;if(id){const saved=savedTroupes.find(t=>t.id===id);if(!saved)return;saved.name=name;if(id===activeTroupeId)troupeName=name}else{activeTroupeId=troupeId();applyTroupe({name,ids:[]});savedTroupes.push({id:activeTroupeId,...troupeSnapshot()});$('saved-troupes').value=activeTroupeId}if(!persist()){rollbackTroupe(before,'Browser storage is unavailable. Changes were not saved.');$('troupe-name-error').textContent='Browser storage is unavailable. Try again.';return}closeTroupeNameDialog();$('notice').textContent='';repaintTroupe()};
function svgNode(tag,attributes){const element=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,value);return element}
function renderTroupeChart(){const axes=L.metricAxes,values=L.troupeMetrics(members()),parent=$('troupe-chart');parent.replaceChildren();const svg=svgNode('svg',{viewBox:'-10 0 380 320',role:'img','aria-label':'Troupe profile: '+axes.map(key=>key+' '+values[key].toFixed(1)+' out of 5').join(', '),class:'troupe-radar'});const point=(index,scale)=>{const angle=-Math.PI/2+index*Math.PI/3;return [180+Math.cos(angle)*scale,160+Math.sin(angle)*scale]},points=scale=>axes.map((_,i)=>point(i,scale).join(',')).join(' ');for(let level=1;level<=5;level++)svg.append(svgNode('polygon',{points:points(level*20),class:'radar-grid'}));axes.forEach((key,index)=>{const [x,y]=point(index,100);svg.append(svgNode('line',{x1:180,y1:160,x2:x,y2:y,class:'radar-spoke'}));const [lx,ly]=point(index,126),label=svgNode('text',{x:lx,y:ly,'text-anchor':index===0||index===3?'middle':index<3?'start':'end','dominant-baseline':'middle',class:'radar-label'});label.textContent=key;svg.append(label)});svg.append(svgNode('polygon',{points:axes.map((key,i)=>point(i,values[key]*20).join(',')).join(' '),class:'radar-area'}));axes.forEach((key,i)=>{const [cx,cy]=point(i,values[key]*20);svg.append(svgNode('circle',{cx,cy,r:3,class:'radar-dot'}))});parent.append(svg);const summary=$('metric-summary');summary.replaceChildren();for(const key of axes){const row=node('span');row.append(node('span',key),node('strong',values[key].toFixed(1)));summary.append(row)}}
function chips(parent,labels){parent.replaceChildren();for(const label of labels)parent.append(node('span',label,'chip tag'))}
function summary(id,field){const values=L.tally(members(),field);chips($(id),values.map(v=>`${v.label} ×${v.count}`));if(!values.length)$(id).append(node('span','None yet','help'))}
function refreshTeam(){
 const list=$('team');list.replaceChildren();const current=members();
 for(let index=0;index<6;index++){
  const c=current[index],row=node('div',undefined,'member'+(!c?' empty-slot':compatibleWithTroupe(c)?'':' incompatible'));
  row.append(node('span',String(index+1),'slot-number'));wireMemberDrop(row,index);
  if(c){
   row.draggable=true;row.setAttribute('data-member-id',c.id);
   const handle=node('button','⠿','drag-handle');handle.type='button';handle.title='Drag to reorder, or use arrow keys';handle.setAttribute('aria-label','Reorder '+c.name+'. Use up and down arrow keys.');handle.onkeydown=e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();const target=index+(e.key==='ArrowUp'?-1:1);reorderMember(c.id,target);const replacement=[...$('team').children].find(n=>n.getAttribute('data-member-id')===c.id);replacement?.children[1]?.focus()};
   const open=node('button',c.name,'member-name');open.type='button';open.onclick=()=>{show(c);renderCards()};
   const removeButton=node('button','×','member-remove');removeButton.type='button';removeButton.setAttribute('aria-label','Remove '+c.name);removeButton.onclick=()=>remove(c);
   row.append(handle,open,removeButton);
   row.ondragstart=e=>{draggedMemberId=c.id;if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',c.id)}row.setAttribute('data-dragging','true')};
   row.ondragend=()=>{draggedMemberId=null;for(const slot of $('team').children){slot.removeAttribute('data-drag-over');slot.removeAttribute('data-dragging')}};
  }else row.append(node('span','Empty slot','help'));
  list.append(row);
 }
 const factions=troupeFactions(),bad=current.filter(c=>!compatibleWithTroupe(c)||!c.eligibility.selectable||current.some(t=>t.id!==c.id&&L.conflict(c,t))),noShared=current.length>0&&!L.commonFactions(current).length;
 $('troupe-faction').textContent=current.length?'Faction · '+factions.join(' / '):'Faction · add a character to slot 1';
 $('team-status').textContent=`${current.length} / 6 characters`+(bad.length?` · ${bad.length} incompatible`:'')+(noShared?' · no shared faction':'')+(current.length===6&&!bad.length&&!noShared?' · ready':'');$('team-status').className=bad.length||noShared?'invalid':'';
 summary('tag-summary','custom_tags');summary('keyword-summary','keywords');renderTroupeChart();if(focus)renderPartners(focus);
}
function remove(c){teamIds=teamIds.filter(id=>id!==c.id);persist();refreshTeam();renderCards();if(focus)show(focus,false)}
function add(c,keepFocus=false){const reason=troupeReason(c);if(reason){$('notice').textContent=reason;return}teamIds.push(c.id);$('notice').textContent='';persist();refreshTeam();renderCards();show(keepFocus&&focus?focus:c,!keepFocus)}
const favouritesKey='moonstone-favourites-v1';
function restoreFavourites(){try{const saved=JSON.parse(localStorage.getItem(favouritesKey)||'[]');favouriteIds=new Set(Array.isArray(saved)?saved.filter(id=>typeof id==='string'&&cards.some(c=>c.id===id)):[])}catch{favouriteIds=new Set()}}
function toggleFavourite(c){if(favouriteIds.has(c.id))favouriteIds.delete(c.id);else favouriteIds.add(c.id);try{localStorage.setItem(favouritesKey,JSON.stringify([...favouriteIds]))}catch{$('notice').textContent='Browser storage is unavailable. Favourites will last until this page closes.'}renderCards()}
function renderCards(){
 const q=$('find').value.toLowerCase().trim();
 const filtered=cards.filter(c=>(!q||[c.name,...c.keywords,...c.custom_tags].join(' ').toLowerCase().includes(q))&&L.matches(c,query,{favourites:favouriteIds}));
 const sort=$('sort').value;filtered.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):(L.numeric[sort](b)??-Infinity)-(L.numeric[sort](a)??-Infinity)||a.name.localeCompare(b.name));
 $('result-count').textContent=`${filtered.length} / ${cards.length}`;const list=$('catalogue'),scrollTop=list.scrollTop;list.replaceChildren();
 for(const c of filtered){
  const incompatible=!compatibleWithTroupe(c),inTeam=teamIds.includes(c.id),favourite=favouriteIds.has(c.id);
  const panel=node('div',undefined,'character'+(focus?.id===c.id?' active':'')+(incompatible?' incompatible':''));
  const open=node('button',undefined,'character-open');open.type='button';open.setAttribute('aria-label','View '+c.name);
  const heading=node('span',undefined,'character-heading');heading.append(node('strong',c.name));
  if(inTeam){const tick=node('span','✓','troupe-tick');tick.title='In your troupe';tick.setAttribute('role','img');tick.setAttribute('aria-label','In your troupe');heading.append(tick)}
  open.append(heading,node('small',c.factions.join(' / ')+(c.eligibility.summoned_only?' · Summon':'')),node('div',`HP ${c.stats.health} · Energy ${c.stats.energy} · Melee ${c.stats.melee??'—'} · Arcane ${c.stats.arcane??'—'} · Evade ${c.stats.evade??'—'}`,'statline'));
  const footer=node('div',undefined,'character-footer'),star=node('button',favourite?'★':'☆','favourite-star'+(favourite?' selected':''));star.type='button';star.title=(favourite?'Remove from':'Add to')+' favourites';star.setAttribute('aria-label',(favourite?'Remove '+c.name+' from':'Add '+c.name+' to')+' favourites');star.setAttribute('aria-pressed',String(favourite));star.onclick=e=>{e.stopPropagation();toggleFavourite(c)};
  footer.append(node('small',c.keywords.join(' · ')),star);panel.append(open,footer);
  if(incompatible)panel.append(node('span','Outside '+troupeFactions().join(' / '),'compatibility'));
  panel.onclick=()=>{show(c);renderCards()};list.append(panel);
 }
 if(!filtered.length)list.append(node('p','No cards match these filters.'));list.scrollTop=scrollTop;
}
function show(c,recordVisit=true){
 if(recordVisit&&visits[visitIndex]!==c.id){visits=visits.slice(0,visitIndex+1);visits.push(c.id);visitIndex=visits.length-1}
 focus=c;renderPartners(c);const p=$('focused');p.replaceChildren();
 const actions=node('div',undefined,'focus-actions');
 const inTeam=teamIds.includes(c.id),reason=troupeReason(c);
 const b=node('button',inTeam?'Remove from troupe':'Add to troupe','primary');b.disabled=!inTeam&&!!reason;b.onclick=()=>inTeam?remove(c):add(c);actions.append(b);
 const navigation=node('div',undefined,'card-navigation');
 for(const [label,offset] of [['Previous',-1],['Next',1]]){const nav=node('button',label);nav.type='button';nav.disabled=offset<0?visitIndex<=0:visitIndex>=visits.length-1;nav.setAttribute('aria-label',label+' viewed character');nav.onclick=()=>{const next=visitIndex+offset;if(next<0||next>=visits.length)return;visitIndex=next;show(cards.find(v=>v.id===visits[visitIndex]),false);renderCards()};navigation.append(nav)}
 actions.append(navigation);
 const links=node('div',undefined,'focus-links');
 if(!inTeam&&reason)links.append(node('span',reason,'compatibility'));
 const review=node('a','Review this card ↗');review.href='/?page='+c.source.pdf_page;review.target='_blank';review.rel='noopener';links.append(review);
 if(c.miniature?.store_url){const store=node('a','Mini store ↗');store.href=c.miniature.store_url;store.target='_blank';store.rel='noopener';links.append(store)}
 if(c.miniature?.image_url){const photo=node('button','▧','mini-photo');photo.type='button';photo.title='View painted miniature';photo.setAttribute('aria-label','View painted miniature for '+c.name);photo.onclick=()=>openMiniature(c);links.append(photo)}
 actions.append(...links.children);p.append(actions);
 const imageFrame=node('div',undefined,'focus-image-frame'),image=node('img');image.src='/'+c.source.image_path+'?quality=360';image.alt='Original cards for '+c.name;image.className='focused-image';imageFrame.append(image);p.append(imageFrame);
 renderRelated(c,p);renderGuide(c,p);
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
function renderGuide(c,parent){
 const guide=c.strategy_guide;if(!guide)return;
 const section=node('section',undefined,'strategy-guide');section.append(node('h3','Quick strategy guide'),node('p',guide.role,'guide-role'));
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
 const target=$('partners');target.replaceChildren();$('partner-heading').textContent='Partners for '+c.name;
 const set=L.partnerSet(c,troupeFaction(),members());
 if(!set){target.append(node('p','No compatible partner core for this troupe. Reorder or remove members to change its faction.','help'));return}
 target.append(node('p',set.faction+(c.eligibility.summoned_only?' · summon support core':' · four-character core'),'partner-faction'),node('p',set.plan,'partner-plan'));
 for(const suggested of set.partners){
  const partner=cards.find(v=>v.id===suggested.character_id);if(!partner)continue;
  const row=node('div',undefined,'partner'),name=node('button',partner.name,'partner-name');name.onclick=()=>{show(partner);renderCards()};
  const reason=troupeReason(partner),inTeam=teamIds.includes(partner.id),b=node('button',inTeam?'Added':'Add','partner-add');b.disabled=inTeam||!!reason;b.title=reason||'Add '+partner.name+' to troupe';b.setAttribute('aria-label',b.title);b.onclick=()=>add(partner,true);
  row.append(name,node('p',suggested.reason,'partner-reason'),b);if(reason&&!inTeam)row.append(node('small',reason,'compatibility'));target.append(row);
 }
}
function choices(field){if(field==='favourite')return [['yes','Yes'],['no','No']];if(field==='keyword'||field==='tag'||field==='faction')return [...new Set(cards.flatMap(c=>field==='keyword'?c.keywords:field==='tag'?c.custom_tags:c.factions))].sort().map(v=>[v,v]);if(field==='eligibility')return [['selectable','Selectable'],['summon','Summon']];if(field==='review')return [['verified','Verified'],['in_progress','In progress'],['unverified','Unverified']];return null}
function defaultRule(){return {field:'hp',op:'gte',value:'8'}}
function renderFilters(){const target=$('filter-groups');target.replaceChildren();query.groups.forEach((g,i)=>{const box=node('div',undefined,'filter-group');const head=node('div',undefined,'group-head');head.append(node('span','Group '+(i+1)),labelledSelect('Combine rules in group '+(i+1),[['and','AND — every rule'],['or','OR — any rule']],g.mode,v=>{g.mode=v;renderCards()}));const del=node('button','×');del.setAttribute('aria-label','Remove filter group '+(i+1));del.onclick=()=>{query.groups.splice(i,1);renderFilters();renderCards()};head.append(del);box.append(head);g.rules.forEach((r,j)=>{const row=node('div',undefined,'rule');row.append(labelledSelect('Filter field',Object.entries(fields),r.field,v=>{r.field=v;r.op=L.numeric[v]?'gte':'eq';r.value=L.numeric[v]?'0':choices(v)[0]?.[0]||'';renderFilters();renderCards()}));const ops=L.numeric[r.field]?[['eq','='],['ne','≠'],['gte','≥'],['lte','≤'],['gt','>'],['lt','<']]:[['eq','is'],['ne','is not']];row.append(labelledSelect('Comparison',ops,r.op,v=>{r.op=v;renderCards()}));const vals=choices(r.field);if(vals)row.append(labelledSelect('Filter value',vals,r.value,v=>{r.value=v;renderCards()}));else{const v=node('input');v.type='number';v.value=r.value;v.setAttribute('aria-label','Filter value');v.oninput=()=>{r.value=v.value;renderCards()};row.append(v)}const remove=node('button','×');remove.setAttribute('aria-label','Remove rule '+(j+1));remove.onclick=()=>{g.rules.splice(j,1);renderFilters();renderCards()};row.append(remove);box.append(row)});const add=node('button','Add rule');add.onclick=()=>{g.rules.push(defaultRule());renderFilters();renderCards()};box.append(add);target.append(box)})}
$('add-group').onclick=()=>{query.groups.push({mode:'and',rules:[defaultRule()]});renderFilters();renderCards()};$('clear-filters').onclick=()=>{query={mode:'and',groups:[]};$('outer-mode').value='and';renderFilters();renderCards()};$('outer-mode').onchange=()=>{query.mode=$('outer-mode').value;renderCards()};$('find').oninput=renderCards;$('sort').onchange=renderCards;
(async()=>{try{const r=await fetch('/api/cards');if(!r.ok)throw new Error('Could not load cards');cards=(await r.json()).cards;restoreFavourites();restoreTroupes();$('load-status').textContent=cards.length+' cards';renderFilters();renderCards();refreshTeam();show(cards.find(c=>c.eligibility.selectable&&compatibleWithTroupe(c))||cards[0]);renderCards()}catch(e){$('load-status').textContent=e.message}})();
