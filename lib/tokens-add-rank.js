/**
 * Add word rank: how frequently word occurs in english texts in general
 * @param {Array} tokens - List of tokens
 * @param {Object} [wordsRank] - Object with words as its keys and their rank as value
 * @returns {Array} Tokens with word rank
 */
export default async function (tokens, wordsRank = {}) {
  return tokens.map((token) => {
    const value = token.lemma || token.normal;

    if (value in wordsRank) {
      return { ...token, rank: wordsRank[value] };
    }

    return token;
  });
}
