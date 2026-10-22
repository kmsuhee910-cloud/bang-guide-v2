'use strict';
(() => {
  const D = window.BangData;
  const app = document.getElementById('app');
  const L=window.BangLesson;
  const storageKey='bang-guide-learning-v2';
  const freshLearning=()=>({version:2,playerCount:null,scene:'board',seenSearchHint:false});
  const state = {selected:{roles:'sheriff',people:'slab',cards:'barrel'},filter:'all',query:'',searched:false,
    learning:freshLearning()};
  function persistLearning(){
    const clean=L.sanitize(state.learning);if(!clean)return;
    history.replaceState({...history.state,learning:clean},'');
  }
  const positions = new Map();
  let currentRoute = '';
  let lessonBackdrop=null;
  let lookupBackdrop=null;
  let disposeView=()=>{};
  const cardViews=new Map();
  const el = (tag, attrs={}, ...children) => {
    const node=document.createElement(tag);
    for(const [key,value] of Object.entries(attrs)){
      if(key.startsWith('on')) node.addEventListener(key.slice(2),value);
      else if(key==='disabled')node.disabled=Boolean(value);
      else if(['open','hidden','inert'].includes(key)){if(value)node.setAttribute(key,'');}
      else if(key==='class') node.className=value;
      else node.setAttribute(key,String(value));
    }
    for(const child of children.flat()) if(child!==null && child!==undefined) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    return node;
  };
  const img=(id,alt,cls='')=>el('img',{src:`media/${id}.png`,alt,class:cls,decoding:'async'});
  const go=route=>{
    if(location.hash===`#${route}`)return;
    // A fresh search click targets that card; history navigation restores its view.
    const [type,kind,id]=route.split('/');
    const cached=cardViews.get(route);
    if(type==='entry'&&cached&&(currentRoute==='menu'||currentRoute.startsWith('learn/'))){
      cached.selected=id;
      const record=listFor(kind).find(x=>x.id===id);
      if(cached.nameQuery&&record){const q=cached.nameQuery.normalize('NFC').toLocaleLowerCase().replace(/[\s!.]/g,'');if(![record.name,record.english].some(name=>name.normalize('NFC').toLocaleLowerCase().replace(/[\s!.]/g,'').includes(q))){cached.nameQuery='';cached.draft='';cached.message='';}}
      if(kind==='cards'&&cached.filter!=='all'&&record?.group!==cached.filter)cached.filter='all';
    }
    positions.set(currentRoute,window.scrollY);
    history.pushState({bangGuideV2:true,depth:(history.state?.depth||0)+1,learning:{...state.learning}},'',`#${route}`);render();
  };
  const back=()=>{if(history.state?.bangGuideV2&&history.state.depth>0)history.back();else go(currentRoute==='menu'?'home':'menu');};
  function resetLearning(){
    state.learning=freshLearning();positions.clear();lookupBackdrop=null;
    try{localStorage.removeItem(storageKey);}catch{}
    history.replaceState({bangGuideV2:true,depth:0},'','#home');
    currentRoute='';render();
  }
  const brand=title=>el('div',{class:'brand'},el('button',{type:'button',class:'brand-home','aria-label':'학습을 초기화하고 홈으로',onclick:resetLearning},img('logo','')),el('h1',{},title));
  const header=(title,onBack=back)=>el('header',{class:'app-header'},el('button',{class:'back',type:'button','aria-label':'이전 화면으로',onclick:onBack},'‹'),brand(title));
  const footer=()=>el('footer',{class:'fixed-footer'},el('button',{class:'primary',type:'button',onclick:()=>go(state.learning.playerCount?`learn/${state.learning.scene}`:'setup')},'게임 규칙 바로가기'),null);
  const paragraph=text=>el('p',{},text);
  const note=(title,text)=>el('aside',{class:'note'},el('strong',{},title),text);
  const sources=()=>el('p',{class:'source-note'},'기본판 4판 영문 규칙 기준 · ',el('a',{href:'https://bang.dvgiochi.com/content/1/docs/01_bang_rules_EN.pdf',target:'_blank',rel:'noopener noreferrer'},'규칙 출처'));
  const shell=(title,content,withFooter=true)=>el('div',{class:'app-shell'},header(title),el('main',{id:'main',tabindex:'-1',class:'content'},content,currentRoute==='menu'?null:sources()),withFooter?footer():null);
  function home(){
    return el('div',{class:'app-shell home-shell'},el('header',{class:'home-title'},brand('사용설명서')),el('main',{id:'main',tabindex:'-1',class:'home-card'},el('button',{type:'button',class:'home-start','aria-label':'뱅 보드게임 이미지를 눌러 메뉴 열기',onclick:()=>go('menu')},img('box','뱅 기본판 보드게임 상자')),el('h2',{},'보드게임 방법 보러가기')));
  }
  function stack(ids){return el('div',{class:'tile-stack','aria-hidden':'true'},ids.map(id=>img(id,'')));}
  function tile(id,name,art,compact=false){return el('button',{type:'button',class:`component-tile${compact?' compact':''}`,'data-component':id,onclick:()=>go(`component/${id}`)},el('h2',{},name),el('div',{class:'tile-art','aria-hidden':'true'},art));}
  function menu(){
    const input=el('input',{id:'rule-search',type:'search',placeholder:'카드 이름이나 궁금한 상황 검색',maxlength:100,autocomplete:'off',spellcheck:'false','aria-label':'카드 이름이나 궁금한 상황 검색'});
    input.value=state.query;
    const results=el('div',{class:'search-results'}),hint=el('p',{class:'search-hint',role:'status','aria-live':'polite'});
    function search(){
      results.replaceChildren();
      const query=state.query.normalize('NFC').toLocaleLowerCase().trim().replace(/\s+/g,' ');
      if(!query){hint.textContent='카드 이름이나 궁금한 상황을 입력해주세요.';return;}
      const tokens=query.split(' '),records=[...D.rules.map(x=>({...x,target:`answer/${x.id}`,category:'게임 규칙'})),...D.roles.map(x=>({...x,target:`entry/roles/${x.id}`,category:'역할 카드'})),...D.people.map(x=>({...x,target:`entry/people/${x.id}`,category:'인물 카드'})),...D.cards.map(x=>({...x,target:`entry/cards/${x.id}`,category:'게임 카드'}))];
      const matches=records.filter(x=>tokens.every(t=>[x.name,x.english,x.keywords,x.text,x.caution].filter(Boolean).join(' ').normalize('NFC').toLocaleLowerCase().includes(t))).sort((a,b)=>Number(b.name===query)-Number(a.name===query)||Number(b.name.toLocaleLowerCase().includes(query))-Number(a.name.toLocaleLowerCase().includes(query)));
      hint.textContent=matches.length?`${matches.length}개의 설명을 찾았어요.`:'일치하는 설명이 없어요. 짧은 이름이나 단어로 다시 찾아보세요.';
      for(const x of matches)results.append(el('button',{type:'button',class:'result',onclick:()=>go(x.target)},el('strong',{},x.name),el('small',{},x.category)));
    }
    input.addEventListener('input',()=>{state.query=input.value;state.searched=false;results.replaceChildren();hint.textContent='';});
    const form=el('form',{class:'search-form',role:'search',onsubmit:e=>{e.preventDefault();state.query=input.value;state.searched=true;search();}},input,el('button',{class:'search-submit',type:'submit','aria-label':'규칙 검색'},'↑'));
    const suggestions=el('div',{class:'v2-suggestions','aria-label':'추천 검색어'},['판정이란?','거리','회복은 어디까지 가능?','감옥','술통'].map(word=>el('button',{type:'button',class:'v2-suggestion',onclick:()=>{state.query=word;input.value=word;state.searched=true;search();}},word)));
    const searchPanel=el('section',{class:'search-box v2-menu-search','aria-label':'일반 통합 검색'},form,suggestions,hint,results);
    if(state.searched)search();
    return shell('메뉴',[searchPanel,el('div',{class:'menu-grid v2-menu-grid'},tile('cards','게임 카드',stack(['bang','remington','barrel'])),tile('people','인물 카드',stack(['suzy','slab','willy'])),tile('roles','역할 카드',stack(['deputy','outlaw','sheriff'])),el('div',{class:'v2-small-components'},tile('bullets','총알 토큰',el('span',{class:'menu-bullet-frame'},img('bullet-token','','menu-bullet-token')),true),tile('board','보드',img('board',''),true),tile('summary','요약 카드',img('summary',''),true)))]);
  }
  function component(id,group){
    if(['roles','people','cards'].includes(id)){if(['weapon','brown','blue'].includes(group)&&!cardViews.has(currentRoute))cardViews.set(currentRoute,{selected:group==='weapon'?'volcanic':group==='blue'?'barrel':'bang',filter:group,draft:'',nameQuery:''});return catalog(id);}
    let content;
    if(id==='bullets')content=[el('div',{class:'bullet-large','aria-hidden':'true'},img('bullet-token','','component-bullet-token')),img('board','보드 위쪽의 총알 모양 칸에 총알을 놓아요.','hero-art board-art'),el('div',{class:'prose'},paragraph('총알은 남은 체력을 나타내요. 뱅을 쓸 때 사용하는 탄약은 아니에요.'),paragraph('인물 카드에 그려진 총알 수만큼 놓아요. 보안관은 하나를 더 놓아요. 피해를 받으면 빼고, 회복하면 되돌려 놓아요.')),note('손에 든 카드와도 연결돼요','차례를 마칠 때는 남은 총알 수만큼만 카드를 들고 있어요. 총알이 3개면 카드는 최대 3장이에요.'),el('div',{class:'component-health'},window.BangHealth(el,img,4,'lucky',false,100))];
    else if(id==='board')content=[img('board','위에는 총알, 아래에는 역할·인물·무기를 놓는 개인 보드','hero-art board-art'),el('div',{class:'prose'},paragraph('총알 토큰과 내 역할·인물·무기를 정리하는 개인 보드예요.'),paragraph('왼쪽은 역할 카드, 가운데는 인물 카드, 오른쪽은 무기 자리예요. 시작 무기는 판에 그려진 콜트 .45이며 사거리는 1이에요.'),paragraph('역할은 보안관만 공개해요. 인물은 모두 공개하고 능력을 읽어요.')),note('설치 카드와 손에 든 카드는 달라요','술통·야생마 같은 다른 설치 카드는 자기 앞에 놓아요. 무기 칸에 모든 파란 카드를 쌓는 것은 아니에요.')];
    else if(id==='summary'){
      const rows=[['✦','뱅 효과','막지 못하면 총알을 하나 빼요.'],['↗','빗나감 효과','자신에게 오는 뱅 효과를 막아요.'],['＋','총알 되돌려 놓기','시작할 때 놓은 총알 수를 넘길 수 없어요.'],['▱','카드 가져오기','대상 표시가 없으면 덱에서 받아요.'],['×','카드 버리기','대상과 조건은 카드에서 확인해요.'],['◎','무기 사거리 안의 한 사람','무기의 사거리와 거리를 비교해요.'],['①','정해진 거리 안의 한 사람','무기의 사거리로 늘어나지 않아요.'],['▤','책 표시','자세한 조건을 카드 설명에서 확인해요.']];
      content=[img('summary','카드 효과와 대상 기호가 담긴 요약 카드','hero-art board-art'),paragraph('카드 아래의 기호를 읽는 데 도움을 주는 참조표예요. 실제 카드의 기호와 아래 뜻을 함께 확인하세요.'),el('div',{class:'symbol-list'},rows.map(([,title,text])=>el('div',{class:'summary-row'},el('strong',{},title),el('small',{},text))))];
    }else return missing();
    const titles={bullets:'총알 토큰',summary:'요약 카드',board:'보드'};
    return shell('메뉴',el('section',{class:'panel'},el('h2',{class:'page-title'},titles[id]),content));
  }
  const listFor=kind=>kind==='roles'?D.roles:kind==='people'?D.people:D.cards;
  function detail(record){
    return [img(record.id,`${record.name} 카드`,'detail-art'),el('h3',{},record.name),el('p',{class:'english',lang:'en'},record.english),record.life?el('div',{class:'ability-meta'},`시작 총알 ${record.life}개 · 보안관이면 ${record.life+1}개`):null,paragraph(record.text),note('함께 기억해요',record.caution)];
  }
  function catalog(kind){
    if(kind==='roles'||kind==='people'||kind==='cards')return focusCatalog(kind);
    const titles={roles:'역할 카드',people:'인물 카드',cards:'게임 카드'};
    const descriptions={roles:'역할은 목표예요. 보안관만 공개하고, 나머지는 탈락할 때까지 숨겨요.',people:'인물은 모두 공개해요. 인물마다 시작 총알 수와 특별한 능력이 달라요.',cards:'갈색은 사용 후 버리고, 파란색은 설치해 효과를 유지해요. 감옥은 다른 사람 앞에 놓아요.'};
    const rail=el('div',{class:'card-rail',role:'group','aria-label':`${titles[kind]} 선택`});
    const detailPanel=el('section',{class:'detail','aria-label':'선택한 카드 설명'});
    const announced=el('p',{class:'sr-only',role:'status','aria-live':'polite'});
    const filters=el('div',{class:'filters',role:'group','aria-label':'게임 카드 분류'});
    function select(record){
      state.selected[kind]=record.id;
      for(const button of rail.children)button.setAttribute('aria-pressed',String(button.dataset.card===record.id));
      detailPanel.replaceChildren(...detail(record).filter(Boolean));
      announced.textContent=`${record.name} 설명을 선택했어요.`;
    }
    function fill(){
      const records=listFor(kind).filter(x=>kind!=='cards'||state.filter==='all'||x.group===state.filter);
      rail.replaceChildren(...records.map(record=>el('button',{type:'button',class:'card-option','data-card':record.id,'aria-pressed':String(state.selected[kind]===record.id),onclick:()=>select(record)},img(record.id,''),el('span',{},record.name))));
      select(records.find(x=>x.id===state.selected[kind])||records[0]);
    }
    if(kind==='cards')for(const [value,label]of[['all','전체'],['brown','갈색 카드'],['blue','파란 카드'],['weapon','무기']])filters.append(el('button',{type:'button',class:'filter','aria-pressed':String(state.filter===value),onclick:()=>{state.filter=value;for(const button of filters.children)button.setAttribute('aria-pressed',String(button.textContent===label));fill();rail.scrollLeft=0;}},label));
    fill();
    requestAnimationFrame(()=>{const selected=rail.querySelector('[aria-pressed="true"]');if(selected)rail.scrollLeft=Math.max(0,selected.offsetLeft-rail.offsetLeft-20);});
    return shell('메뉴',el('section',{class:'panel'},el('h2',{class:'page-title'},titles[kind]),el('p',{class:'card-intro'},'좌우로 둘러보고, 카드를 눌러 설명을 읽어보세요.'),filters,rail,paragraph(descriptions[kind]),detailPanel,announced));
  }
  // A view stores stable card IDs, never a position in a filtered list.
  function focusCatalog(kind,initialId){
    const viewKey=currentRoute;
    if(!cardViews.has(viewKey))cardViews.set(viewKey,{selected:initialId||state.selected[kind],filter:'all',nameQuery:'',draft:'',message:''});
    const view=cardViews.get(viewKey);
    const titles={roles:'역할 카드',people:'인물 카드',cards:'게임 카드'};
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const rail=el('div',{class:'focus-rail',role:'group','aria-label':`${titles[kind]} 가로 목록`});
    const panel=el('section',{class:'detail focus-detail','aria-label':'중앙 카드 설명'});
    const status=el('p',{class:'sr-only',role:'status','aria-live':'polite'});
    const filters=el('div',{class:'filters focus-filters',role:'group','aria-label':'게임 카드 분류'});
    let records=[],slots=[],painted=null,frame=0,timer=0,disposed=false,fillVersion=0;
    const normName=value=>value.normalize('NFC').toLocaleLowerCase().replace(/[\s!.]/g,'');
    function nameMatches(query){
      const q=normName(query),all=listFor(kind);if(!q)return all;
      const exact=all.filter(x=>[x.name,x.english].some(name=>normName(name)===q));
      return exact.length?exact:all.filter(x=>[x.name,x.english].some(name=>normName(name).includes(q)));
    }
    const nameFeedback=el('p',{class:'v2-name-feedback',role:'status','aria-live':'polite'},view.message||'');
    const nameInput=el('input',{type:'search',class:'v2-name-input',placeholder:kind==='people'?'인물 이름 검색':'게임 카드 이름 검색','aria-label':kind==='people'?'인물 이름 검색':'게임 카드 이름 검색',maxlength:80,autocomplete:'off'});
    nameInput.value=view.draft||'';
    nameInput.addEventListener('input',()=>{view.draft=nameInput.value;if(!nameInput.value){view.nameQuery='';view.filter='all';view.message='';nameFeedback.textContent='';fill();}});
    const nameForm=kind==='roles'?null:el('form',{class:'search-form v2-name-form',role:'search',onsubmit:event=>{
      event.preventDefault();view.draft=nameInput.value;const matches=nameMatches(nameInput.value);
      if(!matches.length){view.message='일치하는 이름이 없어요. 현재 카드를 유지했어요.';nameFeedback.textContent=view.message;return;}
      view.nameQuery=nameInput.value;view.filter='all';view.message=`${matches.length}개의 카드를 찾았어요.`;nameFeedback.textContent=view.message;fill();
    }},nameInput,el('button',{type:'submit',class:'search-submit','aria-label':'카드 이름 검색 실행'},'↑'));

    function select(record){
      view.selected=record?.id||null;
      if(!initialId)state.selected[kind]=view.selected;
      for(const slot of slots)slot.setAttribute('aria-pressed',String(slot.dataset.card===view.selected));
      if(painted===view.selected)return;
      painted=view.selected;
      panel.replaceChildren(...(record?detail(record).slice(1).filter(Boolean):[paragraph('이 분류에는 카드가 없어요. 다른 분류를 선택해주세요.')]));
      panel.setAttribute('data-detail-card',view.selected||'');
      status.textContent=record?`${record.name} 설명`:'표시할 카드가 없어요.';
    }
    const distance=slot=>Math.abs(slot.offsetLeft+slot.offsetWidth/2-rail.scrollLeft-rail.clientWidth/2);
    function nearest(deadband=4){
      let best=null,score=Infinity;
      for(const slot of slots){
        // The same 4px stability margin controls selection and visual size.
        const value=distance(slot)+(slot.dataset.card===view.selected?0:deadband);
        if(value<score){best=slot;score=value;}
      }
      return best;
    }
    function update(){
      if(disposed||!slots.length)return;
      const closest=nearest();
      select(records.find(x=>x.id===closest.dataset.card));
      for(const slot of slots){
        const selected=slot.dataset.card===view.selected;
        const d=distance(slot)+(selected?0:4);
        const scale=reduced.matches?(selected?1:0.8):Math.max(0.72,1-d/Math.max(rail.clientWidth,1)*0.45);
        slot.firstElementChild.style.setProperty('--card-scale',scale.toFixed(4));
        slot.style.zIndex=selected?'2':'1';
      }
    }
    function center(id,smooth=false){
      if(disposed)return;
      const slot=slots.find(x=>x.dataset.card===id);
      if(!slot)return;
      const left=slot.offsetLeft+slot.offsetWidth/2-rail.clientWidth/2;
      if(Math.abs(rail.scrollLeft-left)>0.1)rail.scrollTo({left,behavior:smooth&&!reduced.matches?'smooth':'auto'});
      if(!smooth||reduced.matches)update();
    }
    function settle(){
      if(disposed)return;
      clearTimeout(timer);
      const closest=nearest(0);
      if(closest)center(closest.dataset.card);
    }
    function onScroll(){
      if(!frame)frame=requestAnimationFrame(()=>{frame=0;update();});
      clearTimeout(timer);timer=setTimeout(settle,180);
    }
    rail.addEventListener('scroll',onScroll,{passive:true});
    rail.addEventListener('scrollend',settle);
    rail.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!slots.length)return;
      event.preventDefault();
      const index=slots.findIndex(x=>x.dataset.card===view.selected);
      const next=event.key==='Home'?0:event.key==='End'?slots.length-1:Math.max(0,Math.min(slots.length-1,index+(event.key==='ArrowRight'?1:-1)));
      slots[next].focus({preventScroll:true});center(slots[next].dataset.card,true);
    });
    function fill(){
      const version=++fillVersion;
      clearTimeout(timer);
      records=nameMatches(view.nameQuery||'').filter(x=>kind!=='cards'||view.filter==='all'||x.group===view.filter);
      if(!records.some(x=>x.id===view.selected))view.selected=records[0]?.id||null;
      painted=undefined;
      slots=records.map(record=>el('button',{type:'button',class:'focus-card','data-card':record.id,
        'aria-label':record.name,'aria-pressed':String(record.id===view.selected),
        onclick:()=>center(record.id,true),onfocus:()=>center(record.id,true)},
        el('span',{class:'focus-visual'},img(record.id,`${record.name} 카드`))));
      rail.replaceChildren(...slots);
      for(const button of filters.children)button.setAttribute('aria-pressed',String(button.dataset.filter===view.filter));
      select(records.find(x=>x.id===view.selected));
      requestAnimationFrame(()=>{if(!disposed&&version===fillVersion)center(view.selected);});
    }
    if(kind==='cards')for(const [value,label]of[['all','전체'],['brown','갈색 카드'],['blue','파란 카드'],['weapon','무기']])filters.append(el('button',{
      type:'button',class:'filter','data-filter':value,'aria-pressed':String(value===view.filter),onclick:()=>{view.filter=value;fill();}},label));
    const resize=()=>center(view.selected);
    window.addEventListener('resize',resize);
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(resize);
    observer?.observe(rail);
    disposeView=()=>{disposed=true;clearTimeout(timer);cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',resize);};
    fill();
    return shell(initialId?'규칙 찾기':'메뉴',el('section',{class:'panel focus-catalog'},
      el('h2',{class:'page-title'},titles[kind]),
      nameForm,kind==='roles'?null:nameFeedback,
      el('p',{class:'card-intro'},'좌우로 넘겨보세요. 가운데 카드의 설명이 나와요.'),
      rail,filters,panel,status));
  }
  function answer(id){
    const record=D.rules.find(x=>x.id===id);
    if(!record)return missing();
    return shell('규칙 찾기',el('article',{class:'panel prose'},el('h2',{class:'page-title'},record.name),paragraph(record.text),note('함께 기억해요',record.caution)));
  }
  function entry(kind,id){
    if(!['roles','people','cards'].includes(kind))return missing();
    const record=listFor(kind).find(x=>x.id===id);
    if(!record)return missing();
    if(kind==='roles'||kind==='people'||kind==='cards')return focusCatalog(kind,id);
    state.selected[kind]=id;
    return shell('규칙 찾기',el('article',{class:'panel prose'},...detail(record).filter(Boolean),el('button',{type:'button',class:'filter read-more',onclick:()=>go(`component/${kind}`)},'다른 카드도 보기')));
  }
  const tutorial=window.BangTutorial({el,img,header,go,homeLogo:()=>el('button',{type:'button',class:'v2-home-logo','aria-label':'학습을 초기화하고 홈으로',onclick:resetLearning},img('logo','뱅!')),learning:()=>state.learning,persist:persistLearning,dispose:fn=>{disposeView=fn;}});
  function cardLookup(){
    const input=el('input',{type:'search',placeholder:'카드 이름을 검색하세요','aria-label':'모든 카드 이름 검색',maxlength:80,autocomplete:'off'});
    input.value=state.cardQuery||'';input.addEventListener('input',()=>{state.cardQuery=input.value;});
    const message=el('p',{class:'v2-name-feedback',role:'status'});
    const records=[...D.roles.map(x=>({...x,kind:'roles'})),...D.people.map(x=>({...x,kind:'people'})),...D.cards.map(x=>({...x,kind:'cards'}))];
    const norm=v=>v.normalize('NFC').toLowerCase().replace(/[\s!.]/g,'');
    const open=r=>{if(r)go(`entry/${r.kind}/${r.id}`);};
    const run=()=>{const q=norm(input.value);if(!q){message.textContent='카드 이름을 입력해 주세요.';return;}const exact=records.find(r=>[r.name,r.english].some(v=>norm(v)===q));const matches=records.filter(r=>[r.name,r.english].some(v=>norm(v).includes(q)));if(exact||matches.length===1)open(exact||matches[0]);else if(matches.length){suggestions.replaceChildren(...matches.slice(0,5).map(r=>el('button',{type:'button',class:'v2-suggestion',onclick:()=>open(r)},r.name)));message.textContent='카드 이름을 눌러 주세요.';}else message.textContent='일치하는 카드가 없어요.';};
    const suggestions=el('div',{class:'v2-suggestions'},['jail','barrel','beer','sheriff','lucky'].map(id=>{const r=records.find(x=>x.id===id);return el('button',{type:'button',class:'v2-suggestion',onclick:()=>open(r)},r.name);}));
    return el('div',{class:'app-shell v2-lookup-screen'},el('section',{class:'v2-lookup-dialog',role:'dialog','aria-modal':'true','aria-label':'카드 이름 검색'},el('button',{type:'button',class:'filter','aria-label':'이전 화면으로',onclick:back},'닫기'),el('form',{class:'search-form',onsubmit:e=>{e.preventDefault();run();}},input,el('button',{type:'submit',class:'search-submit','aria-label':'카드 이름 찾기'},'↑')),suggestions,message));
  }
  function setup(){
    let preview=state.learning.playerCount||4;
    const number=el('span',{class:'player-number','aria-live':'polite'});
    const roles=el('div',{class:'player-composition',id:'player-composition'});
    const confirm=el('button',{type:'button',class:'player-confirm','aria-describedby':'player-help',onclick:()=>{
      state.learning=L.create(preview);persistLearning();
      for(const scene of L.scenes(preview))positions.delete(`learn/${scene.id}`);
      go('learn/board');
    }},number);
    let up,down;
    function show(){
      const c=D.roleSetups[preview];number.textContent=`${preview}명`;
      roles.replaceChildren(...[[`보안관 ${c.sheriff}`],[`배신자 ${c.renegade}`],[`무법자 ${c.outlaw}`],c.deputy?[`부관 ${c.deputy}`]:[]].flat().map(text=>el('span',{},text)));
      confirm.setAttribute('aria-label',`${preview}명으로 학습 시작`);number.setAttribute('data-preview-count',preview);
      up.disabled=preview===7;down.disabled=preview===4;
    }
    up=el('button',{type:'button',class:'player-chevron player-chevron-up','aria-label':'인원 한 명 늘리기',onclick:()=>{preview=Math.min(7,preview+1);show();}},el('span',{class:'player-chevron-mark','aria-hidden':'true'}));
    down=el('button',{type:'button',class:'player-chevron','aria-label':'인원 한 명 줄이기',onclick:()=>{preview=Math.max(4,preview-1);show();}},el('span',{class:'player-chevron-mark','aria-hidden':'true'}));
    show();
    return el('div',{class:'app-shell selection-shell'},header('게임 규칙'),
      el('main',{id:'main',tabindex:'-1',class:'selection-content'},
        el('button',{type:'button',class:'selection-menu lesson-menu','aria-label':'메뉴 열기',onclick:()=>go('menu')},'☰'),
        el('div',{class:'selection-body'},el('section',{class:'selection-panel','aria-labelledby':'player-question'},
          el('h2',{id:'player-question'},'몇 명이 플레이하나요?'),
          el('div',{class:'player-picker'},confirm,el('div',{class:'player-arrows'},up,down),roles)),
          el('p',{class:'player-help',id:'player-help'},'화살표로 인원을 바꾸고, 숫자를 눌러 시작하세요.'))));
  }
  function missing(){return shell('메뉴',el('section',{class:'panel error-panel'},el('h2',{},'설명을 찾을 수 없어요'),paragraph('메뉴에서 다시 찾아보세요.'),el('button',{type:'button',class:'filter',onclick:()=>go('menu')},'메뉴로')));}
  function render(){
    let route=location.hash.slice(1)||'home';
    if(route.startsWith('learn/')&&(!D.roleSetups[state.learning.playerCount]||!L.scenes(state.learning.playerCount).some(s=>s.id===route.split('/')[1]))){
      route='setup';
      history.replaceState({...history.state,learning:{...state.learning}},'','#setup');
    }
    if(route==='learn/search-tip'&&state.learning.seenSearchHint&&currentRoute!==route){route='learn/use';history.replaceState({...history.state,learning:{...state.learning,scene:'use'}},'','#'+route);}
    if(route===currentRoute)return;
    if(route.startsWith('learn/')){state.learning.scene=route.split('/')[1];persistLearning();}
    if(currentRoute)positions.set(currentRoute,window.scrollY);
    const searchOverlay=route==='card-search'||currentRoute.startsWith('learn/')&&/^component\/(cards|people)(?:\/|$)/.test(route);
    let underlay=null;
    if(searchOverlay){
      const fresh=currentRoute.startsWith('learn/')||!lookupBackdrop;
      const snapshot=fresh?app.firstElementChild?.cloneNode?.(true):lookupBackdrop?.cloneNode?.(true);
      if(snapshot){
        if(fresh){snapshot.style.transform=`translateY(${-window.scrollY}px)`;if(route==='card-search')lookupBackdrop=snapshot.cloneNode(true);}
        underlay=el('div',{class:'v2-search-underlay',inert:true,'aria-hidden':'true'},snapshot);
        for(const node of underlay.querySelectorAll('[id],[data-scene]')){node.removeAttribute('id');node.removeAttribute('data-scene');}
      }
    }
    if(currentRoute.startsWith('learn/')&&!app.firstElementChild?.className.includes('v2-dark'))lessonBackdrop=app.firstElementChild?.cloneNode?.(true);
    disposeView();disposeView=()=>{};
    document.body.classList.remove('input-focused');
    currentRoute=route;
    const [type,arg,id]=route.split('/');
    const view=type==='home'?home():type==='card-search'?cardLookup():type==='menu'?menu():type==='component'?component(arg,id):type==='answer'?answer(arg):type==='entry'?entry(arg,id):type==='setup'?setup():type==='learn'?tutorial.screen(arg):missing();
    if(searchOverlay){view.className+=' v2-search-layer';view.setAttribute('role','dialog');view.setAttribute('aria-modal','true');view.setAttribute('aria-label','카드 검색');const heading=view.querySelector('.brand h1');if(heading)heading.textContent='카드 검색';}
    if(view.className.includes('v2-dark')&&lessonBackdrop){const background=lessonBackdrop.cloneNode(true);background.className='v2-dark-backdrop';background.setAttribute('inert','');background.setAttribute('aria-hidden','true');for(const node of background.querySelectorAll('[id],[data-scene]')){node.removeAttribute('id');node.removeAttribute('data-scene');}view.append(background);}
    app.replaceChildren(...[underlay,view].filter(Boolean));
    document.title=`${type==='home'?'뱅! 사용설명서':type==='menu'?'메뉴':['setup','learn'].includes(type)?'게임 준비':'구성품·규칙 설명'} | 뱅! V2`;
    requestAnimationFrame(()=>{const main=document.getElementById('main');window.scrollTo(0,route==='card-search'?0:positions.get(route)||0);window.dispatchEvent(new Event('scroll'));});
    if(!history.state?.bangGuideV2)history.replaceState({bangGuideV2:true,depth:0,learning:{...state.learning}},'');
  }
  // No document-wide advance handler: only tutorial scenes may opt into tap progression.
  document.addEventListener('focusin',event=>{if(event.target.matches('input'))document.body.classList.add('input-focused');});
  document.addEventListener('focusout',event=>{if(event.target.matches('input'))document.body.classList.remove('input-focused');});
  document.addEventListener('error',event=>{if(event.target instanceof HTMLImageElement){event.target.alt=event.target.alt||'카드 이미지를 표시할 수 없어요';}},true);
  document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.getElementById('main')?.focus();});
  window.addEventListener('popstate',render);
  window.addEventListener('hashchange',render);
  // A fresh document always starts at home, including bookmarked learning hashes.
  resetLearning();
})();
