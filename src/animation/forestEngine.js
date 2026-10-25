export function mountAiForestStage(container) {
  if (!container || container.dataset.forestMounted === 'true') return;
  container.dataset.forestMounted = 'true';

  container.innerHTML = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;margin:12px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;background:linear-gradient(95deg,#04214b,#164863,#1b5e3c);color:#fff;padding:14px 22px;border-radius:20px;margin-bottom:16px;box-shadow:0 10px 26px rgba(4,33,75,0.16);">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <span id="forestDevBadge" style="display:inline-flex;align-items:center;gap:8px;background:rgba(241,90,36,0.25);border:1px solid #ff8a65;color:#ffccbc;padding:5px 14px;border-radius:999px;font-size:12.5px;font-weight:700;">
            <span style="width:8px;height:8px;border-radius:50%;background:#ff7043;display:inline-block;"></span>
            <span id="forestDevStatus">未连接硬件设备</span>
          </span>
          <span style="font-size:15.5px;font-weight:700;">
            你还没有连接设备，但可以试玩 <span style="color:#d9e021;text-decoration:underline;text-underline-offset:4px;">【地图1 - 森林·荧光秘境】</span>
          </span>
        </div>
        <div style="display:flex;gap:10px;">
          <button id="forestToggleDevBtn" style="border:none;border-radius:999px;padding:9px 18px;font-weight:700;font-size:13px;cursor:pointer;background:rgba(255,255,255,0.16);color:#fff;">模拟连接设备</button>
          <button id="forestSyncBtn" style="border:none;border-radius:999px;padding:9px 18px;font-weight:700;font-size:13px;cursor:pointer;background:linear-gradient(135deg,#f15a24,#fbb03b);color:#fff;">保存试玩成绩</button>
        </div>
      </div>

      <div style="position:relative;background:#04214b;border-radius:26px;overflow:hidden;box-shadow:0 18px 42px rgba(4,33,75,0.18);border:4px solid #ffffff;">
        <div style="position:absolute;top:16px;left:16px;right:16px;display:flex;justify-content:space-between;pointer-events:none;gap:12px;z-index:2;">
          <div style="pointer-events:auto;background:rgba(255,255,255,0.88);backdrop-filter:blur(10px);border-radius:18px;padding:10px 16px;color:#04214b;box-shadow:0 8px 20px rgba(4,33,75,0.12);">
            <div style="font-size:11.5px;color:#5c718a;font-weight:700;">当前试玩章节 (.ai 底图还原)</div>
            <div style="font-size:15px;font-weight:800;">地图1 - 森林·荧光秘境</div>
            <div id="forestBreathText" style="font-size:12px;color:#009245;font-weight:700;margin-top:2px;">节律：吸气 INHALE (4s)</div>
          </div>
          <div style="pointer-events:auto;background:rgba(255,255,255,0.88);backdrop-filter:blur(10px);border-radius:18px;padding:10px 16px;color:#04214b;text-align:right;box-shadow:0 8px 20px rgba(4,33,75,0.12);">
            <div style="font-size:11.5px;color:#5c718a;font-weight:700;">收集 '$' 金币得分</div>
            <div style="font-size:22px;font-weight:900;color:#f15a24;">$<span id="forestScore">12</span> <span style="font-size:12px;color:#04214b;">Combo x<span id="forestCombo">3</span></span></div>
          </div>
        </div>

        <canvas id="aiForestStageCanvas" style="width:100%;height:460px;display:block;cursor:pointer;"></canvas>

        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:14px 20px;background:#ffffff;color:#04214b;">
          <div style="display:flex;align-items:center;gap:10px;">
            <button id="forestJumpBtn" style="border:none;border-radius:999px;padding:10px 20px;font-weight:700;font-size:13.5px;cursor:pointer;background:linear-gradient(135deg,#f15a24,#fbb03b);color:#fff;">跳跃收集 '$' 金币 (Space / 点击画面)</button>
            <span id="forestSyncToast" style="font-size:13px;color:#5c718a;font-weight:600;">沿着 .ai 乳白山径奔跑，跟随金色箭头跳跃</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;">
            <span>动画速率</span>
            <input id="forestSpeed" type="range" min="0.5" max="2.0" step="0.1" value="1.0" />
          </div>
        </div>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#aiForestStageCanvas');
  const ctx = canvas.getContext('2d');
  let time = 0, speedMul = 1.0, score = 12, combo = 3, devConnected = false;
  const runner = { yOffset: 0, vy: 0, jumping: false };
  const coins = [
    { x: 280, yLift: -65, taken: false },
    { x: 580, yLift: -95, taken: false },
    { x: 880, yLift: -58, taken: false }
  ];
  const spores = Array.from({ length: 30 }, () => ({
    x: Math.random(), y: Math.random(), r: 2 + Math.random() * 3, s: 0.0005 + Math.random() * 0.0006, p: Math.random() * 6.28
  }));

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = (rect.width || 820) * dpr;
    canvas.height = (rect.height || 460) * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const getPathY = (x, w, h) => h * 0.79 - Math.sin((x / w) * Math.PI * 1.15 - 0.25) * (h * 0.14);

  function drawFrame() {
    if (!document.body.contains(canvas)) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 820, h = rect.height || 460;
    time += 0.045 * speedMul;

    if (runner.jumping || runner.yOffset < 0) {
      runner.yOffset += runner.vy * speedMul;
      runner.vy += 0.58 * speedMul;
      if (runner.yOffset >= 0) { runner.yOffset = 0; runner.vy = 0; runner.jumping = false; }
    }

    const sky = ctx.createLinearGradient(0, 0, w, h);
    sky.addColorStop(0, '#957eb8');
    sky.addColorStop(0.54, '#7accf3');
    sky.addColorStop(1, '#d9e021');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const mx = w * 0.81, my = h * 0.24, pulse = Math.sin(time * 0.6) * 7;
    [130, 96, 64, 36].forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(mx, my, r + pulse * (i * 0.25 + 0.4), 0, Math.PI * 2);
      ctx.fillStyle = i === 3 ? 'rgba(252,238,33,0.94)' : `rgba(251,176,59,${0.14 + i * 0.08})`;
      ctx.fill();
    });

    [[0.56, '#83bac8', 0.12, 40], [0.68, '#006837', 0.24, 32], [0.78, '#04214b', 0.38, 24]].forEach(([br, col, sp, amp]) => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      const shift = time * 16 * sp;
      for (let x = 0; x <= w; x += 16) {
        ctx.lineTo(x, h * br + Math.sin((x + shift) * 0.0042) * amp + Math.cos((x + shift * 0.65) * 0.0085) * (amp * 0.5));
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    });

    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, getPathY(x, w, h));
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = '#f6e9df';
    ctx.fill();

    [0.15, 0.46, 0.78].forEach((pos, idx) => {
      const span = w + 240;
      const tx = ((pos * w - time * 20 * (0.8 + idx * 0.15)) % span + span) % span - 120;
      const ty = getPathY(tx, w, h) + 8;
      const sway = Math.sin(time * 0.85 + idx * 1.7) * 5;
      ctx.save();
      ctx.translate(tx, ty);
      [[-36 + sway * 0.5, -120, 45, 'rgba(4,33,75,0.88)'], [34 + sway * 0.5, -114, 42, 'rgba(0,146,69,0.82)'], [sway * 0.8, -148, 52, 'rgba(140,198,63,0.85)']].forEach(([cx, cy, r, c]) => {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
      });
      ctx.strokeStyle = '#f6e9df'; ctx.lineCap = 'round'; ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(sway * 0.25, -54, sway * 0.5, -104); ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(sway * 0.35, -66); ctx.quadraticCurveTo(-22 + sway, -92, -32 + sway, -118);
      ctx.moveTo(sway * 0.42, -76); ctx.quadraticCurveTo(22 + sway, -96, 30 + sway, -114);
      ctx.stroke();
      ctx.restore();
    });

    const rx = w * 0.26, gy = getPathY(rx, w, h), ry = gy + runner.yOffset;

    coins.forEach(c => {
      c.x -= 3.2 * speedMul;
      if (c.x < -50) { c.x = w + 100 + Math.random() * 120; c.taken = false; }
      const cy = getPathY(c.x, w, h) + c.yLift + Math.sin(time * 2 + c.x * 0.01) * 6;
      if (!c.taken && Math.hypot(c.x - rx, cy - (ry - 48)) < 52) {
        c.taken = true; score++; combo++;
        container.querySelector('#forestScore').textContent = score;
        container.querySelector('#forestCombo').textContent = combo;
      }
      if (!c.taken) {
        ctx.save();
        ctx.translate(c.x, cy);
        ctx.scale(Math.max(0.25, Math.abs(Math.cos(time * 2.2 + c.x * 0.02))), 1);
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fillStyle = '#fcee21'; ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = '#d48b00'; ctx.stroke();
        ctx.fillStyle = '#8c5800'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);
        ctx.restore();
      }
    });

    const ax = rx + 108 + Math.sin(time * 1.4) * 10, ay = gy - 60 + Math.cos(time * 1.8) * 8;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(Math.sin(time * 1.4) * 0.08);
    ctx.beginPath(); ctx.moveTo(-22, -18); ctx.lineTo(24, 0); ctx.lineTo(-22, 18); ctx.lineTo(-8, 0); ctx.closePath();
    ctx.fillStyle = '#fff200'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#111'; ctx.stroke();
    ctx.restore();

    const stride = runner.jumping ? 0.85 : Math.sin(time * 2.5);
    const bounce = runner.jumping ? 0 : Math.abs(Math.cos(time * 2.5)) * 5.5;
    ctx.save();
    ctx.translate(rx, ry - 54 - bounce);
    ctx.strokeStyle = '#eae59b'; ctx.lineWidth = 17; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(-4 - stride * 18, 36); ctx.stroke();
    ctx.strokeStyle = '#f5f2be';
    ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(4 + stride * 18, 38); ctx.stroke();
    ctx.fillStyle = '#f15a24'; ctx.beginPath(); ctx.roundRect(-15, -26, 30, 24, 9); ctx.fill();
    ctx.fillStyle = '#0a2547'; ctx.beginPath(); ctx.arc(0, -40, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffbfb0'; ctx.beginPath(); ctx.arc(4, -39, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(-4, -36, 3.4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    spores.forEach(s => {
      s.x = (s.x - s.s * speedMul + 1) % 1;
      ctx.beginPath(); ctx.arc(s.x * w, s.y * h + Math.sin(time + s.p) * 8, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(252,238,33,0.7)'; ctx.fill();
    });

    requestAnimationFrame(drawFrame);
  }
  requestAnimationFrame(drawFrame);

  const jump = () => { if (!runner.jumping) { runner.vy = -12.2; runner.jumping = true; } };
  canvas.addEventListener('pointerdown', jump);
  container.querySelector('#forestJumpBtn').addEventListener('click', jump);
  window.addEventListener('keydown', e => { if (e.code === 'Space') jump(); });
  container.querySelector('#forestSpeed').addEventListener('input', e => { speedMul = parseFloat(e.target.value); });

  container.querySelector('#forestToggleDevBtn').addEventListener('click', () => {
    devConnected = !devConnected;
    container.querySelector('#forestDevStatus').textContent = devConnected ? '蓝牙呼吸设备已连接' : '未连接硬件设备';
  });

  container.querySelector('#forestSyncBtn').addEventListener('click', async () => {
    container.querySelector('#forestSyncToast').textContent = '已同步成绩 $' + score + ' 至后端 /api/sessions！';
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapName: '地图1 - 森林·荧光秘境', score, combo })
      });
    } catch (e) {}
  });
}

const observer = new MutationObserver(() => {
  const candidates = document.querySelectorAll('[data-forest-game-page], .game-page, #game-page, #gameView, [data-page="game"]');
  candidates.forEach(el => mountAiForestStage(el));
});
if (typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
