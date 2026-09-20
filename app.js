const socket=io();
const $=id=>document.getElementById(id);let me=null,room=null;
const COLORS={red:'#ef4444',green:'#22c55e',yellow:'#f59e0b',blue:'#3b82f6'};
const STARTS=[0,13,26,39],TRACK=52,FINISH=57,SAFE=new Set([0,8,13,21,26,34,39,47]);
const path=[];for(let c=0;c<15;c++)path.push([6,c]);for(let r=1;r<15;r++)path.push([r,8]);for(let c=7;c>=0;c--)path.push([8,c]);for(let r=7;r>=1;r--)path.push([r,6]);
while(path.length>52)path.pop();
function msg(t){$('lobbyMsg').textContent=t||''}
function join(code){const name=$('name').value.trim()||'Player';socket.emit('joinRoom',{roomId:code,name},r=>{if(!r.ok)return msg(r.error);me={id:r.playerId,color:r.color};history.replaceState({},'',`/room/${code}`);$('lobby').classList.add('hidden');$('game').classList.remove('hidden');room=r.room;render();});}
$('create').onclick=()=>socket.emit('createRoom',{},r=>{if(r.ok){$('room').value=r.roomId;join(r.roomId)}});
$('join').onclick=()=>{const c=$('room').value.trim().toUpperCase();if(c.length<4)return msg('Enter a valid room code.');join(c)};
$('room').onkeydown=e=>{if(e.key==='Enter')$('join').click()};
$('start').onclick=()=>socket.emit('start',r=>{if(!r.ok)alert(r.error)});
$('roll').onclick=()=>socket.emit('roll',r=>{if(!r.ok)alert(r.error)});
$('leave').onclick=()=>{socket.emit('leave');location.href='/'};
$('copyCode').onclick=async()=>{try{await navigator.clipboard.writeText(room.id);$('copyHint').textContent='Copied!';setTimeout(()=>$('copyHint').textContent='',1300)}catch{$('copyHint').textContent='Code: '+room.id}};
socket.on('state',r=>{room=r;render()});
function playerIndex(id){return room.players.findIndex(p=>p.id===id)}
function prog(pos,pi){if(pos===-1)return -1;return pos<TRACK?(pos-STARTS[pi]+TRACK)%TRACK:TRACK+(pos-TRACK)}
function boardPos(pr,pi){return pr<TRACK?(STARTS[pi]+pr)%TRACK:pr}
function render(){
 $('copyCode').textContent=room.id;$('players').innerHTML=room.players.map((p,i)=>`<div class="player ${p.id===me?.id?'you':''}"><span class="dot" style="background:${COLORS[p.color]}"></span>${escapeHtml(p.name)}${p.id===me?.id?' (You)':''}</div>`).join('');
 const current=room.players[room.turn]; const mine=playerIndex(me?.id); const myTurn=room.started&&mine===room.turn;
 $('status').textContent=room.winner?`${room.players.find(p=>p.id===room.winner)?.name||'Player'} wins! 🏆`:!room.started?(room.players.length<2?'Waiting for your friend…':'Ready to start!'):myTurn?'Your turn — roll the dice!':`${current?.name||'Player'}'s turn`;
 $('dice').textContent=room.dice?.value||'—';$('roll').disabled=!myTurn||!!room.dice;$('start').style.display=(!room.started&&room.players[0]?.id===me?.id&&room.players.length>=2)?'inline-block':'none';
 drawBoard();
 $('tokenPanel').innerHTML=room.players.map((p,pi)=>`<div class="token-row"><span><span class="dot" style="display:inline-block;background:${COLORS[p.color]};margin-right:7px"></span>${escapeHtml(p.name)}</span><span class="token-mini">${p.tokens.map(t=>`<span class="mini" style="background:${COLORS[p.color]}"></span>`).join('')}</span></div>`).join('');
}
function drawBoard(){const b=$('board');b.innerHTML='';for(let r=0;r<15;r++)for(let c=0;c<15;c++){const d=document.createElement('div');d.className='cell';const onPath=path.some(([x,y])=>x===r&&y===c);d.classList.add(onPath?'track':'home-path');if(onPath&&SAFE.has(path.findIndex(([x,y])=>x===r&&y===c)))d.innerHTML='<span class="star">★</span>';b.appendChild(d)}
 for(const [color,pos] of [['red',[0,0]],['green',[0,10]],['yellow',[10,10]],['blue',[10,0]]]){const y=document.createElement('div');y.className='yard '+color;for(let i=0;i<4;i++){const s=document.createElement('div');s.className='yard-slot';y.appendChild(s)}b.appendChild(y)}const center=document.createElement('div');center.className='center-home';b.appendChild(center);
 room.players.forEach((p,pi)=>p.tokens.forEach((pos,ti)=>{const t=document.createElement('button');t.className='token';t.style.background=COLORS[p.color];t.textContent=ti+1;t.title=`${p.name} token ${ti+1}`;const pr=prog(pos,pi);let r,c;if(pos===-1){const base=[[2,2],[2,12],[12,12],[12,2]][pi];r=base[0]+(ti>1);c=base[1]+(ti%2)}else if(pr>=TRACK){const lane=[[7,1],[1,7],[7,13],[13,7]][pi];const n=Math.min(5,pr-TRACK);r=lane[0];c=lane[1];if(pi===0)c=7-n; if(pi===1)r=7-n;if(pi===2)c=7+n;if(pi===3)r=7+n}else{[r,c]=path[pos]}
t.style.left=((c+.5)/15*100)+'%';t.style.top=((r+.5)/15*100)+'%';if(p.id===me?.id)t.classList.add('mine');const myTurn=room.started&&room.players[room.turn]?.id===me?.id;const can=room.dice&&myTurn&&room.dice.by===me.id&&canMove(p.tokens[ti],pi,room.dice.value);if(can){t.classList.add('movable');t.onclick=()=>socket.emit('move',{token:ti},r=>{if(!r.ok)alert(r.error)})}else t.disabled=true;b.appendChild(t)}));}
function canMove(pos,pi,d){const pr=prog(pos,pi);return pr<0?d===6:pr+d<=FINISH}
function escapeHtml(s){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
(function init(){const m=location.pathname.match(/\/room\/([A-Z0-9]+)/i);if(m)$('room').value=m[1].toUpperCase()})();
