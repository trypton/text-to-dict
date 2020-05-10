/**
 * Convert tokens array to string
 * @param {Array} tokens - List of tokens
 * @param {String} field - Token field to make string from. If doesn't exist `normal` to be used
 * @param {String} separator - Concatenation separator
 */
export default function (tokens, field, separator = '') {
  return tokens.reduce((words, token) => words.concat(token[field] || token.normal), []).join(separator);
}
