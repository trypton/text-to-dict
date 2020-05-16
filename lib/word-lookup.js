import util from 'util';
import WordNet from 'wordnet';

const wordnet = new WordNet();

const posWordnetToWinkMap = {
  adj: 'JJ',
  adv: 'RB',
  noun: 'NN',
  verb: 'VB',
};

/**
 * Get word data from dictionary
 * @param {String} word - A word to lookup
 * @param {String} pos - Include results with specific POS only
 * @returns {Promise} Resolves to either null if word not found or to word definition object
 */
export async function lookup(word, pos = null) {
  const definitions = await wordnet.lookup(word);

  if (!definitions.length) {
    return null;
  }

  return definitions
    .filter((definition) => {
      return !pos || pos.startsWith(posWordnetToWinkMap[definition.synsetType]);
    })
    .map((definition) => {
      const glossary = definition.glossary.split('; ');
      return {
        synonyms: definition.words.map((w) => w.word).filter((w) => w !== word),
        glossary: glossary.filter((desc) => !desc.startsWith('"')),
        examples: glossary.filter((example) => example.startsWith('"')).map((example) => example.slice(1, -1)),
        pos,
      };
    });
}

/**
 * Get the definition of the first found word
 * @param {Array} words - List of words to lookup
 */
export async function lookupWords(words) {
  for (let word of words) {
    const definition = await lookup(word);
    if (definition) {
      return definition;
    }
  }

  return null;
}
