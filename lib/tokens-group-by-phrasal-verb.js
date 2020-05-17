import { lookup } from './word-lookup.js';
import stringifyTokens from './tokens-stringify.js';

/**
 * Find phrasal verbs (e.g. come on) and group corresponding tokens
 * @param {Array} tokens - List of tokens
 * @returns {Array} Tokens with grouped tokens for phrasal verbs
 */
export default async function (tokens) {
  const result = [];

  // Loop index
  let currentTokenIndex = 0;

  // Keep index of the verb token
  let verbIndex = -1;

  for (const token of tokens) {
    result.push(token);

    // Store verb position
    if (token.pos && token.pos.startsWith && token.pos.startsWith('VB')) {
      verbIndex = currentTokenIndex;
    }

    const next = tokens[currentTokenIndex + 1];

    // Checking for the following patterns (PREP => IN | ADV => RP):
    // 1) VERB + PREP
    // 2) VERB + ADV
    // 3) VERB + ADV + PREP
    if (verbIndex !== -1 && ((token.pos === 'RP' && (!next || next.pos !== 'IN')) || token.pos === 'IN')) {
      const verb = tokens[verbIndex];
      let phrasalVerbTokens = [verb];

      // Covers VERB + ADV + PREP case
      if (token.pos === 'IN') {
        const prev = tokens[currentTokenIndex - 1];
        if (prev && prev.pos === 'RP') {
          phrasalVerbTokens.push(prev);
        }
      }

      phrasalVerbTokens.push(token);

      // Make sure all tokens have the same context
      phrasalVerbTokens = phrasalVerbTokens.filter((t) => t.contextId === verb.contextId);

      // Stop processing if only one token left (means found tokens are in different context)
      if (phrasalVerbTokens.length > 1) {
        // Get POS of the verb
        const { pos } = phrasalVerbTokens[0];

        const phrasalVerbLemma = stringifyTokens(phrasalVerbTokens, 'lemma', ' ');
        const definition = await lookup(phrasalVerbLemma, pos);
        if (definition) {
          // Extract verb and all token after it
          const extractedTokens = [];
          Array(currentTokenIndex - verbIndex + 1)
            .fill(null)
            .forEach(() => extractedTokens.unshift(result.pop()));

          // Generate new group token in place of verb token
          result.push({
            value: stringifyTokens(phrasalVerbTokens, 'value', ' '),
            tag: 'word',
            normal: stringifyTokens(phrasalVerbTokens, 'normal', ' '),
            pos,
            lemma: phrasalVerbLemma,
            tokens: phrasalVerbTokens,
            definition,
          });

          // Put possible object tokens back
          if (extractedTokens.length !== phrasalVerbTokens.length) {
            // Remove verb
            extractedTokens.shift();
            // Remove PREP or ADV
            extractedTokens.pop();
            // Remove ADV if applicable
            if (phrasalVerbTokens.length === 3) {
              extractedTokens.pop();
            }
            result.push(...extractedTokens);
          }
        }
      }

      verbIndex = -1;
    }

    // TODO: reset verb index if pos can't be a part of an object

    currentTokenIndex += 1;
  }

  return result;
}
