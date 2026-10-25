export class ForestAnimationEngine {
  constructor(canvas, gameState, onCoinCollected) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = gameState;
    this.onCoinCollected = onCoinCollected;
    this.time = 0;

    this.layers = {
      goldMoon: true,
      mountains: true,
      ancientTrees: true,
      runnerAndCoins: true,
      particles: true
    };

    this.coins = [
      { xOffset: 260, yAlt: -65, collected: false },
      { xOffset: 560, yAlt: -95, collected: false },
      { xOffset: 860, yAlt: -55, collected: false }
    ];

    this.floatingTexts = [];
    this.spores = Array.from({ length: 36 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1.5 + Math.random() * 3,
      speed: 0.0004 + Math.random() * 0.0008,
      phase: Math.random() * Math.PI * 2
    }));

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 1100;
    this.height = rect.height || 500;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  getTrailY(x) {
    const ratio = x / this.width;
    return this.height * 0.78 - Math.sin(ratio * Math.PI * 1.15 - 0.2) * (this.height * 0.16);
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const speed = this.game.speedMultiplier;
    this.time += 0.045 * speed;

    this.game.updatePhysics(speed);

    const skyGrad = ctx.createLinearGradient(0, 0, w, h);
    skyGrad.addColorStop(0, '#957eb8');
    skyGrad.addColorStop(0.55, '#7accf3');
    skyGrad.addColorStop(1, '#d9e021');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    if (this.layers.goldMoon) {
      const mx = w * 0.82;
      const my = h * 0.26;
      const pulse = Math.sin(this.time * 0.6) * 8;
      [140, 105, 72, 42].forEach((r, idx) => {
        ctx.beginPath();
        ctx.arc(mx, my, r + pulse * (idx * 0.3 + 0.4), 0, Math.PI * 2);
        ctx.fillStyle = idx === 3 ? 'rgba(252, 238, 33, 0.92)' : `rgba(251, 176, 59, ${0.14 + idx * 0.08})`;
        ctx.fill();
      });
    }

    if (this.layers.mountains) {
      this.drawMountainLayer(ctx, w, h, 0.56, '#83bac8', 0.12, 45);
      this.drawMountainLayer(ctx, w, h, 0.68, '#006837', 0.25, 38);
      this.drawMountainLayer(ctx, w, h, 0.79, '#04214b', 0.42, 28);
    }

    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 20) {
      ctx.lineTo(x, this.getTrailY(x));
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    const pathGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
    pathGrad.addColorStop(0, '#f6e9df');
    pathGrad.addColorStop(1, '#d7c4b8');
    ctx.fillStyle = pathGrad;
    ctx.fill();

    if (this.layers.ancientTrees) {
      [0.14, 0.44, 0.76].forEach((pos, idx) => {
        const span = w + 260;
        const tx = ((pos * w - this.time * 22 * (0.8 + idx * 0.15)) % span + span) % span - 130;
        const ty = this.getTrailY(tx) + 8;
        this.drawAncientTree(ctx, tx, ty, 0.85 + (idx % 2) * 0.2, idx);
      });
    }

    if (this.layers.runnerAndCoins) {
      const runnerX = w * 0.27;
      const groundY = this.getTrailY(runnerX);
      const runnerY = groundY + this.game.runner.yOffset;

      this.coins.forEach((coin) => {
        coin.xOffset -= 3.4 * speed;
        if (coin.xOffset < -80) {
          coin.xOffset = w + 120 + Math.random() * 140;
          coin.collected = false;
        }
        const cx = coin.xOffset;
        const cy = this.getTrailY(cx) + coin.yAlt + Math.sin(this.time * 2 + cx * 0.01) * 6;

        const dist = Math.hypot(cx - runnerX, cy - (runnerY - 48));
        if (!coin.collected && dist < 54) {
          coin.collected = true;
          const res = this.game.collectCoin();
          this.floatingTexts.push({ x: cx, y: cy, alpha: 1, text: '+$1 金币' });
          if (this.onCoinCollected) this.onCoinCollected(res);
        }

        if (!coin.collected) {
          this.drawSpinningDollarCoin(ctx, cx, cy, 20, this.time * 2.2 + cx * 0.02);
        }
      });

      const arrowX = runnerX + 115 + Math.sin(this.time * 1.5) * 12;
      const arrowY = groundY - 62 + Math.cos(this.time * 2.0) * 10;
      this.drawGoldArrow(ctx, arrowX, arrowY, Math.sin(this.time * 1.5) * 0.08);
      this.drawRunningGirl(ctx, runnerX, runnerY, this.time * 2.6, this.game.runner.isJumping);
    }

    this.floatingTexts.forEach((ft) => {
      ft.y -= 1.4;
      ft.alpha -= 0.022;
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillStyle = '#fcee21';
      ctx.fillText(ft.text, ft.x - 24, ft.y);
      ctx.restore();
    });
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.alpha > 0);

    if (this.layers.particles) {
      this.spores.forEach((s) => {
        s.x = (s.x - s.speed * speed + 1) % 1;
        const sx = s.x * w;
        const sy = s.y * h + Math.sin(this.time + s.phase) * 10;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(224, 227, 45, 0.65)';
        ctx.fill();
      });
    }
  }

  drawMountainLayer(ctx, w, h, baseRatio, color, speedFactor, amp) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    const offset = this.time * 18 * speedFactor;
    for (let x = 0; x <= w; x += 16) {
      const y = h * baseRatio + Math.sin((x + offset) * 0.0045) * amp + Math.cos((x + offset * 0.7) * 0.009) * (amp * 0.55);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  drawAncientTree(ctx, x, y, scale, seed) {
    const sway = Math.sin(this.time * 0.9 + seed) * 5;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const canopyColors = ['rgba(4, 33, 75, 0.85)', 'rgba(0, 104, 55, 0.78)', 'rgba(140, 198, 63, 0.72)'];
    [
      { cx: -36 + sway * 0.6, cy: -125, r: 46, c: canopyColors[0] },
      { cx: 34 + sway * 0.6, cy: -120, r: 42, c: canopyColors[1] },
      { cx: sway, cy: -152, r: 54, c: canopyColors[2] }
    ].forEach((b) => {
      ctx.beginPath();
      ctx.arc(b.cx, b.cy, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.c;
      ctx.fill();
    });

    ctx.strokeStyle = '#f6e9df';
    ctx.lineCap = 'round';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(sway * 0.3, -55, sway * 0.5, -105);
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(sway * 0.35, -70);
    ctx.quadraticCurveTo(-24 + sway, -95, -34 + sway, -122);
    ctx.moveTo(sway * 0.4, -80);
    ctx.quadraticCurveTo(24 + sway, -98, 32 + sway, -118);
    ctx.stroke();

    ctx.restore();
  }

  drawSpinningDollarCoin(ctx, x, y, radius, angle) {
    const scaleX = Math.max(0.22, Math.abs(Math.cos(angle)));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scaleX, 1);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#fcee21';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#d48b00';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
    ctx.fillStyle = '#e5b228';
    ctx.fill();

    ctx.fillStyle = '#9e6b05';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 1);
    ctx.restore();
  }

  drawGoldArrow(ctx, x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(0.9, 0.9);

    ctx.beginPath();
    ctx.moveTo(-26, -24);
    ctx.lineTo(30, 0);
    ctx.lineTo(-26, 24);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-20, -18);
    ctx.lineTo(24, 0);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fillStyle = '#fff200';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(24, 0);
    ctx.lineTo(-20, 18);
    ctx.closePath();
    ctx.fillStyle = '#e69112';
    ctx.fill();

    ctx.restore();
  }

  drawRunningGirl(ctx, x, y, phase, isJumping) {
    const stride = isJumping ? 0.85 : Math.sin(phase);
    const bounce = isJumping ? 0 : Math.abs(Math.cos(phase)) * 6;

    ctx.save();
    ctx.translate(x, y - 56 - bounce);

    ctx.save();
    ctx.translate(0, 56 + bounce);
    ctx.scale(1, 0.25);
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(4, 33, 75, 0.28)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(6, -18);
    ctx.rotate(-stride * 0.65);
    ctx.strokeStyle = '#ffafa0';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(14, 16);
    ctx.lineTo(26, 4);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(-4, 6);
    ctx.rotate(-stride * 0.7);
    ctx.strokeStyle = '#eae59b';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-16, 22);
    ctx.lineTo(-32, 12);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(4, 6);
    ctx.rotate(stride * 0.75);
    ctx.strokeStyle = '#f5f2be';
    ctx.lineWidth = 19;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(18, 18);
    ctx.lineTo(12, 42);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#0d2b5c';
    ctx.fillRect(-11, -2, 22, 6);

    ctx.fillStyle = '#f15a24';
    ctx.beginPath();
    ctx.roundRect(-16, -28, 32, 25, 9);
    ctx.fill();

    ctx.save();
    ctx.translate(2, -42);
    ctx.fillStyle = '#0a2547';
    ctx.beginPath();
    ctx.arc(-2, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffbfb0';
    ctx.beginPath();
    ctx.arc(2, 1, 10.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(-6, 4, 3.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(-8, -20);
    ctx.rotate(stride * 0.55);
    ctx.strokeStyle = '#ffbfb0';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-16, 12);
    ctx.lineTo(-4, 24);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }
}
