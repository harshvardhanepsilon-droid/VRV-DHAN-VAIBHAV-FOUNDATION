const sharp = require('sharp');

// Neon's free tier caps storage at 0.5GB, and every customer photo/ID
// document lives in Postgres as bytea — an unprocessed phone photo can be
// 3-8MB, which fills that budget after a few hundred uploads. Re-encoding to
// a capped JPEG keeps each image in the tens-of-KB range with no visible
// quality loss at the sizes these are actually displayed/printed at.
async function compressPhoto(buffer) {
  return sharp(buffer)
    .rotate() // apply EXIF orientation before stripping metadata
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

// ID documents need more resolution than a headshot to stay legible.
async function compressDocument(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}

// Logos keep transparency, so PNG instead of JPEG; still capped in size.
async function compressLogo(buffer) {
  return sharp(buffer)
    .resize({ width: 512, height: 512, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

module.exports = { compressPhoto, compressDocument, compressLogo };
