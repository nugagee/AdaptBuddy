#!/usr/bin/env python3
"""Regenerate favicons from src/assets/Adaptbuddy_logo.png into public/."""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src/assets/Adaptbuddy_logo.png")
PUBLIC = os.path.join(ROOT, "public")


def fit_square(source: Image.Image, size: int, padding_ratio: float = 0.08) -> Image.Image:
    w, h = source.size
    scale = min((size * (1 - 2 * padding_ratio)) / w, (size * (1 - 2 * padding_ratio)) / h)
    nw, nh = int(w * scale), int(h * scale)
    resized = source.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


def main() -> None:
    img = Image.open(SRC).convert("RGBA")
    for name, size in {
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "apple-touch-icon.png": 180,
        "logo192.png": 192,
        "logo512.png": 512,
    }.items():
        fit_square(img, size).save(os.path.join(PUBLIC, name), "PNG", optimize=True)

    ico_images = [fit_square(img, s) for s in (16, 32, 48)]
    ico_images[0].save(
        os.path.join(PUBLIC, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=ico_images[1:],
    )
    print("Favicons written to public/")


if __name__ == "__main__":
    main()
