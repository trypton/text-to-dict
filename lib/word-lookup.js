import wordnet from '@trypton/wordnet';
import wordnetDb from 'wordnet-db';

const wordnetSynsetTypeToWinkPosMap = {
  adjective: 'JJ',
  'adjective satellite': 'JJ',
  adverb: 'RB',
  noun: 'NN',
  verb: 'VB',
};

const initWordnet = (function () {
  let initialized;
  return () => {
    if (!initialized) {
      initialized = wordnet.init(wordnetDb.path);
    }
    return initialized;
  };
})();

const normalizeWord = (word) => word.word.replace(/_/g, ' ');

/**
 * Get word data from dictionary
 * @param {String} word - A word to lookup
 * @param {Object=} options - Lookup options
 * @param {String|null} [options.pos=null] - Filter definitions by POS tag
 * @param {Boolean} [options.skipPointers=false] - Whether to skip inclusion of pointer data.
 * @returns {Promise} Resolves to either null if word not found or to word definition object
 */
export async function lookup(word, { pos = null, skipPointers = false } = {}) {
  await initWordnet();

  let definitions;
  try {
    definitions = await wordnet.lookup(word, skipPointers);
  } catch {
    return null;
  }

  const synsetOffsets = [];

  return definitions
    .flatMap((definition) => [
      definition,
      ...definition.meta.pointers
        .filter((pointer) => pointer.data && pointer.data.meta.words.map(normalizeWord).includes(word))
        .map((pointer) => pointer.data),
    ])
    .filter(({ meta }) => {
      if (!pos || pos.startsWith(wordnetSynsetTypeToWinkPosMap[meta.synsetType])) {
        if (synsetOffsets.includes(meta.synsetOffset)) {
          return false;
        }
        synsetOffsets.push(meta.synsetOffset);
        return true;
      }
      return false;
    })
    .map((definition) => {
      const glossary = definition.glossary.split('; ');
      return {
        words: definition.meta.words.map(normalizeWord),
        glossary: glossary.filter((desc) => !desc.startsWith('"')),
        examples: glossary.filter((example) => example.startsWith('"')).map((example) => example.slice(1, -1)),
      };
    });
}

/**
 * Get the definition of the first found word
 * @param {Array} words - List of words to lookup
 * @param {Object=} options - Lookup options
 * @param {String|null} [options.pos=null] - Filter definitions by POS tag
 * @param {Boolean} [options.skipPointers=false] - Whether to skip inclusion of pointer data.
 * @returns {Promise} Resolves to either null if word not found or to word definition object
 */
export async function lookupWords(words, { pos = null, skipPointers = false } = {}) {
  for (const word of words) {
    const definition = await lookup(word, { pos, skipPointers });
    if (definition && definition.length) {
      return definition;
    }
  }

  // Try with POS filter disabled
  if (pos !== null) {
    for (const word of words) {
      const definition = await lookup(word, { skipPointers });
      if (definition && definition.length) {
        return definition;
      }
    }
  }

  return null;
}
