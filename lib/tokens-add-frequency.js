// Lazy loading of words rank data if exists
const wordRank = {};
const loadWordRankData = async function () {
  if (Object.keys(wordRank).length === 0) {
    try {
      const wordRankModule = await import('../data/word-rank.js');
      Object.assign(wordRank, wordRankModule.default);
    } catch {
      // Do nothing
    }
  }
};

/**
 * Add word frequency data
 * @param {Array} tokens - List of tokens
 */
export default async function (tokens) {
  await loadWordRankData();

  // 1) Count token in text
  const frequency = {};

  tokens.forEach((token) => {
    const value = token.lemma || token.normal;
    if (value in frequency) {
      frequency[value] += 1;
    } else {
      frequency[value] = 1;
    }
  });

  return tokens.map((token) => {
    const value = token.lemma || token.normal;

    // 1a) Add frequency field if token count > 1
    if (frequency[value] > 1) {
      token.frequency = frequency[value];
    }

    // 2) Get general word frequency (rank)
    if (value in wordRank) {
      token.rank = wordRank[value];
    }

    return token;
  });
}
