"""Cut the README GIFs out of the frames recorded by record-gameplay.mjs.

    python3 scripts/media/make-gifs.py <frames-dir> docs/media

Frames are 30 fps. Each clip gets one palette built from its own frames, so colours stay steady
while the camera pans.
"""

import sys
from pathlib import Path

from PIL import Image

FPS = 30
WIDTH = 720

# (output name, level, first frame, last frame): three moments per level.
CLIPS = [
    ("level1-first-jump", "MAP-FOREST-01", 0, 95),
    ("level1-glide", "MAP-FOREST-01", 100, 195),
    ("level1-finish", "MAP-FOREST-01", 300, 425),
    ("level2-rhythm", "MAP-CANYON-02", 0, 105),
    ("level2-glide", "MAP-CANYON-02", 110, 205),
    ("level2-finish", "MAP-CANYON-02", 270, 395),
    ("level3-long-breath", "MAP-GLACIER-03", 0, 100),
    ("level3-glide", "MAP-GLACIER-03", 100, 200),
    ("level3-finish", "MAP-GLACIER-03", 250, 375),
]


def load(frames_dir: Path, level: str, first: int, last: int) -> list[Image.Image]:
    frames = []
    for i in range(first, last + 1):
        im = Image.open(frames_dir / level / f"{i:04d}.png").convert("RGB")
        frames.append(im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS))
    return frames


def palette_for(frames: list[Image.Image]) -> Image.Image:
    """A 256-colour palette from a strip of evenly spaced frames."""
    sample = frames[:: max(1, len(frames) // 12)]
    w, h = sample[0].size
    strip = Image.new("RGB", (w, h * len(sample)))
    for k, im in enumerate(sample):
        strip.paste(im, (0, k * h))
    return strip.quantize(256, method=Image.Quantize.MEDIANCUT)


def save_gif(frames: list[Image.Image], out: Path) -> None:
    pal = palette_for(frames)
    quantized = [im.quantize(palette=pal, dither=Image.Dither.NONE) for im in frames]
    quantized[0].save(
        out,
        save_all=True,
        append_images=quantized[1:],
        duration=round(1000 / FPS),
        loop=0,
        optimize=True,
        disposal=1,
    )


def main() -> None:
    frames_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, level, first, last in CLIPS:
        out = out_dir / f"{name}.gif"
        save_gif(load(frames_dir, level, first, last), out)
        print(f"{out}  {(last - first + 1) / FPS:.1f} s  {out.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
