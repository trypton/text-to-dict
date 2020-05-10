// Lazy loading of stop words
const stopWords = {};
const loadStopWordsList = async function () {
  if (Object.keys(stopWords).length === 0) {
    try {
      const stopWordsModule = await import('../data/stop-words.js');
      Object.assign(stopWords, stopWordsModule.default);
    } catch {
      // Do nothing
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
