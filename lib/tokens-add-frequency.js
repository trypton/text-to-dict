// Lazy load words rank data if exists
let wordRank = null;
const loadWordRankData = async function () {
  if (wordRank === null) {
    try {
      const wordRankModule = await import('../data/word-rank.js');
      wordRank = wordRankModule.default;
    } catch {
      wordRank = {};
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

  tokens.forEach((token) => {
    if (token.tag !== 'word') {
      return;
    }
    const value = token.lemma || token.normal;
    frequency[value] = value in frequency ? frequency[value] + 1 : 1;
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
