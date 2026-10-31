const jimpModule = require('jimp');
const Jimp = jimpModule.Jimp || jimpModule;
const path = require('path');

async function generateIcons() {
  const sourcePath = 'C:/Users/Tomahawk/cs2-profile-checker/icons/icon_main.png';
  let image;
  try {
    image = typeof Jimp.read === 'function' ? await Jimp.read(sourcePath) : await jimpModule.read(sourcePath);
  } catch (e) {
    image = typeof Jimp.read === 'function' ? await Jimp.read('C:/Users/Tomahawk/cs2-profile-checker/icons/icon128.png') : await jimpModule.read('C:/Users/Tomahawk/cs2-profile-checker/icons/icon128.png');
  }

  const sizes = [16, 48, 128];

  for (const size of sizes) {
    const clone = image.clone();
    clone.resize({ w: size, h: size }); // Jimp v1 resize takes {w, h} or size
    if (typeof clone.circle === 'function') {
      clone.circle();
    }
    await clone.write('C:/Users/Tomahawk/cs2-profile-checker/icons/icon' + size + '.png');
    console.log('Generated circular icon' + size + '.png');
  }
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
