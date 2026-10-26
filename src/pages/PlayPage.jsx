import { useApp } from '../app/AppContext.jsx';
import { ForestRunnerStage } from '../components/ForestRunnerStage.jsx';

/** Page 04: the Breath Runner game on the selected map. */
export default function PlayPage() {
  const { state, notify, selectMap, trainer } = useApp();

  const onToggleDevice = () => {
    if (state.bleConnected) {
      trainer.disconnect();
      notify('Trainer disconnected. Free trial mode: hold the screen or Space to breathe.');
    } else {
      trainer.pair();
    }
  };

  return (
    <ForestRunnerStage
      map={state.lastMap}
      maps={state.maps}
      bleConnected={state.bleConnected}
      bleScanning={state.bleScanning}
      deviceName={state.deviceName}
      onToggleDevice={onToggleDevice}
      onSelectMap={m => selectMap(m)}
      notify={notify}
    />
  );
}
