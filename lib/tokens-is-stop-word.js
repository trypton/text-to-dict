/**
 * Add is stop word field to token
 * @param {Array} tokens - List of tokens
 * @param {Object} stopWords - Object with stop words and its keys
 * @returns {Array} Tokens with stop field if word is present in stopWords object
 */
export default async function (tokens, stopWords = {}) {
  return tokens.map((token) => {
    const value = token.lemma || token.normal;

    if (value in stopWords) {
      token.stop = 1;
    }

    return token;
  });
}
