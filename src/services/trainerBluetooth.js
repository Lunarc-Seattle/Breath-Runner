/**
 * Pairs the AeroCare trainer over Web Bluetooth (Chrome / Edge on desktop and Android).
 * The browser shows its own device chooser filtered to trainers; nothing is faked:
 * if no trainer is around, pairing fails with a message telling the user what to check.
 */

const NAME_PREFIX = 'AeroCare';

/** 'ok' | 'insecure' (needs https or localhost) | 'unsupported' (e.g. Safari, Firefox, iOS). */
export function bluetoothSupport() {
  if (typeof window === 'undefined' || !window.isSecureContext) return 'insecure';
  if (!navigator.bluetooth) return 'unsupported';
  return 'ok';
}

export const SUPPORT_MESSAGES = {
  insecure: 'Bluetooth needs a secure page. Open the app over https or on localhost.',
  unsupported: 'This browser can\'t use Bluetooth. Open the app in Chrome or Edge on a computer or Android phone. You can still play Forest · Level 1 in free-trial mode.'
};

/** Turn a Web Bluetooth error into something a patient can act on. */
export function describePairError(err) {
  switch (err && err.name) {
    case 'NotFoundError':
      return 'No AeroCare trainer found. Turn the trainer on, keep it within 1 m of this device, check that Bluetooth is on, then try again.';
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Bluetooth access is blocked. Allow Bluetooth for this site in your browser settings, then try again.';
    case 'NetworkError':
      return 'Found the trainer but couldn\'t connect. Restart the trainer and try again.';
    default:
      return `Couldn't connect to the trainer${err && err.message ? `: ${err.message}` : '.'}`;
  }
}

/**
 * Opens the browser's chooser, connects, and reads the standard battery level if the trainer has one.
 * Resolves to { name, battery (0-100 or null), disconnect() }; rejects with the Web Bluetooth error.
 */
export async function pairTrainer({ onDisconnect } = {}) {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: NAME_PREFIX }],
    optionalServices: ['battery_service']
  });
  if (onDisconnect) device.addEventListener('gattserverdisconnected', onDisconnect);
  const server = await device.gatt.connect();

  let battery = null;
  try {
    const service = await server.getPrimaryService('battery_service');
    const level = await service.getCharacteristic('battery_level');
    battery = (await level.readValue()).getUint8(0);
  } catch (_) {
    // Battery service is optional.
  }

  return {
    name: device.name || 'AeroCare Trainer',
    battery,
    disconnect: () => { if (device.gatt.connected) device.gatt.disconnect(); }
  };
}
