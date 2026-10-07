"""Generate MULE's static Archivo 125/800 subset with fonttools 4.66.1 + brotli 1.2.0.
Source: pinned @fontsource-variable/archivo 5.3.0; generated assets are committed.
Run after installing fonttools[woff]. No font download occurs during site build.
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
output = root / 'src/assets/fonts/archivo-125-800-latin.woff2'
output.parent.mkdir(parents=True, exist_ok=True)
font = TTFont(source, recalcTimestamp=False)
original_cmap = set(font.getBestCmap())
original_copyright = [record.toUnicode() for record in font['name'].names if record.nameID == 0]
axes = {axis.axisTag: axis.defaultValue for axis in font['fvar'].axes}
axes.update(wdth=125, wght=800)
font = instantiateVariableFont(font, axes, inplace=True, overlap=0)
# Keep outlines/hinting; expand the existing subset to Latin-1 and French typography.
previous = set(range(0x20, 0x7F)) | {0xA0, 0xB7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x2713}
requested = previous | set(range(0xA0, 0x100)) | {0x0152, 0x0153, 0x0178, 0x20AC}
missing = requested - original_cmap
options = subset.Options()
options.layout_features = ['*']
options.name_IDs = ['*']
options.name_legacy = True
options.name_languages = ['*']
options.notdef_outline = True
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=requested - missing)
subsetter.subset(font)
# Naming only: preserve copyright, version and CSS family, describe the fixed instance.
names = {
    1: 'Archivo',
    2: 'Expanded ExtraBold',
    3: '2.001;OMNI;Archivo-ExpandedExtraBold-125-800',
    4: 'Archivo Expanded ExtraBold 125 800',
    6: 'Archivo-ExpandedExtraBold-125-800',
    16: 'Archivo',
    17: 'Expanded ExtraBold',
}
for name_id, value in names.items():
    records = [record for record in font['name'].names if record.nameID == name_id]
    for record in records:
        font['name'].setName(value, name_id, record.platformID, record.platEncID, record.langID)
    if not records:
        font['name'].setName(value, name_id, 3, 1, 0x409)
assert [r.toUnicode() for r in font['name'].names if r.nameID == 0] == original_copyright
font.flavor = 'woff2'
font.save(output)
license_source = root / 'node_modules/@fontsource-variable/archivo/LICENSE'
shutil.copyfile(license_source, output.parent / 'OFL.txt')
public_license = root / 'public/brand/fonts/OFL.txt'
public_license.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(license_source, public_license)
# Inspect the saved binary, including the four forbidden variation tables.
result = TTFont(output)
for table in ('fvar', 'gvar', 'HVAR', 'avar'):
    assert table not in result, table
assert output.stat().st_size < 25000
cmap = set(result.getBestCmap())
assert cmap == requested & original_cmap
required = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$—’·ÀÂÆÇÉÈÊËÎÏÔŒÙÛÜŸàâæçéèêëîïôœùûüÿ€'
# Missing source glyphs must be explicitly reported; never invent replacements.
assert all(ord(char) in cmap for char in required if ord(char) in original_cmap)
assert {ord(char) for char in required if ord(char) not in cmap} <= missing
metadata = {
    'source': source.relative_to(root).as_posix(),
    'output': output.relative_to(root).as_posix(),
    'axes': axes,
    'sourceBytes': source.stat().st_size,
    'outputBytes': output.stat().st_size,
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'outputSha256': hashlib.sha256(output.read_bytes()).hexdigest(),
    'glyphs': len(result.getGlyphOrder()),
    'unicodeCount': len(cmap),
    'addedCharacters': [{'code': f'U+{code:04X}', 'character': chr(code)} for code in sorted(cmap - previous)],
    'notInOriginalFont': [{'code': f'U+{code:04X}', 'character': chr(code)} for code in sorted(missing)],
    'requiredCharacters': required,
    'missingRequiredCharacters': [char for char in required if ord(char) not in cmap],
    'variationTables': [table for table in ('fvar', 'gvar', 'HVAR', 'avar') if table in result],
    'names': {str(key): value for key, value in names.items()},
    'copyrightPreserved': True,
    'note': 'Unavailable source characters are reported, never replaced by invented glyphs.',
}
proof = root / 'artifacts/font-cache/font.json'
proof.parent.mkdir(parents=True, exist_ok=True)
proof.write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + '\n', encoding='utf8')
print(json.dumps({key: value for key, value in metadata.items() if key != 'addedCharacters'}, indent=2, ensure_ascii=False))