import { lookupWords } from './word-lookup.js';

/**
 * Add word definition from dictionary
 * @param {Array} tokens - List of tokens
 * @param {Object=} options - Lookup options
 * @param {Boolean} [options.skipPointers=false] - Whether to skip inclusion of pointer data.
 * @returns {Promise} Promise that resolves to the token list with definition field added
 */
export default function (tokens, { skipPointers = false } = {}) {
  const withDefinitions = tokens.map(async (token) => {
    if (token.tag === 'word' && !token.stop && !token.definition) {
      const words = [token.value, token.lemma || token.normal];
      const definition = await lookupWords(words, { pos: token.pos, skipPointers });

      if (definition) {
        return { ...token, definition };
      }
    }

    return token;
  });

  return Promise.all(withDefinitions);
}
