import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { INITIAL_SIM_STATE } from '../data/simStore.js';
import { bluetoothSupport, SUPPORT_MESSAGES, pairTrainer, describePairError } from '../services/trainerBluetooth.js';

const AppContext = createContext(null);
const TOAST_MS = 3200;

/**
 * App-wide state shared by every page: the demo profile/sample data, toasts,
 * the selected map, the paired trainer, and navigation.
 */
export function AppProvider({ navigate, children }) {
  const [state, setState] = useState(INITIAL_SIM_STATE);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const trainerRef = useRef(null);
  const pairingRef = useRef(false);

  const notify = useCallback(message => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const handleDisconnect = useCallback(() => {
    trainerRef.current = null;
    setState(p => ({ ...p, bleConnected: false, deviceName: null, batteryPct: null }));
  }, []);

  // Real Web Bluetooth pairing: the browser's chooser lists nearby AeroCare trainers.
  const pairTrainerDevice = useCallback(async () => {
    if (pairingRef.current) return; // one browser chooser at a time
    const support = bluetoothSupport();
    if (support !== 'ok') {
      setState(p => ({ ...p, bleError: SUPPORT_MESSAGES[support] }));
      notify(SUPPORT_MESSAGES[support]);
      return;
    }
    pairingRef.current = true;
    setState(p => ({ ...p, bleScanning: true, bleError: null }));
    try {
      const trainer = await pairTrainer({
        onDisconnect: () => {
          handleDisconnect();
          notify('Trainer disconnected.');
        }
      });
      trainerRef.current = trainer;
      setState(p => ({
        ...p,
        bleScanning: false,
        bleConnected: true,
        deviceName: trainer.name,
        batteryPct: trainer.battery
      }));
      notify(`Connected to ${trainer.name}${trainer.battery !== null ? ` (battery ${trainer.battery}%)` : ''}`);
    } catch (err) {
      const message = describePairError(err);
      setState(p => ({ ...p, bleScanning: false, bleConnected: false, bleError: message }));
      notify(message);
    } finally {
      pairingRef.current = false;
    }
  }, [handleDisconnect, notify]);

  const disconnectTrainer = useCallback(() => {
    trainerRef.current?.disconnect();
    handleDisconnect();
  }, [handleDisconnect]);

  /** Make `map` the active level; with `play`, jump straight into the game. */
  const selectMap = useCallback(
    (map, play = false) => {
      setState(p => ({
        ...p,
        lastMap: {
          ...p.lastMap,
          id: map.id,
          name: map.name,
          valveKpa: map.kpa,
          targetL: map.targetL,
          lastPlayed: 'Selected Just Now'
        }
      }));
      if (play) {
        navigate('play');
        notify(`Launching ${map.name} (${map.kpa} kPa resistance)...`);
      } else {
        notify(`Switched active training map to ${map.name}`);
      }
    },
    [navigate, notify]
  );

  const value = useMemo(
    () => ({
      state,
      setState,
      toast,
      notify,
      navigate,
      selectMap,
      trainer: { pair: pairTrainerDevice, disconnect: disconnectTrainer }
    }),
    [state, toast, notify, navigate, selectMap, pairTrainerDevice, disconnectTrainer]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Access app state from any page or component inside <AppProvider>. */
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp() must be used inside <AppProvider>');
  return ctx;
}
