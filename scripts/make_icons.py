#!/usr/bin/env python3
"""Build the KidsTube launcher icons from one source image.

    python3 scripts/make_icons.py path/to/logo.png

The source is expected to be a square PNG of at least 1024x1024 with a
transparent background -- the mark on its own, not a finished app icon. The
script draws the background, centres the mark and writes every variant the
app needs:

    assets/images/icon.png              the launcher icon
    assets/images/adaptive-icon.png     the launcher icon's foreground
    assets/images/monochrome-icon.png   the themed icon
    assets/images/splash-icon.png       the splash mark
    assets/images/favicon.png           the web icon
    desktop/icon.png                    the desktop icon

A finished icon -- background included -- can be passed with --plain, in which
case the source is used as it is.
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZE = 1024

# The KidsTube purple, and the deeper one it fades into.
START = (99, 102, 241)
END = (139, 92, 246)


def gradient(size=SIZE):
    """A vertical gradient, drawn one row at a time."""
    image = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(image)
    for y in range(size):
        t = y / (size - 1)
        colour = tuple(round(START[i] + (END[i] - START[i]) * t) for i in range(3))
        draw.line([(0, y), (size, y)], fill=colour + (255,))
    return image


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def fit_mark(mark, box):
    """Scales the mark to fit the box and centres it."""
    mark = mark.convert("RGBA")
    scale = min(box[0] / mark.width, box[1] / mark.height)
    resized = mark.resize((max(1, round(mark.width * scale)), max(1, round(mark.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", box, (0, 0, 0, 0))
    canvas.paste(resized, ((box[0] - resized.width) // 2, (box[1] - resized.height) // 2), resized)
    return canvas


def build(mark, plain=False):
    if plain:
        icon = mark.convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS)
        adaptive = icon
        monochrome = icon.convert("L").convert("RGBA")
        splash = icon
    else:
        background = gradient()
        icon = background.copy()
        icon.alpha_composite(fit_mark(mark, (560, 560)), (232, 232))

        # The adaptive icon's foreground is the mark alone: the system crops
        # and masks it, so the safe zone is the middle 66%.
        adaptive = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        adaptive.alpha_composite(fit_mark(mark, (430, 430)), (297, 297))

        # The themed icon is a flat silhouette of the mark.
        monochrome = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        silhouette = fit_mark(mark, (560, 560))
        alpha = silhouette.getchannel("A")
        monochrome.paste((0, 0, 0, 255), (0, 0), alpha)

        # The splash mark sits on the splash screen's own background, so it is
        # the mark with no coloured plate behind it.
        splash = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        splash.alpha_composite(fit_mark(mark, (520, 520)), (252, 252))

    outputs = {
        "assets/images/icon.png": icon,
        "assets/images/adaptive-icon.png": adaptive,
        "assets/images/monochrome-icon.png": monochrome,
        "assets/images/splash-icon.png": splash,
        "assets/images/favicon.png": icon.resize((512, 512), Image.LANCZOS),
        "desktop/icon.png": icon.resize((512, 512), Image.LANCZOS),
    }
    for path, image in outputs.items():
        full = os.path.join(ROOT, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        image.save(full)
        print(f"wrote {path} ({image.width}x{image.height})")


def build_logo(logo):
    """Build the icons from a finished piece of artwork.

    The artwork is already a complete picture with its own background, so it
    is not put on a plate. Each variant is scaled for the shape it is drawn
    into: the launcher icon fills its square, the adaptive icon's foreground
    keeps clear of the system's mask, and the splash mark is smaller because
    it is drawn over the splash screen's own colour.
    """
    logo = logo.convert("RGBA")

    # The source is trimmed to the artwork itself first, so the transparent
    # margin around it does not push the picture off centre. Only the pixels
    # that are actually drawn count: a faint remnant at the edge of the
    # source would otherwise stretch the bounds and shrink the picture.
    alpha = logo.getchannel("A").point(lambda value: 255 if value > 128 else 0)
    bbox = alpha.getbbox()
    if bbox:
        logo = logo.crop(bbox)

    def centred(scale):
        box = round(SIZE * scale)
        canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        # The mark is fitted into a box of its own and that box is then put in
        # the middle of the square, so the picture is centred rather than
        # sitting in the corner.
        canvas.alpha_composite(fit_mark(logo, (box, box)), ((SIZE - box) // 2, (SIZE - box) // 2))
        return canvas

    icon = centred(1.0)
    adaptive = centred(0.74)
    splash = centred(0.58)

    # The themed icon is the artwork's own silhouette, which the system tints.
    monochrome = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 255))
    monochrome.putalpha(icon.getchannel("A"))

    outputs = {
        "assets/images/icon.png": icon,
        "assets/images/adaptive-icon.png": adaptive,
        "assets/images/monochrome-icon.png": monochrome,
        "assets/images/splash-icon.png": splash,
        "assets/images/favicon.png": icon.resize((512, 512), Image.LANCZOS),
        "desktop/icon.png": icon.resize((512, 512), Image.LANCZOS),
    }
    for path, image in outputs.items():
        full = os.path.join(ROOT, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        image.save(full)
        print(f"wrote {path} ({image.width}x{image.height})")


def placeholder():
    """A stand-in mark, used until a real logo is dropped in."""
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # A rounded screen, with a play triangle inside it.
    draw.rounded_rectangle([80, 150, 944, 780], radius=110, fill=(255, 255, 255, 255))
    draw.rounded_rectangle([150, 220, 874, 710], radius=70, fill=(99, 102, 241, 255))
    draw.polygon([(430, 340), (430, 590), (640, 465)], fill=(255, 255, 255, 255))

    # A little book under it, for the learning side of the app.
    draw.rounded_rectangle([250, 830, 774, 900], radius=30, fill=(255, 255, 255, 235))
    return image


def main():
    args = [arg for arg in sys.argv[1:] if not arg.startswith("--")]
    if "--logo" in sys.argv:
        # A finished piece of artwork: it is used as it is, only scaled.
        if not args:
            print("--logo needs the source image", file=sys.stderr)
            sys.exit(1)
        build_logo(Image.open(args[0]))
        return
    plain = "--plain" in sys.argv
    if not args:
        mark = placeholder()
        print("no source given, using the placeholder mark")
    else:
        mark = Image.open(args[0])
    build(mark, plain=plain)


if __name__ == "__main__":
    main()
