(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const board=$('board'),timeEl=$('time'),movesEl=$('moves'),pairsEl=$('pairs'),messageEl=$('message'),modal=$('modal');
  if(!board||!timeEl||!movesEl||!pairsEl||!messageEl||!modal) return;
  const honors=[['東','east'],['南','south'],['西','west'],['北','north'],['中','red'],['發','green'],['白','white']];
  const special=[['梅','flower'],['蘭','flower'],['菊','flower'],['竹','flower'],['春','season'],['夏','season'],['秋','season'],['冬','season']];
  const chinese=['一','二','三','四','五','六','七','八','九'], bamboo=['🀐','🀑','🀒','🀓','🀔','🀕','🀖','🀗','🀘'];
  let tiles=[],selected=null,moves=0,pairs=0,startTime=0,timer=null,soundOn=true,started=false;
  const positions=[];
  function addLayer(z,rows,cols,x0,y0,dx=52,dy=68){for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)positions.push({x:x0+c*dx,y:y0+r*dy,z});}
  addLayer(0,6,16,84,90);addLayer(1,4,8,292,158);addLayer(2,3,4,396,226);addLayer(3,2,2,448,260);
  const types=[];
  for(const suit of ['characters','bamboo','dots'])for(let i=0;i<9;i++)for(let n=0;n<4;n++)types.push({kind:'suited',suit,value:i,label:suit==='dots'?String(i+1):chinese[i],glyph:suit==='characters'?chinese[i]:suit==='bamboo'?bamboo[i]:'●'});
  for(const [glyph,key] of honors)for(let n=0;n<4;n++)types.push({kind:'honor',key,glyph,label:glyph});
  for(const [glyph,key] of special)types.push({kind:'special',key,glyph,label:glyph});
  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function same(a,b){if(a.kind!==b.kind)return false;if(a.kind==='special'||a.kind==='honor')return a.key===b.key;return a.suit===b.suit&&a.value===b.value;}
  function isFree(t){if(tiles.some(o=>!o.removed&&o.z>t.z&&overlap(t,o)))return false;const left=tiles.some(o=>!o.removed&&o.z===t.z&&o.x<t.x&&o.x+52>t.x-3&&Math.abs(o.y-t.y)<20),right=tiles.some(o=>!o.removed&&o.z===t.z&&o.x>t.x&&o.x<t.x+55&&Math.abs(o.y-t.y)<20);return !left||!right;}
  function overlap(a,b){return a.x<b.x+52&&a.x+52>b.x&&a.y<b.y+68&&a.y+68>b.y;}
  function render(){board.innerHTML='';tiles.forEach(t=>{if(t.removed)return;const free=isFree(t),el=document.createElement('button');el.type='button';el.className=`tile ${free?'free':'blocked'}${selected===t?' selected':''}`;el.style.cssText=`left:${t.x}px;top:${t.y}px;z-index:${t.z*200+t.order}`;el.setAttribute('aria-label',`${t.data.label} tile${free?', open':''}`);const glyph=document.createElement('span');glyph.className='glyph';glyph.textContent=t.data.glyph;el.appendChild(glyph);const small=document.createElement('span');small.className='small';small.textContent=t.data.kind==='suited'?(t.data.suit==='characters'?'萬':t.data.suit==='bamboo'?'索':'筒'):t.data.kind==='honor'?'字':'';el.appendChild(small);el.addEventListener('click',()=>clickTile(t));board.appendChild(el);});}
  function clickTile(t){if(!started)return;if(!isFree(t)){flash('That tile is blocked.');return;}if(selected===t){selected=null;render();return;}if(!selected){selected=t;render();return;}if(same(selected.data,t.data)){const a=selected,b=t;selected=null;a.removed=true;b.removed=true;moves++;pairs++;update();render();beep(620,.07);if(pairs===72)finish();else if(!tiles.some(x=>!x.removed&&isFree(x)))flash('No open tiles left — shuffle to continue.');}else{selected=t;flash('Those tiles do not match.');render();beep(180,.08);}}
  function update(){movesEl.textContent=moves;pairsEl.textContent=`${pairs} / 72`;}
  function flash(text){messageEl.textContent=text;messageEl.classList.remove('hidden');clearTimeout(flash.t);flash.t=setTimeout(()=>messageEl.classList.add('hidden'),1300);}
  function formatTime(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
  function tick(){timeEl.textContent=formatTime(Math.floor((Date.now()-startTime)/1000));}
  function start(){clearInterval(timer);started=true;startTime=Date.now();timer=setInterval(tick,1000);moves=0;pairs=0;selected=null;update();const deck=shuffle(types.map(t=>({...t})));tiles=positions.map((p,i)=>({...p,data:deck[i],order:i,removed:false}));modal.classList.add('hidden');messageEl.classList.add('hidden');timeEl.textContent='00:00';render();}
  function finish(){clearInterval(timer);started=false;$('finalTime').textContent=timeEl.textContent;$('finalMoves').textContent=moves;$('modalTitle').textContent='Board cleared!';$('modalCopy').textContent=`You cleared all 144 tiles in ${timeEl.textContent}, with ${moves} moves.`;modal.classList.remove('hidden');}
  function shuffleRemaining(){if(!started){start();return;}const active=tiles.filter(t=>!t.removed),data=shuffle(active.map(t=>t.data));active.forEach((t,i)=>t.data=data[i]);selected=null;render();flash('Remaining tiles shuffled.');}
  function hint(){if(!started){flash('Start a game first.');return;}const free=tiles.filter(t=>!t.removed&&isFree(t));for(let i=0;i<free.length;i++)for(let j=i+1;j<free.length;j++)if(same(free[i].data,free[j].data)){selected=free[i];render();setTimeout(()=>{selected=free[j];render();setTimeout(()=>{selected=null;render();},650);},650);return;}flash('No matching open pair found. Shuffle to continue.');}
  function beep(freq,dur){if(!soundOn)return;try{const c=new(window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator(),g=c.createGain();o.frequency.value=freq;o.type='sine';g.gain.value=.025;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+dur);}catch(e){}}
  $('startGame').addEventListener('click',start);$('playAgain').addEventListener('click',start);$('shuffle').addEventListener('click',shuffleRemaining);$('hint').addEventListener('click',hint);$('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundBtn').textContent=soundOn?'🔊':'🔇';});document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='h')hint();if(e.key==='Escape'){selected=null;render();}});
  update();
})();