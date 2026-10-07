import sharp from 'sharp';
for (const size of [32, 180, 192, 512]) {
  await sharp('public/brand/mule-favicon.svg', { density: 768 })
    .resize(size, size).png().toFile(`public/brand/icon-${size}.png`);
}
console.log('Rasterized supplied favicon at 32, 180, 192 and 512 pixels.');
