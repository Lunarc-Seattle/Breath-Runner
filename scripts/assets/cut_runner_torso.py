"""
Cut the runner's legs off her sprite, so the engine can draw legs that bend (src/animation/forestEngine.js).

  public/assets/forest/runner.png        input, from export_forest_ai.py
  public/assets/forest/runner-torso.png  head, arms and hips; the code-drawn legs go under the hips

Run it again after re-exporting runner.png:
  python3 scripts/assets/cut_runner_torso.py
"""
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[2] / 'public' / 'assets' / 'forest'

# In runner.png's 512x512 frame. The engine's LEG_HIPS sit just above HIP_CUT_Y.
HIP_CUT_Y = 264


def is_torso(x, y):
    """Above the hip cut, minus the back leg and foot (kicked up behind her) and the front thigh's corner."""
    back_leg = (x < 200 and y > 222) or (x < 120 and y > 195)
    front_thigh = x > 330 and y > 238
    return y < HIP_CUT_Y and not back_leg and not front_thigh


def main():
    src = Image.open(OUT / 'runner.png').convert('RGBA')
    torso = Image.new('RGBA', src.size)
    s, t = src.load(), torso.load()
    for y in range(src.height):
        for x in range(src.width):
            if is_torso(x, y):
                t[x, y] = s[x, y]
    torso.save(OUT / 'runner-torso.png', optimize=True)


if __name__ == '__main__':
    main()
