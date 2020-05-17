import { lookupWords } from './word-lookup.js';

/**
 * Add word definition from dictionary
 * @param {Array} tokens - List of tokens
 * @returns {Promise} Promise that resolves to the token list with definition field added
 */
export default function (tokens) {
  const withDefinitions = tokens.map(async (token) => {
    if (token.tag === 'word' && !('stop' in token)) {
      const definition = await lookupWords([token.value, token.lemma || token.normal], token.pos);

      if (definition) {
        return { ...token, definition };
      }
    }

    return token;
  });

  return Promise.all(withDefinitions);
}
