export class ForestTelemetryClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.logs = [];
  }

  async syncSessionData(payload) {
    const timestamp = new Date().toLocaleTimeString();
    const record = {
      id: 'sess_' + Math.random().toString(36).slice(2, 8),
      mapId: payload.mapId || 'forest-01',
      mapName: '地图1 - 森林·荧光秘境',
      deviceMode: payload.deviceConnected ? 'BLE_HARDWARE_STREAM' : 'TRIAL_NO_DEVICE',
      coinsCollected: payload.score,
      comboMax: payload.combo,
      timestamp
    };

    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (response.ok) {
        const data = await response.json();
        this.logs.unshift({ status: 201, mode: 'LIVE_BACKEND', ...data });
        return data;
      }
    } catch (_) {}

    const saved = JSON.parse(localStorage.getItem('forest_sessions') || '[]');
    saved.unshift(record);
    localStorage.setItem('forest_sessions', JSON.stringify(saved.slice(0, 20)));
    this.logs.unshift({ status: 200, mode: 'SIMULATED_REST_OK', ...record });
    return record;
  }
}
