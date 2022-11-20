/**
 * Add word frequency data: how often word occurs in the text
 * @param {Array} tokens - List of tokens
 * @returns {Array} Tokens with frequency in text and word rank
 */
export default async function (tokens) {
  // 1) Count tokens
  const frequency = {};

  tokens.forEach((token) => {
    if (token.tag !== 'word') {
      return;
    }
    const value = token.lemma || token.normal;
    frequency[value] = value in frequency ? frequency[value] + 1 : 1;
  });

  // 2) Add frequency field if token count > 1
  return tokens.map((token) => {
    const value = token.lemma || token.normal;

    if (value in frequency && frequency[value] > 1) {
      return { ...token, frequency: frequency[value] };
    }

    return token;
  });
}
