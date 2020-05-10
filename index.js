import fs from 'fs';

import textToDict from './lib/index.js';

fs.readFile('./the.simpsons.s31e17.srt', 'utf8', async (err, text) => {
  console.time('parse');
  const result = await textToDict(text);
  console.timeEnd('parse');

  fs.writeFile('./result.json', JSON.stringify(result, ' ', 2), 'utf8', () => {});
});
