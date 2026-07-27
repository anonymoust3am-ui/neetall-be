const fs = require('fs');
const path = require('path');

function resolveZynerdUrl(zynerdUrl) {
  const appUrl = 'https://api.neetell.in';
  const prefix = 'https://public.zynerd.com/';
  if (!zynerdUrl.startsWith(prefix)) return zynerdUrl;

  const relPath = zynerdUrl.substring(prefix.length);
  const parts = relPath.split('/');

  if (parts.length >= 4 && parts[0] === 'institutes') {
    const instituteId = parts[1];
    const type = parts[2];
    const filename = parts[3];

    const instDir = path.join(process.cwd(), 'data', 'images', instituteId);
    if (fs.existsSync(instDir)) {
      const target1 = `${type}_${filename}`;
      if (fs.existsSync(path.join(instDir, target1))) {
        return `${appUrl}/data/images/${instituteId}/${target1}`;
      }
      if (fs.existsSync(path.join(instDir, filename))) {
        return `${appUrl}/data/images/${instituteId}/${filename}`;
      }
      const ext = path.extname(filename);
      const target3 = `${type}_${instituteId}${ext}`;
      if (fs.existsSync(path.join(instDir, target3))) {
        return `${appUrl}/data/images/${instituteId}/${target3}`;
      }
      try {
        const files = fs.readdirSync(instDir);
        const matchingFile = files.find(f => f.startsWith(`${type}_`));
        if (matchingFile) {
          return `${appUrl}/data/images/${instituteId}/${matchingFile}`;
        }
      } catch (e) {}
    }
  }
  return `${appUrl}/institutes/proxy?path=${encodeURI(relPath)}`;
}

console.log('1517 logo 155:', resolveZynerdUrl('https://public.zynerd.com/institutes/1517/logo/155.png'));
console.log('1509 cover 1509:', resolveZynerdUrl('https://public.zynerd.com/institutes/1509/cover/1509.jpg'));
console.log('1509 logo 14:', resolveZynerdUrl('https://public.zynerd.com/institutes/1509/logo/14.png'));
console.log('1510 cover 1510:', resolveZynerdUrl('https://public.zynerd.com/institutes/1510/cover/1510.jpg'));
