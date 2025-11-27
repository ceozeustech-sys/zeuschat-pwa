const sharp = require('sharp')
const fs = require('fs')

async function run() {
  fs.mkdirSync('public/icons', { recursive: true })
  const candidates = [
    'public/icons/source.png',
    'public/icons/source.jpg',
    'public/icons/source.jpeg',
    'public/icons/source.svg',
    'public/icons/logo.svg'
  ]
  const src = candidates.find(p => fs.existsSync(p)) || 'public/icons/logo.svg'

  // 192x192
  await sharp(src)
    .resize(192, 192, { fit: 'contain', background: '#0E1A24' })
    .png()
    .toFile('public/icons/icon-192x192.png')

  // 512x512
  await sharp(src)
    .resize(512, 512, { fit: 'contain', background: '#0E1A24' })
    .png()
    .toFile('public/icons/icon-512x512.png')

  // maskable 512x512 with extra padding
  await sharp(src)
    .resize(448, 448, { fit: 'contain', background: '#0E1A24' })
    .extend({ top: 32, bottom: 32, left: 32, right: 32, background: '#0E1A24' })
    .png()
    .toFile('public/icons/maskable-icon-512x512.png')
}

run().catch(e => { console.error(e); process.exit(1) })
