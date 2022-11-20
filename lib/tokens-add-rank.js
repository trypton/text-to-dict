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
 * Add word rank: how frequently word occurs in english texts in general
 * @param {Array} tokens - List of tokens
 * @returns {Array} Tokens with word rank
 */
export default async function (tokens) {
  await loadWordRankData();

  return tokens.map((token) => {
    const value = token.lemma || token.normal;

    if (value in wordRank) {
      return { ...token, rank: wordRank[value] };
    }

    return token;
  });
}
