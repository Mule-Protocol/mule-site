"""Build the pinned Archivo instance used by MULE titles (fonttools 4.66.1, brotli 1.2.0).
Run after installing fonttools[woff]. The generated WOFF2 and unchanged OFL are committed.
Source: @fontsource-variable/archivo 5.3.0; no downloads at build or request time.
"""
from pathlib import Path
import hashlib
import json
import shutil
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools import subset

root = Path(__file__).resolve().parents[1]
source = root / 'node_modules/@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2'
output = root / 'public/brand/fonts/archivo-125-800-latin.woff2'
output.parent.mkdir(parents=True, exist_ok=True)
font = TTFont(source, recalcTimestamp=False)
axes = {axis.axisTag: axis.defaultValue for axis in font['fvar'].axes}
axes.update(wdth=125, wght=800)
font = instantiateVariableFont(font, axes, inplace=True, overlap=0)
# ASCII letters, figures and punctuation, plus the typography used in the site/dossier.
requested = set(range(0x20, 0x7F)) | {0xA0, 0xB7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x2713}
missing = requested - set(font.getBestCmap())
options = subset.Options()
options.layout_features = ['*']
options.name_IDs = ['*']
options.name_legacy = True
options.name_languages = ['*']
options.notdef_outline = True
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=requested - missing)
subsetter.subset(font)
font.flavor = 'woff2'
font.save(output)
shutil.copyfile(root / 'node_modules/@fontsource-variable/archivo/LICENSE', output.parent / 'OFL.txt')
assert 'fvar' not in font and 'gvar' not in font
assert output.stat().st_size < 25000
assert all(ord(char) in font.getBestCmap() for char in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$—’·')
metadata = {
    'source': str(source.relative_to(root)).replace('\\','/'),
    'output': str(output.relative_to(root)).replace('\\','/'),
    'axes': axes,
    'beforeBytes': source.stat().st_size,
    'afterBytes': output.stat().st_size,
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'outputSha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    'glyphs': len(font.getGlyphOrder()),
    'unicodeCount': len(font.getBestCmap()),
    'notInOriginalFont': [f'U+{code:04X}' for code in sorted(missing)],
    'static': True,
    'note': 'A character absent from the original Archivo retains the existing CSS fallback; no substitute glyph is invented.',
}
proof = root / 'artifacts/lcp/font.json'
proof.parent.mkdir(parents=True, exist_ok=True)
proof.write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf8')
print(json.dumps(metadata, indent=2))