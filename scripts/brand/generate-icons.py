"""Derive every icon-only asset from assets/brand/logo-icon.png.

No text is ever drawn into an image: the wordmark is live text from
brand.json. Re-run after replacing the logo:

    python3 scripts/brand/generate-icons.py && pnpm brand:sync
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets/brand/logo-icon.png"
OUT = ROOT / "assets/brand/generated"
PRIMARY = (45, 106, 67, 255)  # brand.json colors.primary
LIGHT_BG = (248, 250, 249, 255)  # page background #F8FAF9


def cropped() -> Image.Image:
    """The rounded square on a transparent square canvas, with a hair of clear space."""
    im = Image.open(SRC).convert("RGBA")
    # Ignore faint alpha noise when finding the edges.
    box = im.split()[3].point(lambda v: 255 if v > 32 else 0).getbbox()
    if box is None:
        raise SystemExit(f"{SRC} has no visible pixels")
    left, top, right, bottom = box
    side = int(max(right - left, bottom - top) * 1.04)
    cx, cy = (left + right) / 2, (top + bottom) / 2
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im.crop((int(cx - side / 2), int(cy - side / 2), int(cx + side / 2), int(cy + side / 2))), (0, 0))
    return canvas.resize((1024, 1024), Image.LANCZOS)


def on_background(icon: Image.Image, size: int, scale: float, bg: tuple) -> Image.Image:
    """The icon centred at `scale` of a solid square — never stretched, never recoloured."""
    canvas = Image.new("RGBA", (size, size), bg)
    inner = int(size * scale)
    small = icon.resize((inner, inner), Image.LANCZOS)
    canvas.alpha_composite(small, ((size - inner) // 2, (size - inner) // 2))
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    icon = cropped()
    icon.save(OUT / "logo-icon-transparent.png", optimize=True)
    # Light versions for on-page use (navbar, sidebar, loaders).
    for px in (128, 256, 512):
        icon.resize((px, px), Image.LANCZOS).save(OUT / f"logo-icon-{px}.webp", quality=88, method=6)
    icon.resize((192, 192), Image.LANCZOS).save(OUT / "icon-192.png", optimize=True)
    icon.resize((512, 512), Image.LANCZOS).save(OUT / "icon-512.png", optimize=True)
    # Maskable: launchers crop to a circle, so keep the art inside the 80% safe zone.
    on_background(icon, 512, 0.78, PRIMARY).save(OUT / "maskable-512.png", optimize=True)
    on_background(icon, 180, 0.88, LIGHT_BG).convert("RGB").save(OUT / "apple-touch-icon.png", optimize=True)
    icon.resize((256, 256), Image.LANCZOS).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    # Phone app: Android adaptive foreground (66% safe zone), iOS (no alpha), splash.
    on_background(icon, 1024, 0.62, (0, 0, 0, 0)).save(OUT / "android-foreground.png", optimize=True)
    on_background(icon, 1024, 0.84, LIGHT_BG).convert("RGB").save(OUT / "ios-icon.png", optimize=True)
    on_background(icon, 768, 0.62, (0, 0, 0, 0)).save(OUT / "splash-icon.png", optimize=True)
    print("generated:", ", ".join(sorted(p.name for p in OUT.iterdir())))


if __name__ == "__main__":
    main()
