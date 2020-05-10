import toPlainText from './text-plain.js';
import parseText from './text-parse.js';
import tokensAddOffset from './tokens-add-offset.js';
import tokensAddFrequency from './tokens-add-frequency.js';
import tokensGroupByHyphen from './tokens-group-by-hyphen.js';
import tokensGroupByPhrasalVerb from './tokens-group-by-phrasal-verb.js';

/**
 * @typedef {Object} Dict
 * @property {Array} context - List of text sentences
 * @property {Array} tokens - Lost of text tokens
 */

/**
 * Convert text to tokens with context
 * @param {String} text - Input text
 * @returns {Dict} Tokens and context
 */
export default async function (text) {
  // Filter text
  const plainText = toPlainText(text);

  // Parse text into tokens with context
  let { tokens, context } = parseText(plainText);

  tokens = tokensAddOffset(tokens, plainText);
  tokens = await tokensGroupByHyphen(tokens, context);
  tokens = await tokensGroupByPhrasalVerb(tokens);
  tokens = await tokensAddFrequency(tokens);

  return { context, tokens };
}
