(function(){
  'use strict';

  /* ---------- Theme (system only, live-updating) ---------- */
  const sun = document.getElementById('themeIconSun');
  const moon = document.getElementById('themeIconMoon');
  function syncThemeIcon(e){
    const dark = e.matches;
    sun.classList.toggle('hidden', dark);
    moon.classList.toggle('hidden', !dark);
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  syncThemeIcon(mq);
  mq.addEventListener('change', syncThemeIcon);

  /* ---------- Mobile sidebar ---------- */
  const sidebar = document.getElementById('sidebar');
  document.getElementById('menuBtn').addEventListener('click', ()=> sidebar.classList.toggle('open'));

  /* ================= GAME LIBRARY ================= */
  // Each game: init(stageEl, controlsEl) -> returns {stop(){}}
  const games = [
    {
      id:'geometry-rush', title:'Geometry Rush', category:'action', icon:'🔺',
      color:'linear-gradient(135deg,#4285F4,#8ab4f8)', plays:'128K plays',
      desc:'Jump your cube over spikes and blocks in this fast auto-runner. Tap, click, or press space to jump — one hit sends you back to the start.',
      init: initGeometryRush
    },
    {
      id:'snake', title:'Snake Classic', category:'classics', icon:'🐍',
      color:'linear-gradient(135deg,#34A853,#8bd6a4)', plays:'96K plays',
      desc:'Guide the snake to eat as many apples as you can without running into the walls or your own tail. Use arrow keys or swipe.',
      init: initSnake
    },
    {
      id:'2048', title:'2048', category:'puzzle', icon:'🧩',
      color:'linear-gradient(135deg,#FBBC05,#fcd679)', plays:'201K plays',
      desc:'Slide the tiles to combine matching numbers. Reach the 2048 tile to win — keep going after that to push your high score.',
      init: init2048
    },
    {
      id:'flappy', title:'Flappy Block', category:'arcade', icon:'🟦',
      color:'linear-gradient(135deg,#EA4335,#f28b82)', plays:'74K plays',
      desc:'Tap to flap and squeeze the block through the gaps between pipes. Simple to learn, tough to master.',
      init: initFlappy
    },
    {
      id:'breakout', title:'Breakout', category:'arcade', icon:'🧱',
      color:'linear-gradient(135deg,#7C4DFF,#b39ddb)', plays:'53K plays',
      desc:'Clear every brick with a bouncing ball. Move the paddle with your mouse, arrow keys, or by dragging on mobile.',
      init: initBreakout
    },
    {
      id:'tictactoe', title:'Tic-Tac-Toe', category:'puzzle', icon:'⭕',
      color:'linear-gradient(135deg,#00ACC1,#80deea)', plays:'41K plays',
      desc:'A quick match against the computer. Get three in a row before it does.',
      init: initTicTacToe
    }
  ];

  /* ================= RENDER: HOME GRID ================= */
  const homeGrid = document.getElementById('homeGrid');
  const homeEmpty = document.getElementById('homeEmpty');
  const chipRow = document.getElementById('chipRow');
  const searchInput = document.getElementById('searchInput');

  const categories = [
    {id:'all', label:'All'},
    {id:'arcade', label:'Arcade'},
    {id:'puzzle', label:'Puzzle'},
    {id:'classics', label:'Classics'},
    {id:'action', label:'Action'}
  ];
  let activeCategory = 'all';
  let searchTerm = '';

  categories.forEach(c=>{
    const chip = document.createElement('button');
    chip.className = 'chip' + (c.id==='all' ? ' active' : '');
    chip.textContent = c.label;
    chip.dataset.category = c.id;
    chip.addEventListener('click', ()=> setCategory(c.id));
    chipRow.appendChild(chip);
  });

  function setCategory(catId){
    activeCategory = catId;
    document.querySelectorAll('.chip').forEach(c=> c.classList.toggle('active', c.dataset.category===catId));
    document.querySelectorAll('.nav-item[data-category]').forEach(n=> n.classList.toggle('active', n.dataset.category===catId));
    document.querySelectorAll('.tab-item[data-category]').forEach(n=> n.classList.toggle('active', n.dataset.category===catId));
    renderGrid();
  }

  searchInput.addEventListener('input', ()=>{
    searchTerm = searchInput.value.trim().toLowerCase();
    renderGrid();
  });

  function makeCard(game){
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <div class="card-thumb" style="background:${game.color}">${game.icon}</div>
      <div class="card-body">
        <p class="card-title">${game.title}</p>
        <div class="card-sub"><span class="pill">${capitalize(game.category)}</span><span>${game.plays}</span></div>
      </div>`;
    card.addEventListener('click', ()=> openGame(game.id));
    return card;
  }
  function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

  function renderGrid(){
    homeGrid.innerHTML = '';
    const filtered = games.filter(g=>{
      const matchCat = activeCategory==='all' || g.category===activeCategory;
      const matchSearch = !searchTerm || g.title.toLowerCase().includes(searchTerm);
      return matchCat && matchSearch;
    });
    filtered.forEach(g=> homeGrid.appendChild(makeCard(g)));
    homeEmpty.classList.toggle('hidden', filtered.length>0);
    homeGrid.classList.toggle('hidden', filtered.length===0);
  }
  renderGrid();

  /* ================= ROUTING: home <-> play ================= */
  const viewHome = document.getElementById('view-home');
  const viewPlay = document.getElementById('view-play');
  const playerStage = document.getElementById('playerStage');
  const playerControls = document.getElementById('playerControls');
  const playTitle = document.getElementById('playTitle');
  const playCategory = document.getElementById('playCategory');
  const playPlays = document.getElementById('playPlays');
  const playDesc = document.getElementById('playDesc');
  const upNextList = document.getElementById('upNextList');

  let activeGameHandle = null;

  function stopActiveGame(){
    if (activeGameHandle && typeof activeGameHandle.stop === 'function') {
      try { activeGameHandle.stop(); } catch(e){}
    }
    activeGameHandle = null;
    playerStage.innerHTML = '';
    playerControls.innerHTML = '';
  }

  function openGame(id){
    const game = games.find(g=>g.id===id);
    if (!game) return;
    stopActiveGame();

    viewHome.classList.add('hidden');
    viewPlay.classList.remove('hidden');
    window.scrollTo({top:0, behavior:'instant' in window ? 'instant' : 'auto'});

    playTitle.textContent = game.title;
    playCategory.textContent = capitalize(game.category);
    playPlays.textContent = game.plays;
    playDesc.textContent = game.desc;

    activeGameHandle = game.init(playerStage, playerControls) || null;

    // up next: other games, shuffled-ish (deterministic by offset)
    upNextList.innerHTML = '';
    games.filter(g=>g.id!==id).forEach(g=>{
      const item = document.createElement('div');
      item.className = 'up-next-card';
      item.innerHTML = `
        <div class="up-next-thumb" style="background:${g.color}">${g.icon}</div>
        <div>
          <p class="up-next-title">${g.title}</p>
          <div class="up-next-sub">${g.plays}</div>
        </div>`;
      item.addEventListener('click', ()=> openGame(g.id));
      upNextList.appendChild(item);
    });
  }

  function goHome(){
    stopActiveGame();
    viewPlay.classList.add('hidden');
    viewHome.classList.remove('hidden');
  }

  document.getElementById('backBtn').addEventListener('click', goHome);
  document.querySelectorAll('[data-route="home"], .brand').forEach(el=>{
    el.addEventListener('click', goHome);
  });
  document.querySelectorAll('.nav-item[data-category], .tab-item[data-category]').forEach(el=>{
    el.addEventListener('click', ()=>{
      goHome();
      setCategory(el.dataset.category);
      sidebar.classList.remove('open');
    });
  });

  /* ================= HELPERS ================= */
  function makeCanvas(stage, w, h){
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.background = '#111';
    stage.appendChild(canvas);
    return canvas;
  }
  function addControlBtn(controlsEl, label, onClick){
    const btn = document.createElement('button');
    btn.className = 'ctrl-btn';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    controlsEl.appendChild(btn);
    return btn;
  }

  /* ================= GAME: GEOMETRY RUSH ================= */
  function initGeometryRush(stage, controls){
    const canvas = makeCanvas(stage, 800, 500);
    const ctx = canvas.getContext('2d');
    let raf, running=true, camX=0, attempts=1;
    const GROUND_Y = 380, SIZE=34, GRAVITY=0.9, JUMP_V=-13.5, SPEED=5.2;
    let player, particles, level, LEVEL_LEN=6000, state='playing';

    function buildLevel(){
      const items=[]; let x=700, seed=42;
      function rand(){ seed=(seed*9301+49297)%233280; return seed/233280; }
      while(x<LEVEL_LEN){
        const r=rand();
        if (r<0.35){ items.push({type:'spike',x}); x+=170+rand()*90; }
        else if (r<0.6){ items.push({type:'block',x,h:1}); x+=190+rand()*100; }
        else if (r<0.75){ items.push({type:'block',x,h:2}); x+=210+rand()*100; }
        else { items.push({type:'spike',x}); items.push({type:'spike',x:x+65}); x+=260+rand()*100; }
      }
      items.push({type:'flag',x:LEVEL_LEN});
      return items;
    }
    function reset(){
      player={x:100,y:GROUND_Y-SIZE,vy:0,onGround:true,rot:0};
      camX=0; particles=[]; state='playing';
    }
    level = buildLevel();
    reset();

    function jump(){ if(state==='playing' && player.onGround){ player.vy=JUMP_V; player.onGround=false; } }
    function overlap(ax,ay,aw,ah,bx,by,bw,bh){ return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by; }

    function draw(){
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0,0,800,500);
      const g = ctx.createLinearGradient(0,0,0,500);
      g.addColorStop(0,'#16213e'); g.addColorStop(1,'#0f1626');
      ctx.fillStyle=g; ctx.fillRect(0,0,800,500);

      if (state==='playing'){
        camX+=SPEED;
        if (camX>=LEVEL_LEN-150) state='win';
        player.vy+=GRAVITY; player.y+=player.vy;
        if (player.y+SIZE>=GROUND_Y){ player.y=GROUND_Y-SIZE; player.vy=0; player.onGround=true; }
        else player.onGround=false;
        player.rot = player.onGround ? Math.round(player.rot/90)*90 : player.rot+8;
        if (Math.random()<0.5) particles.push({x:player.x,y:player.y+SIZE/2,life:1});
        particles.forEach(p=>p.life-=0.05);
        particles=particles.filter(p=>p.life>0);
      }

      ctx.fillStyle='#0f3460'; ctx.fillRect(0,GROUND_Y,800,500-GROUND_Y);
      ctx.strokeStyle='rgba(66,133,244,0.6)'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(0,GROUND_Y); ctx.lineTo(800,GROUND_Y); ctx.stroke();

      particles.forEach(p=>{
        ctx.globalAlpha=p.life*0.5; ctx.fillStyle='#4285F4';
        ctx.beginPath(); ctx.arc(p.x-(camX-player.x),p.y,4*p.life,0,7); ctx.fill();
      });
      ctx.globalAlpha=1;

      let collided=false;
      level.forEach(it=>{
        const sx = it.x-camX+player.x;
        if (sx<-80||sx>880) return;
        if (it.type==='spike'){
          ctx.fillStyle='#EA4335';
          ctx.beginPath(); ctx.moveTo(sx,GROUND_Y); ctx.lineTo(sx+SIZE/2,GROUND_Y-SIZE); ctx.lineTo(sx+SIZE,GROUND_Y); ctx.closePath(); ctx.fill();
          if (state==='playing' && !collided && overlap(player.x,player.y,SIZE,SIZE, sx+SIZE*0.2, GROUND_Y-SIZE*0.85, SIZE*0.6, SIZE*0.85)) collided=true;
        } else if (it.type==='block'){
          const h=it.h||1;
          for(let i=0;i<h;i++){
            const yy=GROUND_Y-SIZE*(i+1);
            ctx.fillStyle='#2d3f5f'; ctx.fillRect(sx,yy,SIZE,SIZE);
            ctx.strokeStyle='#4285F4'; ctx.lineWidth=2; ctx.strokeRect(sx,yy,SIZE,SIZE);
          }
          if (state==='playing' && !collided && overlap(player.x,player.y,SIZE,SIZE, sx,GROUND_Y-SIZE*h,SIZE,SIZE*h)) collided=true;
        } else if (it.type==='flag'){
          ctx.fillStyle='#FBBC05'; ctx.fillRect(sx,GROUND_Y-SIZE*2.4,5,SIZE*2.4);
          ctx.beginPath(); ctx.moveTo(sx+5,GROUND_Y-SIZE*2.4); ctx.lineTo(sx+5+SIZE,GROUND_Y-SIZE*2.1); ctx.lineTo(sx+5,GROUND_Y-SIZE*1.8); ctx.closePath(); ctx.fill();
        }
      });

      if (collided && state==='playing'){ state='dead'; attempts++; setTimeout(reset, 500); }

      ctx.save();
      ctx.translate(player.x+SIZE/2, player.y+SIZE/2);
      ctx.rotate(player.rot*Math.PI/180);
      const grad2=ctx.createLinearGradient(-SIZE/2,-SIZE/2,SIZE/2,SIZE/2);
      grad2.addColorStop(0,'#4285F4'); grad2.addColorStop(1,'#EA4335');
      ctx.fillStyle=grad2; ctx.fillRect(-SIZE/2,-SIZE/2,SIZE,SIZE);
      ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.lineWidth=2; ctx.strokeRect(-SIZE/2,-SIZE/2,SIZE,SIZE);
      ctx.restore();

      ctx.fillStyle='#fff'; ctx.font='bold 16px sans-serif';
      ctx.fillText('Attempt '+attempts, 14, 26);
      ctx.fillText(Math.min(100,Math.floor(camX/LEVEL_LEN*100))+'%', 730, 26);
      if (state==='win'){ ctx.font='bold 34px sans-serif'; ctx.fillStyle='#FBBC05'; ctx.fillText('LEVEL COMPLETE!', 230, 250); }
    }
    function onKey(e){ if(e.code==='Space'||e.code==='ArrowUp'){ e.preventDefault(); jump(); } }
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('pointerdown', jump);
    addControlBtn(controls, '↻ Restart', reset);
    raf = requestAnimationFrame(draw);

    return { stop(){ cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); } };
  }

  /* ================= GAME: SNAKE ================= */
  function initSnake(stage, controls){
    const cols=20, rows=20, cell=25;
    const canvas = makeCanvas(stage, cols*cell, rows*cell);
    const ctx = canvas.getContext('2d');
    let snake, dir, nextDir, food, score, alive, tickTimer;

    function reset(){
      snake=[{x:10,y:10},{x:9,y:10},{x:8,y:10}];
      dir={x:1,y:0}; nextDir=dir; score=0; alive=true;
      placeFood();
    }
    function placeFood(){
      let ok=false;
      while(!ok){
        food={x:Math.floor(Math.random()*cols), y:Math.floor(Math.random()*rows)};
        ok = !snake.some(s=>s.x===food.x && s.y===food.y);
      }
    }
    function tick(){
      if (!alive) return;
      dir=nextDir;
      const head={x:snake[0].x+dir.x, y:snake[0].y+dir.y};
      if (head.x<0||head.x>=cols||head.y<0||head.y>=rows||snake.some(s=>s.x===head.x&&s.y===head.y)){
        alive=false; return;
      }
      snake.unshift(head);
      if (head.x===food.x && head.y===food.y){ score++; placeFood(); }
      else snake.pop();
    }
    function draw(){
      ctx.fillStyle='#0f0f0f'; ctx.fillRect(0,0,cols*cell,rows*cell);
      ctx.fillStyle='#EA4335'; ctx.beginPath(); ctx.arc(food.x*cell+cell/2, food.y*cell+cell/2, cell*0.35,0,7); ctx.fill();
      snake.forEach((s,i)=>{
        ctx.fillStyle = i===0 ? '#34A853' : '#8bd6a4';
        ctx.beginPath(); ctx.roundRect(s.x*cell+2, s.y*cell+2, cell-4, cell-4, 6); ctx.fill();
      });
      ctx.fillStyle='#fff'; ctx.font='bold 16px sans-serif'; ctx.fillText('Score: '+score, 10, 22);
      if (!alive){
        ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,cols*cell,rows*cell);
        ctx.fillStyle='#fff'; ctx.font='bold 24px sans-serif'; ctx.textAlign='center';
        ctx.fillText('Game Over — Score '+score, cols*cell/2, rows*cell/2);
        ctx.textAlign='left';
      }
    }
    function loop(){ tick(); draw(); }
    reset();
    const interval = setInterval(loop, 110);

    function onKey(e){
      const k=e.key;
      if (k==='ArrowUp'&&dir.y===0) nextDir={x:0,y:-1};
      else if (k==='ArrowDown'&&dir.y===0) nextDir={x:0,y:1};
      else if (k==='ArrowLeft'&&dir.x===0) nextDir={x:-1,y:0};
      else if (k==='ArrowRight'&&dir.x===0) nextDir={x:1,y:0};
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);

    let touchStart=null;
    canvas.addEventListener('pointerdown', e=> touchStart={x:e.clientX,y:e.clientY});
    canvas.addEventListener('pointerup', e=>{
      if(!touchStart) return;
      const dx=e.clientX-touchStart.x, dy=e.clientY-touchStart.y;
      if (Math.abs(dx)>Math.abs(dy)){
        if (dx>20 && dir.x===0) nextDir={x:1,y:0};
        else if (dx<-20 && dir.x===0) nextDir={x:-1,y:0};
      } else {
        if (dy>20 && dir.y===0) nextDir={x:0,y:1};
        else if (dy<-20 && dir.y===0) nextDir={x:0,y:-1};
      }
      touchStart=null;
    });

    addControlBtn(controls,'↻ Restart', reset);
    addControlBtn(controls,'↑', ()=>{ if(dir.y===0) nextDir={x:0,y:-1}; });
    addControlBtn(controls,'↓', ()=>{ if(dir.y===0) nextDir={x:0,y:1}; });
    addControlBtn(controls,'←', ()=>{ if(dir.x===0) nextDir={x:-1,y:0}; });
    addControlBtn(controls,'→', ()=>{ if(dir.x===0) nextDir={x:1,y:0}; });

    return { stop(){ clearInterval(interval); window.removeEventListener('keydown', onKey); } };
  }

  /* ================= GAME: 2048 ================= */
  function init2048(stage, controls){
    const size=4, cell=100, gap=10;
    const boardPx = size*cell + (size+1)*gap;
    const canvas = makeCanvas(stage, boardPx, boardPx);
    const ctx = canvas.getContext('2d');
    let grid, score, over;

    function reset(){
      grid = Array.from({length:size},()=>Array(size).fill(0));
      score=0; over=false;
      addTile(); addTile();
    }
    function addTile(){
      const empty=[];
      for(let r=0;r<size;r++) for(let c=0;c<size;c++) if(grid[r][c]===0) empty.push([r,c]);
      if (!empty.length) return;
      const [r,c] = empty[Math.floor(Math.random()*empty.length)];
      grid[r][c] = Math.random()<0.9 ? 2 : 4;
    }
    function slideRow(row){
      const vals = row.filter(v=>v!==0);
      for (let i=0;i<vals.length-1;i++){
        if (vals[i]===vals[i+1]){ vals[i]*=2; score+=vals[i]; vals.splice(i+1,1); }
      }
      while (vals.length<size) vals.push(0);
      return vals;
    }
    function move(dir){
      let moved=false;
      const before = JSON.stringify(grid);
      if (dir==='left'){ for(let r=0;r<size;r++) grid[r]=slideRow(grid[r]); }
      else if (dir==='right'){ for(let r=0;r<size;r++) grid[r]=slideRow(grid[r].slice().reverse()).reverse(); }
      else if (dir==='up'){
        for(let c=0;c<size;c++){
          let col=grid.map(r=>r[c]);
          col=slideRow(col);
          for(let r=0;r<size;r++) grid[r][c]=col[r];
        }
      } else if (dir==='down'){
        for(let c=0;c<size;c++){
          let col=grid.map(r=>r[c]).reverse();
          col=slideRow(col).reverse();
          for(let r=0;r<size;r++) grid[r][c]=col[r];
        }
      }
      moved = JSON.stringify(grid)!==before;
      if (moved) addTile();
      if (!canMove()) over=true;
      draw();
    }
    function canMove(){
      for(let r=0;r<size;r++) for(let c=0;c<size;c++){
        if (grid[r][c]===0) return true;
        if (c<size-1 && grid[r][c]===grid[r][c+1]) return true;
        if (r<size-1 && grid[r][c]===grid[r+1][c]) return true;
      }
      return false;
    }
    const colors = {0:'#182634',2:'#4285F4',4:'#5c9bf5',8:'#34A853',16:'#7fce97',32:'#FBBC05',64:'#fcd679',128:'#EA4335',256:'#f28b82',512:'#7C4DFF',1024:'#b39ddb',2048:'#00ACC1'};
    function draw(){
      ctx.fillStyle='#0f1626'; ctx.fillRect(0,0,boardPx,boardPx);
      for(let r=0;r<size;r++) for(let c=0;c<size;c++){
        const v=grid[r][c];
        const x=gap+c*(cell+gap), y=gap+r*(cell+gap);
        ctx.fillStyle = colors[v] || '#f76707';
        ctx.beginPath(); ctx.roundRect(x,y,cell,cell,10); ctx.fill();
        if (v){
          ctx.fillStyle = v<=4 ? '#0f1626' : '#fff';
          ctx.font='bold ' + (v<100?32:v<1000?26:20) + 'px sans-serif';
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText(v, x+cell/2, y+cell/2+2);
        }
      }
      ctx.textAlign='left'; ctx.textBaseline='alphabetic';
      ctx.fillStyle='#fff'; ctx.font='bold 16px sans-serif';
      ctx.fillText('Score: '+score, 12, 22);
      if (over){
        ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,boardPx,boardPx);
        ctx.fillStyle='#fff'; ctx.font='bold 24px sans-serif'; ctx.textAlign='center';
        ctx.fillText('No more moves', boardPx/2, boardPx/2);
        ctx.textAlign='left';
      }
    }
    reset(); draw();

    function onKey(e){
      const map={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
      if (map[e.key]){ e.preventDefault(); move(map[e.key]); }
    }
    window.addEventListener('keydown', onKey);
    let touchStart=null;
    canvas.addEventListener('pointerdown', e=> touchStart={x:e.clientX,y:e.clientY});
    canvas.addEventListener('pointerup', e=>{
      if(!touchStart) return;
      const dx=e.clientX-touchStart.x, dy=e.clientY-touchStart.y;
      if (Math.max(Math.abs(dx),Math.abs(dy))<20){ touchStart=null; return; }
      if (Math.abs(dx)>Math.abs(dy)) move(dx>0?'right':'left');
      else move(dy>0?'down':'up');
      touchStart=null;
    });
    addControlBtn(controls,'↻ New game', reset);
    addControlBtn(controls,'↑', ()=>move('up'));
    addControlBtn(controls,'↓', ()=>move('down'));
    addControlBtn(controls,'←', ()=>move('left'));
    addControlBtn(controls,'→', ()=>move('right'));

    return { stop(){ window.removeEventListener('keydown', onKey); } };
  }

  /* ================= GAME: FLAPPY BLOCK ================= */
  function initFlappy(stage, controls){
    const canvas = makeCanvas(stage, 480, 640);
    const ctx = canvas.getContext('2d');
    let raf, bird, pipes, score, alive, frame;
    const GRAV=0.5, FLAP=-8.5, GAP=170, PIPE_W=64, SPEED=2.6;

    function reset(){
      bird={x:120,y:300,vy:0,size:26};
      pipes=[]; score=0; alive=true; frame=0;
      for(let i=0;i<3;i++) addPipe(480+i*220);
    }
    function addPipe(x){
      const top = 60+Math.random()*300;
      pipes.push({x, top});
    }
    function flap(){ if(alive){ bird.vy=FLAP; } }
    function update(){
      if (!alive) return;
      frame++;
      bird.vy+=GRAV; bird.y+=bird.vy;
      pipes.forEach(p=>p.x-=SPEED);
      if (pipes.length && pipes[0].x < -PIPE_W){ pipes.shift(); addPipe(pipes[pipes.length-1].x+220); score++; }
      if (bird.y+bird.size>=640 || bird.y<=0) alive=false;
      pipes.forEach(p=>{
        if (bird.x+bird.size>p.x && bird.x<p.x+PIPE_W){
          if (bird.y<p.top || bird.y+bird.size>p.top+GAP) alive=false;
        }
      });
    }
    function draw(){
      raf=requestAnimationFrame(loop);
      ctx.fillStyle='#0f1626'; ctx.fillRect(0,0,480,640);
      ctx.fillStyle='#34A853';
      pipes.forEach(p=>{
        ctx.fillRect(p.x,0,PIPE_W,p.top);
        ctx.fillRect(p.x,p.top+GAP,PIPE_W,640-(p.top+GAP));
      });
      ctx.fillStyle='#4285F4';
      ctx.save(); ctx.translate(bird.x+bird.size/2,bird.y+bird.size/2);
      ctx.rotate(Math.max(-0.5,Math.min(0.9,bird.vy*0.05)));
      ctx.fillRect(-bird.size/2,-bird.size/2,bird.size,bird.size);
      ctx.restore();
      ctx.fillStyle='#fff'; ctx.font='bold 24px sans-serif'; ctx.textAlign='center';
      ctx.fillText(score, 240, 50);
      ctx.textAlign='left';
      if (!alive){
        ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,480,640);
        ctx.fillStyle='#fff'; ctx.font='bold 26px sans-serif'; ctx.textAlign='center';
        ctx.fillText('Game Over', 240, 300);
        ctx.font='16px sans-serif';
        ctx.fillText('Score '+score+' — tap to retry', 240, 335);
        ctx.textAlign='left';
      }
    }
    function loop(){ update(); draw(); }
    reset();
    raf=requestAnimationFrame(loop);

    function onPress(){ if(alive) flap(); else reset(); }
    canvas.addEventListener('pointerdown', onPress);
    function onKey(e){ if(e.code==='Space'){ e.preventDefault(); onPress(); } }
    window.addEventListener('keydown', onKey);
    addControlBtn(controls,'↻ Restart', reset);

    return { stop(){ cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); } };
  }

  /* ================= GAME: BREAKOUT ================= */
  function initBreakout(stage, controls){
    const W=480,H=560;
    const canvas = makeCanvas(stage, W, H);
    const ctx = canvas.getContext('2d');
    let raf, paddle, ball, bricks, score, alive, win;
    const rows=5, cols=8, brickW=52, brickH=20, brickGap=6, brickTop=50;

    function reset(){
      paddle={x:W/2-45,y:H-30,w:90,h:12};
      ball={x:W/2,y:H-50,vx:3.2,vy:-3.6,r:7};
      bricks=[];
      const colors=['#EA4335','#FBBC05','#34A853','#4285F4','#7C4DFF'];
      for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
        bricks.push({x:8+c*(brickW+brickGap), y:brickTop+r*(brickH+brickGap), w:brickW, h:brickH, alive:true, color:colors[r%colors.length]});
      }
      score=0; alive=true; win=false;
    }
    function update(){
      if (!alive) return;
      ball.x+=ball.vx; ball.y+=ball.vy;
      if (ball.x-ball.r<0 || ball.x+ball.r>W) ball.vx*=-1;
      if (ball.y-ball.r<0) ball.vy*=-1;
      if (ball.y+ball.r>=paddle.y && ball.y+ball.r<=paddle.y+paddle.h+8 && ball.x>paddle.x && ball.x<paddle.x+paddle.w && ball.vy>0){
        ball.vy*=-1;
        const hit=(ball.x-(paddle.x+paddle.w/2))/(paddle.w/2);
        ball.vx = hit*4.2;
      }
      if (ball.y-ball.r>H) alive=false;
      bricks.forEach(b=>{
        if (!b.alive) return;
        if (ball.x+ball.r>b.x && ball.x-ball.r<b.x+b.w && ball.y+ball.r>b.y && ball.y-ball.r<b.y+b.h){
          b.alive=false; ball.vy*=-1; score+=10;
        }
      });
      if (bricks.every(b=>!b.alive)){ alive=false; win=true; }
    }
    function draw(){
      raf=requestAnimationFrame(loop);
      ctx.fillStyle='#0f1626'; ctx.fillRect(0,0,W,H);
      bricks.forEach(b=>{
        if (!b.alive) return;
        ctx.fillStyle=b.color;
        ctx.beginPath(); ctx.roundRect(b.x,b.y,b.w,b.h,4); ctx.fill();
      });
      ctx.fillStyle='#4285F4';
      ctx.beginPath(); ctx.roundRect(paddle.x,paddle.y,paddle.w,paddle.h,6); ctx.fill();
      ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,7); ctx.fill();
      ctx.font='bold 16px sans-serif'; ctx.fillText('Score: '+score, 10, 22);
      if (!alive){
        ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,H);
        ctx.fillStyle='#fff'; ctx.font='bold 24px sans-serif'; ctx.textAlign='center';
        ctx.fillText(win ? 'You cleared it!' : 'Game Over', W/2, H/2);
        ctx.textAlign='left';
      }
    }
    function loop(){ update(); draw(); }
    reset(); raf=requestAnimationFrame(loop);

    function movePaddleTo(clientX){
      const rect=canvas.getBoundingClientRect();
      const x = (clientX-rect.left) * (W/rect.width);
      paddle.x = Math.max(0, Math.min(W-paddle.w, x-paddle.w/2));
    }
    canvas.addEventListener('pointermove', e=> movePaddleTo(e.clientX));
    canvas.addEventListener('pointerdown', ()=>{ if(!alive) reset(); });
    function onKey(e){
      if (e.key==='ArrowLeft') paddle.x=Math.max(0,paddle.x-28);
      else if (e.key==='ArrowRight') paddle.x=Math.min(W-paddle.w,paddle.x+28);
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    addControlBtn(controls,'↻ Restart', reset);

    return { stop(){ cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); } };
  }

  /* ================= GAME: TIC-TAC-TOE ================= */
  function initTicTacToe(stage, controls){
    const size=90;
    const canvas = makeCanvas(stage, size*3, size*3);
    const ctx = canvas.getContext('2d');
    let board, turn, over, message;

    function reset(){ board=Array(9).fill(''); turn='X'; over=false; message=''; draw(); }
    function winner(b){
      const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (const [a,c,d] of lines){ if (b[a] && b[a]===b[c] && b[a]===b[d]) return b[a]; }
      if (b.every(v=>v)) return 'draw';
      return null;
    }
    function computerMove(){
      const empty = board.map((v,i)=>v?null:i).filter(v=>v!==null);
      if (!empty.length) return;
      // simple heuristic: win, block, else center/corner/random
      for (const i of empty){ const t=board.slice(); t[i]='O'; if (winner(t)==='O'){ board[i]='O'; return; } }
      for (const i of empty){ const t=board.slice(); t[i]='X'; if (winner(t)==='X'){ board[i]='O'; return; } }
      if (!board[4]){ board[4]='O'; return; }
      const corners=[0,2,6,8].filter(i=>!board[i]);
      if (corners.length){ board[corners[Math.floor(Math.random()*corners.length)]]='O'; return; }
      board[empty[Math.floor(Math.random()*empty.length)]]='O';
    }
    function draw(){
      ctx.fillStyle='#0f1626'; ctx.fillRect(0,0,size*3,size*3);
      ctx.strokeStyle='#4285F4'; ctx.lineWidth=3;
      for(let i=1;i<3;i++){
        ctx.beginPath(); ctx.moveTo(i*size,10); ctx.lineTo(i*size,size*3-10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(10,i*size); ctx.lineTo(size*3-10,i*size); ctx.stroke();
      }
      board.forEach((v,i)=>{
        if (!v) return;
        const cx=(i%3)*size+size/2, cy=Math.floor(i/3)*size+size/2;
        ctx.strokeStyle = v==='X' ? '#EA4335' : '#34A853';
        ctx.lineWidth=6;
        if (v==='X'){
          ctx.beginPath(); ctx.moveTo(cx-25,cy-25); ctx.lineTo(cx+25,cy+25);
          ctx.moveTo(cx+25,cy-25); ctx.lineTo(cx-25,cy+25); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.arc(cx,cy,27,0,7); ctx.stroke();
        }
      });
      if (over){
        ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,size*3,size*3);
        ctx.fillStyle='#fff'; ctx.font='bold 22px sans-serif'; ctx.textAlign='center';
        ctx.fillText(message, size*1.5, size*1.5);
        ctx.textAlign='left';
      }
    }
    function onClick(e){
      if (over || turn!=='X') return;
      const rect=canvas.getBoundingClientRect();
      const x=(e.clientX-rect.left)*(size*3/rect.width);
      const y=(e.clientY-rect.top)*(size*3/rect.height);
      const col=Math.floor(x/size), row=Math.floor(y/size);
      const i=row*3+col;
      if (board[i]) return;
      board[i]='X'; turn='O';
      let w=winner(board);
      if (w){ over=true; message = w==='draw' ? "It's a draw!" : 'You win!'; draw(); return; }
      setTimeout(()=>{
        computerMove(); turn='X';
        w=winner(board);
        if (w){ over=true; message = w==='draw' ? "It's a draw!" : 'Computer wins!'; }
        draw();
      }, 300);
      draw();
    }
    canvas.addEventListener('click', onClick);
    addControlBtn(controls,'↻ New game', reset);
    reset();
    return { stop(){} };
  }

})();
