// Lazy load stop words
let stopWords = null;
const loadStopWordsList = async function () {
  if (stopWords === null) {
    try {
      const stopWordsModule = await import('../data/stop-words.js');
      stopWords = stopWordsModule.default;
    } catch {
      stopWords = {};
    }
  }
};

/**
 * Add is stop word field to token
 * @param {Array} tokens - List of tokens
 * @returns {Array} Tokens with stop field for english stop words
 */
export default async function (tokens) {
  await loadStopWordsList();

  return tokens.map((token) => {
    const value = token.lemma || token.normal;

    if (value in stopWords) {
      token.stop = 1;
    }

    return token;
  });
}
