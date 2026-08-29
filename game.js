(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const board=$('board'),timeEl=$('time'),movesEl=$('moves'),pairsEl=$('pairs'),messageEl=$('message'),modal=$('modal'),undoBtn=$('undo');
  if(!board||!timeEl||!movesEl||!pairsEl||!messageEl||!modal)return;

  const honors=[['東','east'],['南','south'],['西','west'],['北','north'],['中','red'],['發','green'],['白','white']];
  const special=[['梅','flower'],['蘭','flower'],['菊','flower'],['竹','flower'],['春','season'],['夏','season'],['秋','season'],['冬','season']];
  const chinese=['一','二','三','四','五','六','七','八','九'];
  const bamboo=['🀐','🀑','🀒','🀓','🀔','🀕','🀖','🀗','🀘'];
  let tiles=[],selected=null,moves=0,pairs=0,startTime=0,timer=null,soundOn=true,started=false,history=[];
  const positions=[];
  function addLayer(z,rows,cols,x0,y0,dx=52,dy=68){for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)positions.push({x:x0+c*dx,y:y0+r*dy,z});}
  addLayer(0,6,16,84,90);addLayer(1,4,8,292,158);addLayer(2,3,4,396,226);addLayer(3,2,2,448,260);

  const types=[];
  for(const suit of ['characters','bamboo','dots'])for(let i=0;i<9;i++)for(let n=0;n<4;n++)types.push({kind:'suited',suit,value:i,label:suit==='dots'?String(i+1):chinese[i],glyph:suit==='characters'?chinese[i]:suit==='bamboo'?bamboo[i]:'●'});
  for(const [glyph,key] of honors)for(let n=0;n<4;n++)types.push({kind:'honor',key,glyph,label:glyph});
  for(const [glyph,key] of special)types.push({kind:'special',key,glyph,label:glyph});

  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function same(a,b){if(a.kind!==b.kind)return false;if(a.kind==='special')return a.key===b.key;if(a.kind==='honor')return a.key===b.key;return a.suit===b.suit&&a.value===b.value;}
  function overlap(a,b){return a.x<b.x+52&&a.x+52>b.x&&a.y<b.y+68&&a.y+68>b.y;}
  function isFree(t,active=tiles){
    if(active.some(o=>!o.removed&&o.z>t.z&&overlap(t,o)))return false;
    const left=active.some(o=>!o.removed&&o.z===t.z&&o.x<t.x&&o.x+52>t.x-3&&Math.abs(o.y-t.y)<20);
    const right=active.some(o=>!o.removed&&o.z===t.z&&o.x>t.x&&o.x<t.x+55&&Math.abs(o.y-t.y)<20);
    return !left||!right;
  }

  // A fixed valid peel order is used to deal the board. Every consecutive pair
  // is guaranteed to be removable when reached, so every new game is solvable.
  const solutionOrder=[15,32,48,127,79,95,33,119,14,112,31,96,0,103,97,120,34,78,77,94,47,104,1,80,13,93,63,98,2,111,35,92,49,76,91,99,30,64,50,102,65,81,46,82,29,62,66,90,12,45,16,28,27,61,11,60,3,10,83,89,4,51,5,88,17,67,6,87,18,84,19,44,9,20,21,135,22,118,23,100,59,126,131,139,141,143,75,110,8,43,113,132,130,140,52,142,121,136,68,109,42,74,125,138,36,105,37,128,69,106,122,137,101,129,117,134,24,58,73,124,57,116,41,133,86,108,38,107,53,114,72,123,54,115,26,55,25,39,40,70,7,71,56,85];

  function makeSolvableDeck(){
    const unique=[];
    types.forEach(t=>{if(t.kind==='special')return;if(!unique.some(u=>same(u,t)))unique.push(t);});
    const pairTypes=[];
    unique.forEach(t=>{pairTypes.push({...t},{...t});});
    pairTypes.push({kind:'special',key:'flower',glyph:'梅',label:'梅'},{kind:'special',key:'flower',glyph:'蘭',label:'蘭'});
    pairTypes.push({kind:'special',key:'season',glyph:'春',label:'春'},{kind:'special',key:'season',glyph:'夏',label:'夏'});
    shuffle(pairTypes);
    const deck=new Array(144);
    for(let i=0;i<72;i++){const type=pairTypes[i];deck[solutionOrder[i*2]]={...type};deck[solutionOrder[i*2+1]]={...type};}
    return deck;
  }

  function render(){
    board.innerHTML='';
    tiles.forEach(t=>{if(t.removed)return;const free=isFree(t),el=document.createElement('button');
      el.type='button';el.className=`tile ${free?'free':'blocked'}${selected===t?' selected':''}`;el.style.cssText=`left:${t.x}px;top:${t.y}px;z-index:${t.z*200+t.order}`;
      el.setAttribute('aria-label',`${t.data.label} tile${free?', open':''}`);
      const glyph=document.createElement('span');glyph.className='glyph';glyph.textContent=t.data.glyph;el.appendChild(glyph);
      const small=document.createElement('span');small.className='small';small.textContent=t.data.kind==='suited'?(t.data.suit==='characters'?'萬':t.data.suit==='bamboo'?'索':'筒'):t.data.kind==='honor'?'字':t.data.key==='flower'?'花':'季';el.appendChild(small);
      el.addEventListener('click',()=>clickTile(t));board.appendChild(el);
    });
    if(undoBtn)undoBtn.disabled=!started||history.length===0;
  }
  function clickTile(t){
    if(!started)return;if(!isFree(t)){flash('That tile is blocked.');return;}
    if(selected===t){selected=null;render();return;}if(!selected){selected=t;render();return;}
    if(same(selected.data,t.data)){
      const a=selected,b=t;selected=null;history.push([a,b]);a.removed=true;b.removed=true;moves++;pairs++;update();render();beep(620,.07);
      if(pairs===72)finish();else if(!tiles.some(x=>!x.removed&&isFree(x)))flash('No open pairs remain — shuffle to continue.');
    } else {selected=t;flash('Those tiles do not match.');render();beep(180,.08);}
  }
  function undo(){
    if(!started||!history.length)return;
    const pair=history.pop();pair[0].removed=false;pair[1].removed=false;selected=null;moves=Math.max(0,moves-1);pairs=Math.max(0,pairs-1);update();render();flash('Move undone.');beep(320,.06);
  }
  function update(){movesEl.textContent=moves;pairsEl.textContent=`${pairs} / 72`;if(undoBtn)undoBtn.disabled=!started||history.length===0;}
  function flash(text){messageEl.textContent=text;messageEl.classList.remove('hidden');clearTimeout(flash.t);flash.t=setTimeout(()=>messageEl.classList.add('hidden'),1300);}
  function formatTime(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
  function tick(){timeEl.textContent=formatTime(Math.floor((Date.now()-startTime)/1000));}
  function start(){clearInterval(timer);started=true;startTime=Date.now();timer=setInterval(tick,1000);moves=0;pairs=0;history=[];selected=null;update();const deck=makeSolvableDeck();tiles=positions.map((p,i)=>({...p,data:deck[i],order:i,removed:false}));modal.classList.add('hidden');messageEl.classList.add('hidden');timeEl.textContent='00:00';render();}
  function finish(){clearInterval(timer);started=false;$('finalTime').textContent=timeEl.textContent;$('finalMoves').textContent=moves;$('modalTitle').textContent='Board cleared!';$('modalCopy').textContent=`You cleared all 144 tiles in ${timeEl.textContent}, with ${moves} moves.`;modal.classList.remove('hidden');update();}
  function shuffleRemaining(){if(!started){start();return;}const active=tiles.filter(t=>!t.removed),data=shuffle(active.map(t=>t.data));active.forEach((t,i)=>t.data=data[i]);selected=null;render();flash('Remaining tiles shuffled.');}
  function hint(){if(!started){flash('Start a game first.');return;}const free=tiles.filter(t=>!t.removed&&isFree(t));for(let i=0;i<free.length;i++)for(let j=i+1;j<free.length;j++)if(same(free[i].data,free[j].data)){selected=free[i];render();setTimeout(()=>{if(!started)return;selected=free[j];render();setTimeout(()=>{selected=null;render();},650);},650);return;}flash('No matching open pair found. Shuffle to continue.');}
  function beep(freq,dur){if(!soundOn)return;try{const c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.frequency.value=freq;o.type='sine';g.gain.value=.025;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+dur);}catch(e){}}
  $('startGame').addEventListener('click',start);$('playAgain').addEventListener('click',start);$('shuffle').addEventListener('click',shuffleRemaining);$('hint').addEventListener('click',hint);if(undoBtn)undoBtn.addEventListener('click',undo);$('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundBtn').textContent=soundOn?'🔊':'🔇';});
  document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h')hint();if(e.key.toLowerCase()==='u')undo();if(e.key==='Escape'){selected=null;render();}});update();
})();