let ws;
let clientId = null;
const membersEl = document.getElementById('members');
const groupsEl = document.getElementById('groups');
const chatEl = document.getElementById('chat');
document.getElementById('connect').onclick = () => connect();
document.getElementById('send').onclick = () => sendMessage();

function appendMsg(author, body, extra){
  const div = document.createElement('div'); div.className='msg';
  const meta = document.createElement('div'); meta.className='meta'; meta.textContent = author + (extra?(' — '+extra):'');
  const b = document.createElement('div'); b.textContent = body;
  div.appendChild(meta); div.appendChild(b); chatEl.appendChild(div); chatEl.scrollTop = chatEl.scrollHeight;
}

function updateMembers(members){
  membersEl.innerHTML='';
  for(const id in members){
    const li = document.createElement('li'); li.textContent = members[id]; membersEl.appendChild(li);
  }
}

function updateGroups(groups){
  groupsEl.innerHTML='';
  for(const g in groups){
    const li = document.createElement('li'); li.textContent = g + ' ('+groups[g].length+')'; groupsEl.appendChild(li);
  }
}

function connect(){
  const user = document.getElementById('username').value.trim();
  if(!user) return alert('Enter username');
  ws = new WebSocket('ws://localhost:8765');
  ws.onopen = () => {
    ws.send(JSON.stringify({type:'register',username:user}));
    appendMsg('SYSTEM','Connected as '+user);
  };
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if(msg.type==='registered'){
      clientId = msg.client_id;
      appendMsg('SYSTEM','Registered id '+clientId);
    } else if(msg.type==='membership'){
      updateMembers(Object.fromEntries(Object.entries(msg.members).map(([k,v])=>[k,v.username])));
      updateGroups(msg.groups || {});
    } else if(msg.type==='group_msg' || msg.type==='private_msg'){
      const who = msg.from || msg.sender || 'unknown';
      appendMsg(who, msg.body || msg.text || '', msg.type);
      // send ack back
      if(clientId && msg.msg_id){
        ws.send(JSON.stringify({type:'ack',from:clientId,msg_id:msg.msg_id}));
      }
    } else if(msg.type==='members_list'){
      updateMembers(msg.members);
    }
  };
  ws.onclose = () => appendMsg('SYSTEM','Disconnected');
}

function sendMessage(){
  if(!ws || ws.readyState !== WebSocket.OPEN) return alert('Not connected');
  const type = document.getElementById('targetType').value;
  const target = document.getElementById('target').value.trim();
  const body = document.getElementById('message').value.trim();
  if(!target || !body) return alert('Provide target and message');
  const payload = (type==='group') ? {type:'group_msg',from:clientId,group:target,body:body} : {type:'private_msg',from:clientId,to:target,body:body};
  ws.send(JSON.stringify(payload));
  appendMsg('YOU', body, type+'->'+target);
  document.getElementById('message').value = '';
}
