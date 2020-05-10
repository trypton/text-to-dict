import util from 'util';
import WordNet from 'wordnet';

const wordnet = new WordNet();

export default function (word) {
  return new Promise((resolve) => {
    wordnet.lookup(word, function (err, results) {
      if (err) {
        resolve(null);
      }
      resolve(results);
    });
  });
}
