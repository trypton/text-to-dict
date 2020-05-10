/**
 * Calculate token offset in a text
 * Another approach could be building a syntax tree with unified
 * @param {Array} tokens - list of tokens
 * @param {String} text - text to calculate token offset
 */
export default function (tokens, text) {
  const result = [];

  let startOffset = 0;
  let currentToken = 0;
  let currentWord = '';

  // Read text char by char
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const endOffset = i + 1;

    if (!/\s/.test(char)) {
      currentWord += char;

      const token = { ...tokens[currentToken] };
      if (token.value === currentWord) {
        token.startOffset = startOffset;
        token.endOffset = endOffset;
        result.push(token);

        startOffset = endOffset;
        currentToken += 1;
        currentWord = '';
      }
    } else {
      startOffset = endOffset;
    }
  }

  return result;
}
