import './style.css';
import {seabedHeight} from './terrain.js';
import {createGame,ensureDiversity,tick,STEP,buy,canAddSpecies,feed,price,serialize,restore,clamp} from './simulation.js';
import {BIOMES,chunkAt,oceanBiome,returnToAtlantis} from './ocean-layout.js';
import {createWorld} from './scene.js';
import {SPECIES,MAX_RESIDENTS,speciesOf,sizeLabel} from './species.js';
const $=id=>document.getElementById(id);
const SAVE_KEY='fishslop.aquarium.v1';
let saved=null,storageAvailable=true;
try{saved=restore(localStorage.getItem(SAVE_KEY));}catch{storageAvailable=false;}
let game=saved||createGame(),playing=false,paused=false,muted=true,audioContext=null,ambient=null;
const newArrivals=ensureDiversity(game);
document.addEventListener('click',e=>{const button=e.target.closest?.('button');if(button&&!$('modal').open)button.blur();});
const keys=new Set();let drag=null,toastTimer=0,last=performance.now(),accumulator=0,hudTimer=0,saveTimer=0;
let world;
const LIGHTING_KEY='fishslop.lighting.v1';
let nightMode=true;
try{nightMode=localStorage.getItem(LIGHTING_KEY)!=='day';}catch{}
function updateLightingUI(){
  document.body.classList.toggle('night',nightMode);
  $('lighting').textContent=nightMode?'☾ 夜晚':'☀ 白天';
  $('lighting').setAttribute('aria-label',nightMode?'切换至白天':'切换至黑夜');
  $('lighting').setAttribute('aria-pressed',String(nightMode));
  $('scene-state').textContent=paused?'TAKING A BREATHER':nightMode?'ATLANTIS · NIGHT DIVE':'ATLANTIS LIVE';
}
updateLightingUI();
$('lighting').onclick=()=>{
  nightMode=!nightMode;world?.setNight(nightMode);updateLightingUI();
  try{localStorage.setItem(LIGHTING_KEY,nightMode?'night':'day');}catch{}
};
const shopButtons=[...document.querySelectorAll('[data-buy]')];
const speciesSelect=$('species-select');
speciesSelect.innerHTML=SPECIES.map(sp=>`<option value="${sp.id}">${sp.name} · ${sizeLabel(sp)}</option>`).join('');speciesSelect.value='3';
function selectSpecies(){const sp=speciesOf(Number(speciesSelect.value));shopButtons[0].dataset.buy='fish:'+sp.id;$('friend-name').textContent=sp.name;$('friend-size').textContent=sizeLabel(sp);updateHUD();}
function stopObserving(){world?.stopObserving();$('stop-observing').hidden=true;}
speciesSelect.onchange=selectSpecies;
$('observe-species').onclick=()=>{const type=Number(speciesSelect.value);if(!game.fish.some(f=>f.type===type)){toast('这种生物还没有入住，可在码头添加。');return;}if(!playing)$('start').click();world?.focusSpecies(type);$('stop-observing').textContent=speciesOf(type).name+' · 返回驾驶';$('stop-observing').hidden=false;document.body.classList.remove('dock-open');$('dock-toggle').setAttribute('aria-expanded','false');$('dock-toggle').setAttribute('aria-label','Open aquarium shop');};
$('stop-observing').onclick=stopObserving;
const controls=`<p>Look after a little underwater neighborhood. Drop food, watch your fish grow, and swim near their golden coins to collect them.</p><div class="control-list"><span>W A S D</span><span>Move relative to the camera</span><span>Q / E</span><span>Dive / rise</span><span>Arrow keys</span><span>Turn & tilt the submarine</span><span>Drag the water</span><span>Look and steer</span><span>Space</span><span>Drop food (free!)</span><span>Shift</span><span>Boost</span><span>B</span><span>Open / close the dock</span><span>Esc</span><span>Pause / resume</span></div><p>Every 3 meals, a fish grows. Bigger fish make better coins. Hungry fish stop earning until fed. Follow the gold dots on your radar, and build a reef of 10 fish with 500 coins collected.</p>`;
if(saved){$('start').innerHTML='Welcome back <span>↗</span>';$('welcome').querySelector('p').innerHTML='Your little neighbors<br/>are happy to see you.';}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3800);}
function save(){try{localStorage.setItem(SAVE_KEY,serialize(game));storageAvailable=true;}catch{storageAvailable=false;}$('save-status').textContent=storageAvailable?'PROGRESS SAVED ON THIS DEVICE':'SAVING UNAVAILABLE · KEEP THIS TAB OPEN';}
function initAudio(){if(audioContext)return;try{audioContext=new AudioContext();const osc=audioContext.createOscillator();ambient=audioContext.createGain();osc.type='sine';osc.frequency.value=65;ambient.gain.value=0;osc.connect(ambient).connect(audioContext.destination);osc.start();}catch{toast('Audio is unavailable in this browser.');}}
function tone(freq,duration=.15){if(muted||!audioContext)return;const o=audioContext.createOscillator(),gain=audioContext.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.35,audioContext.currentTime+duration);gain.gain.setValueAtTime(.055,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);o.connect(gain).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);o.onended=()=>{o.disconnect();gain.disconnect();};}
function audioState(){if(ambient)ambient.gain.setTargetAtTime(!muted&&playing&&!paused?.018:0,audioContext.currentTime,.15);}
$('sound').onclick=async()=>{initAudio();if(!audioContext)return;await audioContext.resume();muted=!muted;$('sound').textContent=muted?'♪':'♫';$('sound').setAttribute('aria-label',muted?'Enable sound':'Mute sound');$('sound').setAttribute('aria-pressed',String(!muted));audioState();if(!muted)tone(320);};
function setPaused(value){paused=value;keys.clear();drag=null;$('pause').textContent=paused?'▷':'Ⅱ';$('pause').setAttribute('aria-label',paused?'Resume game':'Pause game');updateLightingUI();audioState();}
function showModal(title,content){setPaused(true);$('modal-title').textContent=title;$('modal-content').innerHTML=content;if(!$('modal').open)$('modal').showModal();}
function closeModal(){$('modal').close();setPaused(false);document.activeElement?.blur();}
$('close-modal').onclick=closeModal;$('resume').onclick=closeModal;
$('modal').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
$('help').onclick=()=>showModal('A small guide to the deep.',controls);
$('pause').onclick=()=>{if(paused)closeModal();else showModal('Just floating for a moment.',`<p>Your reef is paused and your progress is saved. Take your time — everyone will be right here.</p>`);save();};
$('return-home').onclick=()=>{
  stopObserving();keys.clear();returnToAtlantis(game);world?.resetCamera();save();updateHUD();toast('已返回亚特兰蒂斯，鱼群随你一起归航。');
};
$('dock-toggle').onclick=()=>{
  const open=document.body.classList.toggle('dock-open');
  $('dock-toggle').setAttribute('aria-expanded',String(open));
  $('dock-toggle').setAttribute('aria-label',open?'Close aquarium shop':'Open aquarium shop');
};
$('start').onclick=()=>{playing=true;document.body.classList.add('playing');$('start').blur();toast(newArrivals?'新居民已入住！按 B 选择物种，近距离观察。':'Welcome aboard. Hold Space to ring the dinner bell.');initAudio();audioState();};
for(const button of shopButtons)button.onclick=()=>{
  const item=button.dataset.buy;
  if(!playing){$('start').click();}
  if(buy(game,item)){tone(550);toast(item.startsWith('fish')?'A new friend has joined your reef.':'Upgrade fitted. Your submarine says thank you.');save();updateHUD();button.blur();}
};
const gameKeys=new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','Space','ShiftLeft','ShiftRight','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']);
addEventListener('keydown',e=>{
  if(e.code==='Escape'&&!$('modal').open){e.preventDefault();$('pause').click();return;}
  if(e.code==='KeyB'&&!paused&&!e.repeat){e.preventDefault();$('dock-toggle').click();return;}
  if(!playing||paused)return;
  if(gameKeys.has(e.code)){if(e.target instanceof HTMLElement&&e.target.closest('button,dialog,input,select'))return;e.preventDefault();stopObserving();keys.add(e.code);if(e.code==='Space'&&!e.repeat)feed(game);}
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{keys.clear();drag=null;if(playing&&!paused){showModal('Your reef is taking a breather.','<p>The game paused while you were away. Ready to dive back in?</p>');save();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();save();if(playing&&!paused)showModal('Your reef is taking a breather.','<p>Everything waited for you. Welcome back.</p>');}});
addEventListener('pagehide',save);
const canvas=$('world');
canvas.addEventListener('pointerdown',e=>{if(!playing||paused)return;stopObserving();drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);document.activeElement?.blur();});
canvas.addEventListener('pointermove',e=>{if(!drag||paused)return;game.sub.yaw-=(e.clientX-drag.x)*.004;game.sub.pitch=clamp(game.sub.pitch-(e.clientY-drag.y)*.003,-.7,.7);drag={x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
for(const button of document.querySelectorAll('[data-key]')){
  button.addEventListener('pointerdown',e=>{e.preventDefault();if(paused)return;stopObserving();keys.add(button.dataset.key);if(button.dataset.key==='Space')feed(game);button.setPointerCapture(e.pointerId);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.key));
}
const input=()=>({forward:Number(keys.has('KeyW'))-Number(keys.has('KeyS')),strafe:Number(keys.has('KeyD'))-Number(keys.has('KeyA')),vertical:Number(keys.has('KeyE'))-Number(keys.has('KeyQ')),turn:Number(keys.has('ArrowLeft'))-Number(keys.has('ArrowRight')),pitch:Number(keys.has('ArrowUp'))-Number(keys.has('ArrowDown')),boost:keys.has('ShiftLeft')||keys.has('ShiftRight'),feed:keys.has('Space')});
function updateHUD(){
  const homeDistance=Math.hypot(game.sub.x,game.sub.z),cell=chunkAt(game.sub);
  $('ocean-region').textContent=homeDistance<60?'亚特兰蒂斯':BIOMES[oceanBiome(cell.x,cell.z)];
  $('home-distance').textContent=(homeDistance<1000?Math.round(homeDistance)+' m':(homeDistance/1000).toFixed(1)+' km')+' · 距起点';
  $('return-home').disabled=homeDistance<25||paused;
  $('food-ready').textContent=game.cooldown>.05?'Feeding':'Ready';
  $('speed-readout').textContent=Math.hypot(game.sub.vx,game.sub.vy,game.sub.vz).toFixed(1)+' m/s';
  $('nearby-fish').textContent=game.fish.filter(f=>Math.hypot(f.x-game.sub.x,f.y-game.sub.y,f.z-game.sub.z)<10).length+' nearby';
  $('coins').textContent=game.coins.toLocaleString();$('population').textContent=game.fish.length;
  const progress=Math.min(1,game.fish.length/10)*.5+Math.min(1,game.earned/500)*.5;
  $('mission-percent').textContent=Math.floor(progress*100)+'%';$('mission-progress').style.width=progress*100+'%';
  $('fish-goal').textContent=`${game.fish.length} / 10 fish`;$('coin-goal').textContent=`${Math.min(500,game.earned)} / 500 coins`;
  if(game.won)$('mission-description').textContent='A thriving reef. Keep making it your own.';
  $('depth-number').textContent=(21-game.sub.y).toFixed(1);
  $('seabed-clearance').textContent='离底 '+(game.sub.y-seabedHeight(game.sub.x,game.sub.z)).toFixed(1)+' m';
  const sp=speciesOf(Number(speciesSelect.value));$('species-info').textContent=`${game.fish.filter(f=>f.type===sp.id).length} 位居民 · ${game.fish.length} / ${MAX_RESIDENTS}`;
  if(world)$('performance').textContent=Math.round(Math.min(120,world.metrics.fps))+' FPS';
  const health=Math.round((1-game.fish.reduce((n,f)=>n+f.hunger,0)/game.fish.length)*100);
  $('wellbeing').textContent=health+'%';$('wellbeing-bar').style.width=health+'%';
  for(const button of shopButtons){const item=button.dataset.buy,isFish=item.startsWith('fish'),max=isFish?!canAddSpecies(game,Number(item.split(':')[1])):game.upgrades[item]>=3;const cost=price(game,item);button.disabled=paused||max||game.coins<cost;$('price-'+(isFish?'fish':item)).textContent=max?'已满':'✦ '+cost;button.title=max?'Fully upgraded':`Buy for ${cost} coins`;if(!isFish&&game.upgrades[item])$('level-'+item).textContent=`Level ${game.upgrades[item]} / 3`;}

}
const radar=$('radar').getContext('2d');
const radarScale=75/45;
function drawRadar(){const c=radar;c.clearRect(0,0,180,180);c.save();c.translate(90,90);
  for(const r of [27,54,80]){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.strokeStyle='#a2dcca26';c.lineWidth=.7;c.stroke();}
  c.strokeStyle='#a2dcca19';c.beginPath();c.moveTo(-80,0);c.lineTo(80,0);c.moveTo(0,-80);c.lineTo(0,80);c.stroke();
  c.fillStyle='#94d6c30c';c.beginPath();c.moveTo(0,0);c.arc(0,0,80,game.time*.4,game.time*.4+.5);c.closePath();c.fill();
  const plot=(p,color,r)=>{const x=(p.x-game.sub.x)*radarScale,z=(p.z-game.sub.z)*radarScale;if(Math.hypot(x,z)>78)return;c.beginPath();c.arc(x,z,r,0,Math.PI*2);c.fillStyle=color;c.fill();};
  for(const f of game.fish)plot(f,f.hunger>.7?'#e7826e':'#dfb892',2);
  for(const p of game.drops)plot(p,'#ffe6a1',1.5);
  const hx=-game.sub.x,hz=-game.sub.z,hd=Math.hypot(hx,hz),hr=Math.min(72,hd*radarScale);
  if(hd>5){c.fillStyle='#8cdbfa';c.fillRect(hx/hd*hr-3,hz/hd*hr-3,6,6);}
  c.save();c.rotate(-(game.sub.heading??game.sub.yaw));c.beginPath();c.moveTo(0,-5);c.lineTo(-3,4);c.lineTo(0,2);c.lineTo(3,4);c.closePath();c.fillStyle='#d8f6df';c.fill();c.restore();c.restore();
}
function events(){let coinValue=0;for(const event of game.events){if(event.type==='feed')tone(170,.09);if(event.type==='eat')tone(390,.08);if(event.type==='coin')coinValue+=event.value;if(event.type==='win'){showModal('Look what you grew.',`<p>Ten little lives. Five hundred coins. An entire neighborhood, made by you.</p><p>Your reef is thriving. Keep diving, meet more friends, and make this little corner of the ocean yours.</p>`);save();}}
  if(coinValue){tone(760,.16);toast(`+${coinValue} coins · A little thank-you from your fish.`);}game.events.length=0;
}
function frame(now){const dt=Math.min((now-last)/1000,.1);last=now;
  if(!paused&&!document.hidden){
    if(playing){accumulator+=dt;while(accumulator>=STEP){tick(game,input(),STEP);accumulator-=STEP;}events();saveTimer+=dt;if(saveTimer>5){saveTimer=0;save();}}
    // Preview is animated without spending hunger, currency, or saved progress.
    const preview=playing?game:{...game,time:now/1000,fish:game.fish.map(f=>({...f,x:f.x+Math.sin(now/4500+f.id)*.4,y:f.y+Math.sin(now/2000+f.id)*.18}))};
    world.render(preview,dt,playing);
  }else accumulator=0;
  hudTimer+=dt;if(hudTimer>.1){hudTimer=0;updateHUD();drawRadar();}
  requestAnimationFrame(frame);
}
try{
  world=await createWorld(canvas,{night:nightMode});world.setNight(nightMode);await world.prepare(game);selectSpecies();if(newArrivals)save();$('loading').remove();updateHUD();drawRadar();last=performance.now();requestAnimationFrame(frame);
  // Read-only development telemetry for reproducible browser smoke tests.
  if(import.meta.env.DEV)window.__fishslop={snapshot:()=>JSON.parse(serialize(game)),status:()=>({playing,paused,drawCalls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles})};
}catch(error){console.error(error);$('loading').innerHTML='<strong>The aquarium couldn’t open.</strong><span>Check that WebGL is enabled, then reload to try again.</span><button class="primary" onclick="location.reload()">Try again ↗</button>';}
