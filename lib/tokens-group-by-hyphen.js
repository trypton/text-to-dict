import tokensAddDefinition from './tokens-add-definition.js';
import tokensAddRank from './tokens-add-rank.js';
import stringifyTokens from './tokens-stringify.js';

/**
 * Find hyphenated words (e.g. good-looking) and group corresponding tokens
 * @param {Array} tokens - List of tokens
 * @param {Array} context - List of tokens context
 * @param {Object=} options - Config options
 * @param {Object|null} [options.wordsRank=null] - Object with words as its keys and their rank as value
 * @param {Boolean} [options.withDefinitions=true] - Include word definition
 * @param {Boolean} [options.skipDefinitionPointers=true] - Skip word definition pointers
 * @param {Boolean} [options.withOffset=true] - Add word start and end offset data
 * @param {Boolean} [options.withFrequency=true] - Count how often word occurs in text
 * @returns {Array} Tokens with grouped tokens for hyphenated words
 */
export default async function (
  tokens,
  context,
  {
    wordsRank = null,
    withDefinitions = true,
    skipDefinitionPointers = true,
    withOffset = true,
    withFrequency = true,
  } = {}
) {
  const result = [];

  // Collect frequency data
  const frequency = {};

  // Collect tokens belong to one word
  let hyphenatedWordTokens = [];

  // Loop index
  let currentTokenIndex = 0;

  for (const token of tokens) {
    result.push(token);

    // Save tokens before and after hyphen
    if (token.pos === 'HYPH') {
      const next = tokens[currentTokenIndex + 1];
      const prev = tokens[currentTokenIndex - 1];
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
          const hyphenatedWordLemma = stringifyTokens(hyphenatedWordTokens, 'lemma');
          // Remove all hyphenated word tokens from result in order to replace with a group one
          result.splice(-1 * hyphenatedWordTokens.length, hyphenatedWordTokens.length);
          // Generate new group token
          let hyphenatedWordToken = [
            {
              value: hyphenatedWord,
              tag: 'word',
              normal: stringifyTokens(hyphenatedWordTokens, 'normal'),
              // TODO: pos - how to determine in this case?
              lemma: hyphenatedWordLemma,
              contextId: token.contextId,
              ...(withOffset
                ? {
                    startOffset: hyphenatedWordTokens.at(0).startOffset,
                    endOffset: hyphenatedWordTokens.at(-1).endOffset,
                  }
                : {}),
              tokens: hyphenatedWordTokens,
            },
          ];
          if (withDefinitions) {
            hyphenatedWordToken = await tokensAddDefinition(hyphenatedWordToken, {
              skipPointers: skipDefinitionPointers,
            });
          }
          if (wordsRank) {
            hyphenatedWordToken = await tokensAddRank(hyphenatedWordToken, wordsRank);
          }
          const length = result.push(...hyphenatedWordToken);
          if (!frequency[hyphenatedWordLemma]) {
            frequency[hyphenatedWordLemma] = { count: 0, indices: [] };
          }
          frequency[hyphenatedWordLemma].count += 1;
          frequency[hyphenatedWordLemma].indices.push(length - 1);
          hyphenatedWordTokens = [];
        }
      } else {
        hyphenatedWordTokens = [];
      }
    }

    currentTokenIndex += 1;
  }

  if (withFrequency) {
    Object.values(frequency).forEach(({ count, indices }) => {
      if (count > 1) {
        indices.forEach((index) => {
          result[index].frequency = count;
        });
      }
    });
  }

  return result;
}
