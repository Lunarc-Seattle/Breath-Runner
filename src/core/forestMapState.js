export class ForestMapState {
  constructor() {
    this.mapId = 'forest-01';
    this.mapName = '地图1 - 森林·荧光秘境';
    this.deviceConnected = false;
    this.score = 12;
    this.combo = 3;
    this.speedMultiplier = 1.0;
    this.breathPhase = '吸气 INHALE (4s)';
    this.breathTimer = 0;
    this.runner = {
      yOffset: 0,
      vy: 0,
      isJumping: false,
      gravity: 0.58,
      jumpStrength: -12.5
    };
  }

  triggerJump() {
    if (!this.runner.isJumping) {
      this.runner.vy = this.runner.jumpStrength;
      this.runner.isJumping = true;
      return true;
    }
    return false;
  }

  toggleDeviceConnection() {
    this.deviceConnected = !this.deviceConnected;
    return this.deviceConnected;
  }

  updatePhysics(dt = 1) {
    if (this.runner.isJumping || this.runner.yOffset < 0) {
      this.runner.yOffset += this.runner.vy * dt;
      this.runner.vy += this.runner.gravity * dt;
      if (this.runner.yOffset >= 0) {
        this.runner.yOffset = 0;
        this.runner.vy = 0;
        this.runner.isJumping = false;
      }
    }

    this.breathTimer = (this.breathTimer + 0.016 * this.speedMultiplier) % 10;
    if (this.breathTimer < 4) {
      this.breathPhase = '吸气 INHALE (4s)';
    } else if (this.breathTimer < 6) {
      this.breathPhase = '屏息 HOLD (2s)';
    } else {
      this.breathPhase = '呼气 EXHALE (4s)';
    }
  }

  collectCoin() {
    this.score += 1;
    this.combo += 1;
    return { score: this.score, combo: this.combo };
  }
}
