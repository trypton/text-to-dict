import util from 'util';
import WordNet from 'wordnet';

const wordnet = new WordNet();

/**
 * Get word data from dictionary
 * @param {String} word - A word to lookup
 * @returns {Promise} Resolves to either null if word not found or to word definition object
 */
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
