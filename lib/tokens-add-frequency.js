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
 * @returns {Array} Tokens with frequency in text and word rank
 */
export default async function (tokens) {
  await loadWordRankData();

  // 1) Count token in text
  const frequency = {};

  tokens
    .filter((token) => token.tag === 'word')
    .forEach((token) => {
      const value = token.lemma || token.normal;
      if (value in frequency) {
        frequency[value] += 1;
      } else {
        frequency[value] = 1;
      }
    });

  return tokens.map((token) => {
    const value = token.lemma || token.normal;
    const data = {};

    // 1a) Add frequency field if token count > 1
    if (value in frequency && frequency[value] > 1) {
      data.frequency = frequency[value];
    }

    // 2) Get general word frequency (rank)
    if (value in wordRank) {
      data.rank = wordRank[value];
    }

    return { ...token, ...data };
  });
}
