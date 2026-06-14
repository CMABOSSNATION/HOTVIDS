// HOTVID Gifts Panel - shared between index.html and livestream.html
// Include this script in both pages

const GIFTS_CATALOG = [
  {id:'rose',     name:'Rose',     emoji:'🌹', coins:50,    ugx:500},
  {id:'lollipop', name:'Lollipop', emoji:'🍭', coins:100,   ugx:1000},
  {id:'icecream', name:'Ice Cream',emoji:'🍦', coins:200,   ugx:2000},
  {id:'trophy',   name:'Trophy',   emoji:'🏆', coins:500,   ugx:5000},
  {id:'rocket',   name:'Rocket',   emoji:'🚀', coins:1000,  ugx:10000},
  {id:'car',      name:'Sport Car',emoji:'🚗', coins:2500,  ugx:25000},
  {id:'crown',    name:'Crown',    emoji:'👑', coins:5000,  ugx:50000},
  {id:'diamond',  name:'Diamond',  emoji:'💎', coins:10000, ugx:100000},
  {id:'castle',   name:'Castle',   emoji:'🏰', coins:50000, ugx:500000},
  {id:'galaxy',   name:'Galaxy',   emoji:'🌌', coins:100000,ugx:1000000},
];

let _selectedGift = null;
let _giftTargetId = null;
let _giftTargetType = 'video'; // 'video' or 'live'
let _coinBalance = 0;

