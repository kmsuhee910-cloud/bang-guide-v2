/* V2 scenes illustrate rules. Only arrow/navigation buttons change scenes. */
'use strict';
window.BangHealth=(el,img,life,character='lucky',compact=false,width=48)=>{
  const count=Math.max(0,Math.min(5,life));
  const reveal=count?0.08+count*0.16:0;
  const cardHeight=width*640/452,pairHeight=cardHeight*(1+reveal);
  const planes=el('div',{class:'health-planes'},img('character-back','','health-back'),img(character,'','health-front'));
  planes.style.width=`${width}px`;planes.style.height=`${cardHeight}px`;
  planes.children[1].style.top=`${reveal*100}%`;
  const pair=el('div',{class:'health-pair'},planes);
  pair.style.width=`${width}px`;pair.style.height=`${pairHeight}px`;
  const marker=el('div',{class:`health-marker${compact?' horizontal':''}`,role:'img','data-health':count,'data-front-offset':reveal,'aria-label':`인물 카드로 총알 ${count}개가 보이게 표시한 체력`},pair);
  if(compact){marker.style.width=`${pairHeight}px`;marker.style.height=`${width}px`;pair.style.transform=`translateX(${pairHeight}px) rotate(90deg)`;}
  return marker;
};

window.BangTutorial=ctx=>{
 const L=window.BangLesson,D=window.BangData,{el,img}=ctx;
 const names=new Map([...D.roles,...D.people,...D.cards].map(c=>[c.id,c.name]));
 const routes=new Map([...D.roles.map(c=>[c.id,`entry/roles/${c.id}`]),...D.people.map(c=>[c.id,`entry/people/${c.id}`]),...D.cards.map(c=>[c.id,`entry/cards/${c.id}`]),['playing-back','component/cards'],['role-back','component/roles'],['character-back','component/people'],['bullet-token','component/bullets']]);
 const link=(text,route)=>el('button',{type:'button',class:'v2-inline-link',onclick:()=>ctx.go(route)},text);
 const card=(asset,cls='',interactive=true)=>{
  const picture=img(asset,`${names.get(asset)||'카드'} 예시`,cls);
  if(!interactive||!routes.has(asset))return picture;
  return el('button',{type:'button',class:'v2-image-link',onclick:()=>ctx.go(routes.get(asset)),'aria-label':`${names.get(asset)||'카드'} 설명 보기`},picture);
 };
 function bullets(count){return el('div',{class:'v2-bullets','data-bullets':count,'aria-label':`총알 ${count}개`},Array.from({length:count},()=>el('span',{class:'v2-token-frame'},card('bullet-token','v2-token'))));}
 const group=(label,...children)=>el('div',{class:'v2-example-group'},label?el('strong',{},label):null,...children);
 const arrow=()=>el('span',{class:'v2-transfer-arrow','aria-hidden':'true'},'→');
 const fan=(count,asset='playing-back')=>{const node=el('div',{class:'v2-card-fan','data-card-count':count},Array.from({length:count},()=>card(asset)));node.style.setProperty('--fan-width',count<=2?'50%':count===3?'37%':'28%');return node;};
 const mini=assets=>el('div',{class:'v2-mini-cards'},assets.map(asset=>card(asset)));
 const pile=(asset='playing-back')=>el('div',{class:'v2-pile','aria-label':asset==='character-back'?'인물 카드 더미':'게임 카드 더미'},Array.from({length:3},()=>card(asset)));
 const transfer=(from,to)=>el('div',{class:'v2-transfer'},from,arrow(),to);
 const overlap=(assets,cls='')=>{
  const node=el('div',{class:`v2-overlap ${cls}`,'data-card-count':assets.length});node.style.setProperty('--layers',assets.length-1);
  assets.forEach((asset,i)=>{const layer=el('div',{class:'v2-overlap-layer'},card(asset));layer.style.left=`${i*8}px`;node.append(layer);});return node;
 };
 function missedSymbol(){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 85 100 75');svg.setAttribute('class','v2-missed-symbol');svg.setAttribute('role','img');svg.setAttribute('aria-label','요약 카드의 빗나감 기호');
  const source=document.createElementNS('http://www.w3.org/2000/svg','image');source.setAttribute('href','media/summary.png');source.setAttribute('width','640');source.setAttribute('height','387');svg.append(source);return svg;
 }
 const discardZones=(keepLabel,keepAssets)=>el('div',{class:'v2-card-zones'},
  el('div',{class:'v2-card-zone keep'},el('strong',{},keepLabel),el('div',{class:'v2-zone-cards '+(keepAssets.length>1?'v2-placed-cards':'v2-reveal-cards')},...keepAssets.map(asset=>card(asset)))),
  el('div',{class:'v2-card-zone discard'},el('strong',{},'버릴 카드'),el('div',{class:'v2-zone-cards v2-discard-cards'},mini(['bang','beer','remington','barrel']))));
 function person(label,cls=''){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 48 56');svg.setAttribute('aria-hidden','true');
  const head=document.createElementNS('http://www.w3.org/2000/svg','circle');head.setAttribute('cx','24');head.setAttribute('cy','14');head.setAttribute('r','10');
  const body=document.createElementNS('http://www.w3.org/2000/svg','path');body.setAttribute('d','M6 52V43a18 18 0 0 1 36 0v9Z');svg.append(head,body);
  return el('div',{class:`v2-person ${cls}`},svg,el('strong',{},label));
 }
 function circle(n,options={}){
  const alive=Array.from({length:n},(_,i)=>i).filter(i=>i!==options.eliminated);
  const ring=el('div',{class:'v2-distance-ring','data-participants':n});
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','v2-ring-lines');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
  const points=Array.from({length:n},(_,i)=>{const angle=Math.PI/2+i*Math.PI*2/n;return {x:50+38*Math.cos(angle),y:50+37*Math.sin(angle)};});
  if(options.level){
   for(let i=0;i<n;i++){
    if(i===options.eliminated)continue;
    const j=alive[(alive.indexOf(i)+1)%alive.length],a=points[i],b=points[j];
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),padding=Math.min(15,len/2-1);
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    for(const [k,v]of Object.entries({'data-from':i,'data-to':j,x1:a.x+dx/len*padding,y1:a.y+dy/len*padding,x2:b.x-dx/len*padding,y2:b.y-dy/len*padding,stroke:'#b08e75','stroke-width':.6}))line.setAttribute(k,v);
    svg.append(line);
   }
  }
  ring.append(svg);
  points.forEach((point,i)=>{
   const distance=L.distanceBetween(0,i,alive),dead=i===options.eliminated;
   const shown=true;
   const reachable=i!==0&&!dead&&(options.level?distance===options.level:options.allTargets||options.range&&distance<=options.range);
   const node=el('div',{class:`v2-seat${reachable?' reachable':''}${dead?' out':''}`,'data-seat':i,'data-distance':distance??'out','data-reachable':String(!!reachable)},
    person(i===0?'나':''),el('small',{},dead?'탈락':i===0?'':`거리 ${distance}`));
   node.style.left=`${point.x}%`;node.style.top=`${point.y}%`;ring.append(node);
  });
  ring.append(el('span',{class:'v2-ring-center'},options.eliminated!==undefined?'살아 있는 사람만 세어요':options.allTargets?'나를 제외한 모두':options.range?(options.range===1?'기본 사거리':`사거리 ${options.range}\n테두리 안: 공격 가능`):'' ));
  return ring;
 }
 function searchIcon(){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
  const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('cx','10');circle.setAttribute('cy','10');circle.setAttribute('r','6');
  const line=document.createElementNS('http://www.w3.org/2000/svg','path');line.setAttribute('d','M15 15L21 21');
  svg.append(circle,line);return svg;
 }
 let lockedUntil=0;
 function screen(id){
  const learning=ctx.learning(),n=learning.playerCount;
  let sequence=L.scenes(n).filter(s=>s.id!=='search-tip'||!learning.seenSearchHint||id==='search-tip');
  const index=sequence.findIndex(s=>s.id===id),scene=sequence[index];if(!scene)return null;
  if(id==='search-tip'){learning.seenSearchHint=true;ctx.persist();}
  const example=L.example(id,n),same=sequence.filter(s=>s.chapter===scene.chapter),step=same.findIndex(s=>s.id===id)+1;
  const title=L.chapters.find(c=>c[0]===scene.chapter)[1],section=L.groupFor(id);const grouped=L.groups[scene.chapter];
  function move(offset){if(Date.now()<lockedUntil)return;const next=sequence[index+offset];if(!next)return;lockedUntil=Date.now()+250;ctx.go(`learn/${next.id}`);}
  const roleCounts=D.roleSetups[n];
  function goals(){return el('div',{class:'v2-role-goals'},D.roles.map(r=>{
   const text=D.roleGoals[r.id],splitAt=r.id==='outlaw'?text.indexOf(' 단,'):r.id==='renegade'?text.indexOf(' 다른'): -1;
   const primary=splitAt<0?text:text.slice(0,splitAt),extra=splitAt<0?'':text.slice(splitAt).trim();
   return el('article',{class:'v2-goal'},card(r.id),el('div',{},el('h3',{},link(r.name,`entry/roles/${r.id}`),` · ${roleCounts[r.id]}명`),el('p',{},el('strong',{class:'v2-goal-primary'},primary),extra?el('span',{class:'v2-goal-extra'},extra):null)));
  }));}
  function prepBoard(count=0,showPerson=true){
   const stage=el('div',{class:'v2-prep-board'},img('board','보드'),el('div',{class:'v2-prep-slot role'},card('sheriff')),
    showPerson?el('div',{class:'v2-prep-slot character'},card('lucky')):null);
   for(let i=0;i<count;i++){const token=el('div',{class:'v2-prep-token'},card('bullet-token'));token.style.left=`${[13,32,50,69,88][i]}%`;stage.append(token);}return stage;
  }
  function illustration(){
   switch(scene.kind){
    case 'board':{
     const board=el('div',{class:'v2-labelled-board'},img('board','역할·인물·무기 카드와 총알을 놓는 보드'),...['역할','인물','무기'].map((label,i)=>el('span',{class:`v2-board-label slot-${i}`},label)));
     return board;
    }
    case 'sheriff':return el('div',{class:'v2-prep-composition'},card('sheriff'));
    case 'roles':return el('div',{class:'v2-roles-v1'},el('div',{class:'v2-role-pictures'},D.roles.filter(r=>roleCounts[r.id]).map(r=>group(`${r.name} ${roleCounts[r.id]}명`,overlap(Array(roleCounts[r.id]).fill(r.id),'v2-role-stack')))),card('role-back'));
    case 'goals':return goals();
    case 'character':return el('div',{class:'v2-character-example'},pile('character-back'),arrow(),group('',card('lucky'),el('strong',{class:'v2-image-caption'},'공개하고 능력을 읽어요')));
    case 'bullets':return el('div',{class:'v2-prep-composition'},el('div',{class:'v2-prep-token-row'},card('lucky'),bullets(4)));
    case 'bonus':return el('div',{class:'v2-prep-composition'},el('div',{class:'v2-prep-token-row'},card('sheriff'),bullets(1)));
    case 'deck':return el('div',{class:'v2-deck-pair'},group('가져올 카드 자리',pile()),group('버린 카드 자리',el('div',{class:'v2-discard-space'},'사용한 카드는\n여기에 모아요')));
    case 'deal':return el('div',{class:'v2-starting-cards'},bullets(5),el('span',{class:'v2-transfer-arrow','aria-hidden':'true'},'↓'),fan(5));
    case 'ready':return el('div',{class:'v2-ready-icon'},person('보안관'),el('span',{},'→ 시계 방향'));
    case 'draw':return transfer(group('카드 더미',pile()),group('가져온 카드 두 장',fan(2)));
    case 'search-tip':return el('div',{class:'v2-search-tip-mark'},el('span',{'aria-hidden':'true'},'↑'),el('strong',{},'상단의 돋보기 + 카드 검색'));
    case 'use':return el('div',{class:'v2-type-cards'},group('갈색',card('bang')),group('파란색',card('barrel')),group('파란색 · 무기',card('remington')));
    case 'brown':return transfer(group('사용하기',card('bang')),group('버리기',el('span',{class:'v2-zero'},'×')));
    case 'blue':return el('div',{class:'v2-blue-board'},img('board','보드'),card('barrel','v2-arrived'));
    case 'weapon-type':return transfer(group('무기 카드',card('remington')),group('무기 칸 · 사거리 3',el('div',{class:'v2-weapon-slot'},card('remington','v2-arrived'))));
    case 'discard':return el('div',{class:'v2-discard-example'},bullets(3),transfer(fan(5),fan(3)));
    case 'turn-done':return el('div',{class:'v2-ready-icon'},person('나'),arrow(),person('다음 사람'));
    case 'distance':{let level=learning.distanceLevels?.[id]||scene.level;const area=el('div',{class:'v2-distance-tap',role:'button',tabindex:'0','aria-label':'다음 거리 예시 보기'});const update=()=>{area.replaceChildren(circle(n,{level}));requestAnimationFrame(fitLines);};const advance=()=>{level=level%Math.floor(n/2)+1;learning.distanceLevels={...(learning.distanceLevels||{}),[id]:level};ctx.persist();update();};area.addEventListener('click',advance);area.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();advance();}});update();return area;}
    case 'range':return circle(n,{range:1});
    case 'gatling':return el('div',{},transfer(card('gatling'),group('나를 제외한 모두',el('div',{class:'v2-crowd'},person(''),person(''),person('')),el('div',{class:'v2-token-delta'},'−1',bullets(1)))));
    case 'attack':return el('div',{},transfer(card('bang'),group('상대',person(''),el('div',{class:'v2-token-delta'},'−1',bullets(1)))));
    case 'volcanic':return el('div',{class:'v2-volcanic-example'},card('volcanic'),overlap(['bang','bang','bang'],'v2-bang-stack'));
    case 'weapon-range':{const ring=circle(n,{range:3}),center=ring.querySelector('.v2-ring-center');center.className+=' v2-range-weapon';center.replaceChildren(card('remington'),el('strong',{},'사거리 3'));return ring;}
    case 'defend':return group('',el('div',{class:'v2-defense-stack'},el('div',{class:'v2-attacking-card'},card('bang'),el('span',{class:'v2-attack-card-label'},'상대가 낸 뱅!')),el('div',{class:'v2-blocking-card'},card('missed'))),el('strong',{class:'v2-image-caption'},'빗나감으로 막기'));
    case 'barrel':return el('div',{class:'v2-barrel-example'},transfer(group('앞에 놓인 술통',card('barrel')),group('뒤집은 카드 · 하트 10',el('div',{class:'v2-judgment'},card('beer'),el('span',{},'♥ 하트')))),el('div',{class:'v2-blocked-symbol'},el('span',{class:'v2-transfer-arrow','aria-hidden':'true'},'↓'),missedSymbol(),el('strong',{},'막음')));
    case 'barrel-fail':return transfer(group('',el('p',{},'판정 실패 → 판정 카드는 버려요')),group('이어서 빗나감 사용',card('missed','v2-arrived')));
    case 'damage':return el('div',{},transfer(group('공격받기 전 · 총알 4개',bullets(4)),group('막지 못한 뒤 · 총알 3개',bullets(3))),group('내려놓은 총알 1개',bullets(1)));
    case 'beer':return transfer(card('beer'),group('',person('나'),el('div',{class:'v2-token-delta'},'+1',bullets(1))));
    case 'beer-limits':return el('div',{class:'v2-limit-example'},group('맥주',card('beer')),el('div',{},el('p',{},'내 차례: 사용 가능'),el('p',{},'다른 사람 차례: 마지막 총알을 잃는 순간만'),el('strong',{},'생존자 2명: 효과 없음')));
    case 'saloon':return transfer(card('saloon'),group('나를 포함한 모두',el('div',{class:'v2-crowd'},person(''),person(''),person('')),el('div',{class:'v2-token-delta'},'+1',bullets(1))));
    case 'eliminate':return transfer(group('',el('strong',{},'총알 0개')),group('탈락',el('span',{class:'v2-zero'},'×')));
    case 'eliminated':return discardZones('공개한 카드',['outlaw']);
    case 'closer':return circle(n,{level:Math.floor(n/2),eliminated:1});
    case 'penalty':return discardZones('유지할 카드',['sheriff','lucky']);
    case 'reward':return el('div',{},group('탈락한 무법자',card('outlaw','v2-small-card')),transfer(group('카드 더미에서',pile()),group('탈락시킨 사람에게 3장',fan(3))));
    case 'outlaws-win':case 'renegade-win':case 'sheriff-win':{
     const winners=id==='outlaws-win'?['outlaw']:id==='renegade-win'?['renegade']:n===4?['sheriff']:['sheriff','deputy'];
     return el('div',{class:'v2-winners'},winners.map(role=>group(`${names.get(role)} 승리`,card(role),el('p',{},D.roleGoals[role]))));
    }
    case 'complete':return group('게임 중에는 메뉴에서 다시 찾아보세요',el('button',{type:'button',class:'primary',onclick:()=>ctx.go('menu')},'메뉴로'),el('button',{type:'button',class:'filter',onclick:()=>ctx.go('setup')},'인원 다시 선택'));
   }
  }
  const prev=el('button',{type:'button',class:'v2-scene-arrow','aria-label':'이전 장면',disabled:index===0,onclick:()=>move(-1)},'‹');
  const next=el('button',{type:'button',class:'v2-scene-arrow','aria-label':'다음 장면',disabled:index===sequence.length-1||!!scene.action,onclick:()=>move(1)},'›');
  const announcement=['ready','search-tip','turn-done','complete'].includes(id);
  const usedLinks=new Set();
  function rich(text){
   const parts=[text];
   for(const [name,route]of scene.links||[]){
    if(!route.startsWith('entry/'))continue;
    const at=parts.findIndex(part=>typeof part==='string'&&part.includes(name));if(at<0)continue;
    const part=parts[at],start=part.indexOf(name);parts.splice(at,1,part.slice(0,start),link(name,route),part.slice(start+name.length));usedLinks.add(route);
   }
   return parts;
  }
  const titleParts=id==='defend'?rich(scene.title):[scene.title];
  const description=scene.text&&id!=='search-tip'?el('p',{class:'v2-scene-description'},...rich(scene.text)):null;
  const warning=scene.warning?el('aside',{class:'v2-caution'},el('span',{'aria-hidden':'true'},'!'),el('p',{},...rich(scene.warning))):null;
  const related=(scene.links||[]).filter(([,route])=>!usedLinks.has(route));
  const relatedPanel=related.length?el('div',{class:'v2-related'},related.map(([name,route])=>link(name,route))):null;
  const below=['character','deal','range','weapon-range','volcanic','beer','eliminate','reward','barrel'].includes(id)||scene.kind==='distance';
  const art=(['ready','search-tip','turn-done'].includes(id)||scene.kind==='section-intro')?null:el('div',{class:'v2-illustration','data-example':id},illustration());
  if(id==='reward'&&art&&relatedPanel)art.append(relatedPanel);
  const panel=el('section',{class:'v2-scene-panel'+(scene.kind==='section-intro'?' v2-section-intro':'')},
   el('div',{class:'v2-title-bar'},prev,el('h2',{},...titleParts),['turn-done','complete'].includes(id)?el('span',{'aria-hidden':'true'}):next),
   ['attack','gatling','defend','beer','saloon'].includes(id)?el('h3',{class:'v2-subtitle'},{attack:'뱅 카드',gatling:'기관총',defend:'빗나감',beer:'맥주',saloon:'주점'}[id]):null,
   id==='eliminate'?null:description,warning,
   below?null:relatedPanel,art,
   id==='eliminate'?description:null,
   below&&id!=='reward'?relatedPanel:null,
   scene.action?el('button',{type:'button',class:'primary v2-transition',onclick:()=>ctx.go(`learn/${scene.action[1]}`)},scene.action[0]):null);
  let root;
  function skip(){
   const close=()=>{overlay.remove();opener?.focus?.();};
   const opener=document.activeElement;
   const jump=target=>{close();const intro='intro-'+target;ctx.go(`learn/${sequence.some(s=>s.id===intro)?intro:target}`);};
   const overlay=el('div',{class:'v2-modal-backdrop'},el('section',{class:'v2-skip-dialog',role:'dialog','aria-modal':'true','aria-label':'단계 건너뛰기'},
    el('div',{class:'v2-dialog-heading'},el('h2',{},'원하는 단계로 이동'),el('button',{type:'button',class:'filter',onclick:close,'aria-label':'목차 닫기'},'닫기')),
    el('nav',{},L.chapters.map(([key,name])=>{
     const items=L.groups[key],active=key===scene.chapter;
     const summary=el('summary',{},el('button',{type:'button',class:'v2-chapter-title',onclick:event=>{event.preventDefault();event.stopPropagation();jump(items[0][1][0]);}},name),el('span',{},`${active?section.index+1:0}/${items.length}`));
     return el('details',{open:active},summary,...items.map(([label,ids])=>el('button',{type:'button',class:'v2-skip-item','aria-current':ids.includes(id)?'step':'false',onclick:()=>jump(ids[0])},label)));
    }))));
   root.append(overlay);const dialog=overlay.firstElementChild;
   overlay.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close();}
    if(event.key==='Tab'){
     const buttons=[...dialog.querySelectorAll('button,summary')].filter(node=>node.offsetParent!==null),first=buttons[0],last=buttons[buttons.length-1];
     if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
   });
   dialog.querySelector('button').focus();
  }
  root=el('div',{class:`app-shell v2-learning${scene.dark?' v2-dark':''}${['ready','search-tip','turn-done','complete'].includes(id)?' v2-announcement':''}`,'data-player-count':n},
   el('header',{class:'v2-learning-header'},el('div',{class:'v2-header-actions'},
    el('button',{type:'button',class:'v2-header-button',onclick:()=>ctx.go('menu')},'☰ 메뉴'),
    el('button',{type:'button',class:`v2-header-button v2-card-search${id==='search-tip'?' highlighted':''}`,'aria-label':'카드 검색 열기',onclick:()=>ctx.go('card-search')},searchIcon(),'카드 검색')),
    ctx.homeLogo()),
   el('main',{id:'main',tabindex:'-1',class:'v2-learning-main','data-scene':id},
    el('div',{class:'v2-step-row'},el('div',{class:'v2-step-label'},el('strong',{},`${title} ${section.index+1}/${section.total}`),el('div',{class:'v2-progress','aria-label':`${title} ${section.total}개 중 ${section.index+1}번째`},grouped.map((s,i)=>el('span',{class:i<=section.index?'active':''})))),announcement?null:el('button',{type:'button',class:'v2-skip-button',onclick:skip},'건너뛰기→')),
    panel));
  root.style.setProperty('--role-card-width',`${(86+(n-1)*9)/n}%`);
  let disposed=false;
  function fitLines(){
   if(disposed)return;const ring=root.querySelector('.v2-distance-ring');if(!ring)return;
   const bounds=ring.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
   const seats=[...ring.querySelectorAll('.v2-seat')];
   for(const line of ring.querySelectorAll('line')){
    const a=seats.find(seat=>String(seat.getAttribute('data-seat'))===String(line.getAttribute('data-from')))?.getBoundingClientRect();
    const b=seats.find(seat=>String(seat.getAttribute('data-seat'))===String(line.getAttribute('data-to')))?.getBoundingClientRect();if(!a||!b)continue;
    const ax=a.left+a.width/2,ay=a.top+a.height/2,bx=b.left+b.width/2,by=b.top+b.height/2,dx=bx-ax,dy=by-ay;
    const edge=rect=>Math.min(dx?(rect.width/2+7)/Math.abs(dx):Infinity,dy?(rect.height/2+7)/Math.abs(dy):Infinity);
    const start=edge(a),end=edge(b);line.style.opacity=start+end>=1?'0':'1';
    if(start+end>=1)continue;
    for(const [key,value]of Object.entries({x1:(ax+dx*start-bounds.left)/bounds.width*100,y1:(ay+dy*start-bounds.top)/bounds.height*100,x2:(bx-dx*end-bounds.left)/bounds.width*100,y2:(by-dy*end-bounds.top)/bounds.height*100}))line.setAttribute(key,value);
   }
  }
  const resize=()=>requestAnimationFrame(fitLines);window.addEventListener('resize',resize);requestAnimationFrame(fitLines);
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(root);
  ctx.dispose(()=>{disposed=true;observer?.disconnect();window.removeEventListener('resize',resize);});return root;
 }
 return {screen};
};
