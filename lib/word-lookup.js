import util from 'util';
import WordNet from 'wordnet';

const wordnet = new WordNet();

const posWordnetToWinkMap = {
  a: 'JJ',
  r: 'RB',
  n: 'NN',
  v: 'VB',
};

/**
 * Get word data from dictionary
 * @param {String} word - A word to lookup
 * @param {String} pos - Filter definitions by POS tag
 * @returns {Promise} Resolves to either null if word not found or to word definition object
 */
export async function lookup(word, pos = null) {
  const definitions = await wordnet.lookup(word);

  if (!definitions.length) {
    return null;
  }

  return definitions
    .filter((definition) => {
      return !pos || pos.startsWith(posWordnetToWinkMap[definition.pos]);
    })
    .map((definition) => {
      const glossary = definition.glossary.split('; ');
      return {
        words: definition.words.map((w) => w.word),
        glossary: glossary.filter((desc) => !desc.startsWith('"')),
        examples: glossary.filter((example) => example.startsWith('"')).map((example) => example.slice(1, -1)),
      };
    });
}

/**
 * Get the definition of the first found word
 * @param {Array} words - List of words to lookup
 * @param {String} pos - Filter definitions by POS tag
 * @returns {Promise} Resolves to either null if word not found or to word definition object
 */
export async function lookupWords(words, pos = null) {
  for (const word of words) {
    const definition = await lookup(word, pos);
    if (definition && definition.length) {
      return definition;
    }
  }

  // Try with POS filter disabled
  for (const word of words) {
    const definition = await lookup(word);
    if (definition && definition.length) {
      return definition;
    }
  }

  return null;
}