function initGiftsPanel(){
  // Create panel HTML if not exists
  if(document.getElementById('gifts-panel-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'gifts-panel-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:400;display:none;';
  overlay.onclick = (e) => { if(e.target===overlay) closeGiftsPanel(); };
  
  overlay.innerHTML = `
    <div id="gifts-panel" style="position:absolute;bottom:0;left:0;right:0;background:#111;border-radius:20px 20px 0 0;padding:0 0 24px;">
      <div style="padding:14px 16px;border-bottom:1px solid #1e1e1e;display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:15px;font-weight:700;">Send a Gift 🎁</div>
          <div style="font-size:12px;color:#666;margin-top:2px;">Balance: <span id="gp-balance" style="color:#ffd700;">0 🪙</span></div>
        </div>
        <span onclick="closeGiftsPanel()" style="font-size:22px;cursor:pointer;color:#666;">✕</span>
      </div>
      
      <!-- Gift grid -->
      <div style="padding:14px;overflow-x:auto;">
        <div id="gp-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;min-width:320px;"></div>
      </div>
      
      <!-- Selected gift preview -->
      <div id="gp-preview" style="display:none;margin:0 14px;background:#1a1a1a;border-radius:14px;padding:14px;text-align:center;margin-bottom:12px;">
        <div id="gp-preview-emoji" style="font-size:40px;margin-bottom:6px;"></div>
        <div id="gp-preview-name" style="font-size:14px;font-weight:700;color:#fff;"></div>
        <div id="gp-preview-cost" style="font-size:12px;color:#ffd700;margin-top:3px;"></div>
      </div>
      
      <!-- Quantity -->
      <div style="padding:0 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;">
        <span style="font-size:13px;color:#888;">Qty:</span>
        <div style="display:flex;gap:6px;">
          <button onclick="setGiftQty(1)" class="gqty-btn" id="gqty-1" style="background:#e50000;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:700;cursor:pointer;">×1</button>
          <button onclick="setGiftQty(10)" class="gqty-btn" id="gqty-10" style="background:#333;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:700;cursor:pointer;">×10</button>
          <button onclick="setGiftQty(99)" class="gqty-btn" id="gqty-99" style="background:#333;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:13px;font-weight:700;cursor:pointer;">×99</button>
        </div>
      </div>
      
      <!-- Send button -->
      <div style="padding:0 14px;">
        <button id="gp-send-btn" onclick="sendGiftFromPanel()" style="width:100%;background:linear-gradient(135deg,#e50000,#ff4444);color:#fff;border:none;border-radius:14px;padding:15px;font-size:16px;font-weight:700;cursor:pointer;">
          Send Gift 🎁
        </button>
        <div style="text-align:center;margin-top:8px;font-size:12px;color:#555;">
          <span onclick="location.href='wallet.html'" style="color:#ffd700;cursor:pointer;">+ Buy more coins 🪙</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  // Render gifts grid
  renderGiftsGrid();
}

let _giftQty = 1;
function setGiftQty(qty){
  _giftQty = qty;
  document.querySelectorAll('.gqty-btn').forEach(b=>{
    b.style.background = b.id === 'gqty-'+qty ? '#e50000' : '#333';
  });
  updateGiftPreview();
}

function renderGiftsGrid(){
  const grid = document.getElementById('gp-grid');
  if(!grid) return;
  grid.innerHTML = GIFTS_CATALOG.map(g=>`
    <div onclick="selectGiftItem('${g.id}')" id="gi-${g.id}" style="text-align:center;cursor:pointer;padding:8px 4px;border-radius:12px;border:2px solid transparent;transition:.15s;">
      <div style="font-size:28px;line-height:1.3;">${g.emoji}</div>
      <div style="font-size:9px;color:#aaa;margin-top:2px;">${g.name}</div>
      <div style="font-size:10px;color:#ffd700;font-weight:700;">${g.coins>=1000?(g.coins/1000)+'K':g.coins}🪙</div>
    </div>
  `).join('');
}

function selectGiftItem(giftId){
  _selectedGift = GIFTS_CATALOG.find(g=>g.id===giftId);
  if(!_selectedGift) return;
  
  // Highlight selected
  document.querySelectorAll('[id^="gi-"]').forEach(el=>{
    el.style.borderColor='transparent';
    el.style.background='transparent';
  });
  const sel = document.getElementById('gi-'+giftId);
  if(sel){ sel.style.borderColor='#ffd700'; sel.style.background='rgba(255,215,0,.1)'; }
  
  updateGiftPreview();
}

function updateGiftPreview(){
  if(!_selectedGift) return;
  const preview = document.getElementById('gp-preview');
  const totalCoins = _selectedGift.coins * _giftQty;
  if(preview){
    preview.style.display='block';
    document.getElementById('gp-preview-emoji').textContent = _selectedGift.emoji;
    document.getElementById('gp-preview-name').textContent = _selectedGift.name + (_giftQty>1?` ×${_giftQty}`:'');
    document.getElementById('gp-preview-cost').textContent = `${totalCoins.toLocaleString()} 🪙 coins`;
  }
  const sendBtn = document.getElementById('gp-send-btn');
  if(sendBtn){
    const canAfford = _coinBalance >= totalCoins;
    sendBtn.style.background = canAfford ? 'linear-gradient(135deg,#e50000,#ff4444)' : '#333';
    sendBtn.textContent = canAfford ? `Send ${_selectedGift.emoji} Gift` : `Need ${totalCoins.toLocaleString()} 🪙 coins`;
  }
}

async function openGiftsPanel(targetId, targetType){
  _giftTargetId = targetId;
  _giftTargetType = targetType || 'video';
  _selectedGift = null;
  _giftQty = 1;
  
  initGiftsPanel();
  
  // Load coin balance
  const token = localStorage.getItem('hvt');
  if(!token){ location.href='/?login=1'; return; }
  
  try{
    const r = await fetch('/api/gifts/wallet',{headers:{Authorization:'Bearer '+token}});
    const d = await r.json();
    _coinBalance = d.coin_balance || d.coins || 0;
    const balEl = document.getElementById('gp-balance');
    if(balEl) balEl.textContent = _coinBalance.toLocaleString() + ' 🪙';
  }catch(e){ _coinBalance = 0; }
  
  // Reset UI
  document.querySelectorAll('[id^="gi-"]').forEach(el=>{ el.style.borderColor='transparent'; el.style.background='transparent'; });
  const preview = document.getElementById('gp-preview');
  if(preview) preview.style.display='none';
  document.querySelectorAll('.gqty-btn').forEach(b=>b.style.background='#333');
  const gq1 = document.getElementById('gqty-1');
  if(gq1) gq1.style.background='#e50000';
  
  document.getElementById('gifts-panel-overlay').style.display='block';
}

function closeGiftsPanel(){
  const overlay = document.getElementById('gifts-panel-overlay');
  if(overlay) overlay.style.display='none';
}

async function sendGiftFromPanel(){
  if(!_selectedGift){ showGiftToast('Select a gift first'); return; }
  const token = localStorage.getItem('hvt');
  if(!token){ location.href='/?login=1'; return; }
  
  const totalCoins = _selectedGift.coins * _giftQty;
  if(_coinBalance < totalCoins){
    showGiftToast('Not enough coins! Buy more 🪙');
    setTimeout(()=>location.href='wallet.html',1500);
    return;
  }
  
  const btn = document.getElementById('gp-send-btn');
  if(btn){ btn.textContent='Sending...'; btn.disabled=true; }
  
  try{
    const r = await fetch('/api/gifts/send',{
      method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
      body:JSON.stringify({
        gift_type: _selectedGift.id,
        quantity: _giftQty,
        target_id: _giftTargetId,
        target_type: _giftTargetType,
      })
    });
    const d = await r.json();
    if(d.error){ showGiftToast(d.error); if(btn){btn.disabled=false;btn.textContent='Send Gift 🎁';} return; }
    
    _coinBalance -= totalCoins;
    const balEl = document.getElementById('gp-balance');
    if(balEl) balEl.textContent = _coinBalance.toLocaleString() + ' 🪙';
    
    closeGiftsPanel();
    animateGift(_selectedGift.emoji, _giftQty);
    showGiftToast(`${_selectedGift.emoji} ${_selectedGift.name} sent!`);
  }catch(e){
    showGiftToast('Failed to send gift');
    if(btn){btn.disabled=false;btn.textContent='Send Gift 🎁';}
  }
}

function animateGift(emoji, qty){
  const container = document.getElementById('giftanim') || document.body;
  const count = Math.min(qty, 12);
  for(let i=0;i<count;i++){
    setTimeout(()=>{
      const el = document.createElement('div');
      el.style.cssText = `position:fixed;bottom:15%;left:${10+Math.random()*80}%;font-size:${40+Math.random()*20}px;z-index:9999;animation:gflyup 1.5s ease-out forwards;pointer-events:none;`;
      el.textContent = emoji;
      // Add keyframe if not exists
      if(!document.getElementById('gift-anim-style')){
        const style = document.createElement('style');
        style.id='gift-anim-style';
        style.textContent='@keyframes gflyup{0%{transform:translateY(0) scale(1);opacity:1;}100%{transform:translateY(-65vh) scale(2);opacity:0;}}';
        document.head.appendChild(style);
      }
      document.body.appendChild(el);
      setTimeout(()=>el.remove(),1600);
    }, i*120);
  }
}

function showGiftToast(msg){
  let el = document.getElementById('toast');
  if(!el){
    el = document.createElement('div');
    el.id='toast';
    el.style.cssText='position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1e1e1e;border:1px solid #333;color:#fff;padding:9px 18px;border-radius:20px;font-size:12px;font-weight:600;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none;white-space:nowrap;';
    document.body.appendChild(el);
  }
  el.textContent=msg;
  el.style.opacity='1';
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.style.opacity='0',2500);
}
