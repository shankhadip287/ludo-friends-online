const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));
const PORT = process.env.PORT || 3000;
const rooms = new Map();
const COLORS = ['red','green','yellow','blue'];
const STARTS = [0,13,26,39];
const SAFE = new Set([0,8,13,21,26,34,39,47]);
const TRACK = 52;
const FINISH = 57; // progress 0..57; 57 is home finish

function code(){ return crypto.randomBytes(3).toString('hex').toUpperCase(); }
function makeRoom(){ let id; do{id=code()}while(rooms.has(id)); const room={id,players:[],started:false,turn:0,dice:null,winner:null,createdAt:Date.now()}; rooms.set(id,room); return room; }
function publicRoom(room){ return {id:room.id,players:room.players.map(p=>({id:p.id,name:p.name,color:p.color})),started:room.started,turn:room.turn,dice:room.dice,winner:room.winner}; }
function getRoom(socket){ return rooms.get(socket.data.roomId); }
function player(room,id){ return room.players.findIndex(p=>p.id===id); }
function progress(pos, pi){
  if(pos===-1) return -1;
  const start=STARTS[pi];
  return pos < TRACK ? (pos-start+TRACK)%TRACK : TRACK+(pos-TRACK);
}
function boardPos(progressValue,pi){ if(progressValue<0)return -1; if(progressValue<TRACK)return (STARTS[pi]+progressValue)%TRACK; return progressValue; }
function canMove(token,pi,dice){
  const pr=progress(token,pi);
  if(pr===-1)return dice===6;
  return pr+dice<=FINISH;
}
function move(room,pi,token,dice){
  const p=room.players[pi]; const old=p.tokens[token];
  let pr=progress(old,pi);
  if(pr===-1) pr=0; else pr+=dice;
  p.tokens[token]=boardPos(pr,pi);
  const landed=p.tokens[token];
  if(landed>=0 && landed<TRACK && !SAFE.has(landed)){
    for(let j=0;j<room.players.length;j++) if(j!==pi){
      room.players[j].tokens=room.players[j].tokens.map(t=>t===landed?-1:t);
    }
  }
  const won=p.tokens.every(t=>t>=TRACK);
  if(won){room.winner=p.id;room.started=false;room.dice=null;return;}
  if(dice!==6) room.turn=(room.turn+1)%room.players.length;
  room.dice=null;
}
function emit(room){io.to(room.id).emit('state',publicRoom(room));}

io.on('connection',socket=>{
  socket.on('createRoom',(_,cb)=>{const r=makeRoom(); cb({ok:true,roomId:r.id});});
  socket.on('joinRoom',({roomId,name},cb)=>{
    const id=String(roomId||'').trim().toUpperCase(); const r=rooms.get(id);
    if(!r)return cb({ok:false,error:'Room not found. Check the code.'});
    if(r.players.length>=4)return cb({ok:false,error:'Room is full (maximum 4 players).'});
    if(r.started)return cb({ok:false,error:'Game already started.'});
    const pi=r.players.length; const p={id:crypto.randomUUID(),name:(String(name||'Player').trim().slice(0,18)||'Player'),color:COLORS[pi],tokens:[-1,-1,-1,-1],socketId:socket.id};
    r.players.push(p); socket.data.roomId=id; socket.data.playerId=p.id; socket.join(id); cb({ok:true,playerId:p.id,color:p.color,room:publicRoom(r)}); emit(r);
  });
  socket.on('start',cb=>{const r=getRoom(socket); if(!r)return cb({ok:false,error:'Join a room first.'}); if(r.players[0]?.id!==socket.data.playerId)return cb({ok:false,error:'Only the room creator can start.'}); if(r.players.length<2)return cb({ok:false,error:'Invite your friend first.'}); r.started=true;r.turn=0;r.dice=null;r.winner=null;r.players.forEach(p=>p.tokens=[-1,-1,-1,-1]);emit(r);cb({ok:true});});
  socket.on('roll',cb=>{const r=getRoom(socket); if(!r||!r.started)return cb({ok:false,error:'Game is not running.'}); const pi=player(r,socket.data.playerId); if(pi!==r.turn)return cb({ok:false,error:'It is not your turn.'}); if(r.dice)return cb({ok:false,error:'Move your token first.'}); const d=1+Math.floor(Math.random()*6);r.dice={value:d,by:r.players[pi].id}; const legal=r.players[pi].tokens.some(t=>canMove(t,pi,d)); if(!legal){setTimeout(()=>{if(r.started&&r.dice&&r.dice.by===r.players[pi].id){r.dice=null;r.turn=(r.turn+1)%r.players.length;emit(r);}},900);} emit(r); cb({ok:true,dice:d,legal});});
  socket.on('move',({token},cb)=>{const r=getRoom(socket); if(!r||!r.started)return cb({ok:false,error:'Game is not running.'}); const pi=player(r,socket.data.playerId); if(pi!==r.turn)return cb({ok:false,error:'It is not your turn.'}); if(!r.dice||r.dice.by!==socket.data.playerId)return cb({ok:false,error:'Roll the dice first.'}); token=Number(token); if(!Number.isInteger(token)||token<0||token>3)return cb({ok:false,error:'Invalid token.'}); if(!canMove(r.players[pi].tokens[token],pi,r.dice.value))return cb({ok:false,error:'That token cannot move with this roll.'}); move(r,pi,token,r.dice.value);emit(r);cb({ok:true});});
  socket.on('leave',()=>leave(socket));
  socket.on('disconnect',()=>leave(socket));
});
function leave(socket){const r=getRoom(socket);if(!r)return;const pi=player(r,socket.data.playerId);if(pi<0)return;r.players.splice(pi,1);if(!r.players.length){rooms.delete(r.id);return;}if(r.turn>=r.players.length)r.turn=0;r.started=false;r.dice=null;r.players.forEach((p,i)=>{p.color=COLORS[i];p.tokens=[-1,-1,-1,-1]});emit(r);socket.leave(r.id);socket.data.roomId=null;}
app.get('/health',(req,res)=>res.json({ok:true,service:'ludo-friends-online'}));
app.get('/room/:code',(req,res)=>res.sendFile(__dirname+'/public/index.html'));
server.listen(PORT, '0.0.0.0', ()=>console.log(`Ludo server running on port ${PORT}`));
