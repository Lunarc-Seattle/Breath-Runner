import * as OrigModule from './GamePage.orig.js';
import { mountAiForestStage } from '../animation/forestEngine.js';

function wrapGameComponent(fn) {
  return function(...args) {
    const res = fn ? fn.apply(this, args) : null;
    setTimeout(() => {
      const target = document.querySelector('.game-page, #game-page, main, #app, #root');
      if (target) {
        let slot = target.querySelector('#ai-forest-slot');
        if (!slot) {
          slot = document.createElement('div');
          slot.id = 'ai-forest-slot';
          target.prepend(slot);
        }
        mountAiForestStage(slot);
      }
    }, 30);
    return res;
  };
}

export const GamePage = typeof OrigModule.GamePage === 'function' ? wrapGameComponent(OrigModule.GamePage) : OrigModule.GamePage;
