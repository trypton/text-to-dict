import lookup from './word-lookup.js';
import stringifyTokens from './tokens-stringify.js';

/**
 * Find hyphenated words (e.g. good-looking) and group corresponding tokens
 * @param {Array} tokens - List of tokens
 * @param {Array} context - List of tokens context
 */
export default async function (tokens, context) {
  const result = [];
  let hyphenatedWordTokens = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    result.push(token);

    // Save tokens before and after hyphen
    if (token.pos === 'HYPH') {
      const next = tokens[i + 1];
      const prev = tokens[i - 1];
      if (prev && next && prev.tag === 'word' && next.tag === 'word' && prev.contextId === next.contextId) {
        if (!hyphenatedWordTokens.length) {
          hyphenatedWordTokens.push(prev);
        }
        hyphenatedWordTokens.push(token, next);
      } else {
        hyphenatedWordTokens = [];
      }
    }

    // Save tokens of hyphenated word as a group token
    if (token.pos !== 'HYPH' && hyphenatedWordTokens.length) {
      const tokenContext = context[token.contextId];
      const hyphenatedWord = stringifyTokens(hyphenatedWordTokens, 'value');
      const hyphenatedWordIndex = tokenContext.indexOf(hyphenatedWord);

      // Try to find the word in context
      if (hyphenatedWordIndex !== -1) {
        // Did we find all parts of a word?
        if (tokenContext[hyphenatedWordIndex + 1] !== '-') {
          const hyphenatedLemma = stringifyTokens(hyphenatedWordTokens, 'lemma');
          // Check dictionary if word does exist
          let wordDef = await lookup(hyphenatedWord);
          // If it doesn't - try lemma as well
          if (!wordDef) {
            wordDef = await lookup(hyphenatedLemma);
          }
          if (wordDef) {
            // Remove all hyphenated word tokens
            Array(hyphenatedWordTokens.length)
              .fill(null)
              .forEach(() => result.pop());

            // Generate new group token
            result.push({
              value: hyphenatedWord,
              tag: 'word',
              normal: stringifyTokens(hyphenatedWordTokens, 'normal'),
              // pos
              lemma: hyphenatedLemma,
              tokens: hyphenatedWordTokens,
            });
          }

          hyphenatedWordTokens = [];
        }
      } else {
        hyphenatedWordTokens = [];
      }
    }
  }

  return result;
}
