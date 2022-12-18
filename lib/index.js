import toPlainText from './text-plain.js';
import parseText from './text-parse.js';
import tokensAddOffset from './tokens-add-offset.js';
import tokensAddDefinition from './tokens-add-definition.js';
import tokensAddFrequency from './tokens-add-frequency.js';
import tokensAddRank from './tokens-add-rank.js';
import tokensIsStopWord from './tokens-is-stop-word.js';
import tokensGroupByHyphen from './tokens-group-by-hyphen.js';
import tokensGroupByPhrasalVerb from './tokens-group-by-phrasal-verb.js';

/**
 * @typedef {Object} Dict
 * @property {Array} context - List of text sentences
 * @property {Array} tokens - List of text tokens
 */

/**
 * Convert text to tokens with context
 * @param {String} text - Input text
 * @param {Object=} options - Config options
 * @param {Boolean} [options.wordsOnly=true] - Return only tokens with tag=word
 * @param {Object|null} [options.wordsRank=null] - Object with words as its keys and their rank as value
 * @param {Object|null} [options.stopWords=null] - Object with stop words as its keys
 * @param {Boolean} [options.filterStopWords=true] - Filter out stop words
 * @param {Boolean} [options.groupByHyphen=true] - Group words by hyphen when possible
 * @param {Boolean} [options.groupByPhrasalVerb=true] - Group phrasal verbs when possible
 * @param {Boolean} [options.withDefinitions=true] - Include word definition
 * @param {Boolean} [options.skipDefinitionPointers=true] - Skip word definition pointers
 * @param {Boolean} [options.withOffset=true] - Add word start and end offset data
 * @param {Boolean} [options.withFrequency=true] - Count how often word occurs in text
 * @param {Boolean} [options.withDebug=true] - Include debug data
 * @returns {Dict} Tokens and context
 * @throws {Error} If text processing fails
 */
export default async function (
  text,
  {
    wordsOnly = true,
    wordsRank = null,
    stopWords = null,
    filterStopWords = true,
    groupByHyphen = true,
    groupByPhrasalVerb = true,
    withDefinitions = true,
    skipDefinitionPointers = true,
    withOffset = true,
    withFrequency = true,
    withDebug = false,
  } = {}
) {
  const debug = { performance: {} };

  // Filter text
  debug.performance.toPlainText = performance.now();
  const plainText = toPlainText(text);
  debug.performance.toPlainText = performance.now() - debug.performance.toPlainText;

  // Parse text into tokens with context
  debug.performance.parseText = performance.now();
  let { tokens, context } = parseText(plainText);
  debug.performance.parseText = performance.now() - debug.performance.parseText;

  if (withOffset) {
    debug.performance.tokensAddOffset = performance.now();
    tokens = tokensAddOffset(tokens, plainText);
    debug.performance.tokensAddOffset = performance.now() - debug.performance.tokensAddOffset;
  }

  if (wordsOnly) {
    debug.performance.filterWords = performance.now();
    tokens = tokens.filter((token) => token.tag === 'word');
    debug.performance.filterWords = performance.now() - debug.performance.filterWords;
  }

  if (stopWords) {
    debug.performance.tokensIsStopWord = performance.now();
    tokens = await tokensIsStopWord(tokens, stopWords);
    debug.performance.tokensIsStopWord = performance.now() - debug.performance.tokensIsStopWord;
  }

  if (wordsRank) {
    debug.performance.tokensAddRank = performance.now();
    tokens = await tokensAddRank(tokens, wordsRank);
    debug.performance.tokensAddRank = performance.now() - debug.performance.tokensAddRank;
  }

  if (withFrequency) {
    debug.performance.tokensAddFrequency = performance.now();
    tokens = await tokensAddFrequency(tokens);
    debug.performance.tokensAddFrequency = performance.now() - debug.performance.tokensAddFrequency;
  }

  if (withDefinitions) {
    debug.performance.tokensAddDefinition = performance.now();
    tokens = await tokensAddDefinition(tokens, { skipPointers: skipDefinitionPointers });
    debug.performance.tokensAddDefinition = performance.now() - debug.performance.tokensAddDefinition;
  }

  if (groupByHyphen) {
    debug.performance.tokensGroupByHyphen = performance.now();
    tokens = await tokensGroupByHyphen(tokens, context);
    debug.performance.tokensGroupByHyphen = performance.now() - debug.performance.tokensGroupByHyphen;
  }

  if (groupByPhrasalVerb) {
    debug.performance.tokensGroupByPhrasalVerb = performance.now();
    tokens = await tokensGroupByPhrasalVerb(tokens);
    debug.performance.tokensGroupByPhrasalVerb = performance.now() - debug.performance.tokensGroupByPhrasalVerb;
  }

  if (stopWords && filterStopWords) {
    debug.performance.filterStopWords = performance.now();
    tokens = tokens.filter((token) => !token.stop);
    debug.performance.filterStopWords = performance.now() - debug.performance.filterStopWords;
  }

  return { context, tokens, ...(withDebug ? { debug } : {}) };
}
