/**
 * Filter all non-text data (html tags, subtitles timestamps etc.)
 * @param {String} text - Text to filter
 * @returns {String} Filtered text
 */
export default function (text) {
  // Find all html-like tags
  const htmlRe = /<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[\^'">\s]+))?)+\s*|\s*)\/?>/g;
  let matches = Array.from(text.matchAll(htmlRe));

  // Find all subtitles timestamps
  const srtRe = /^((?:\d{2,}:)?\d{2}:\d{2}[,.]\d{3}) --> ((?:\d{2,}:)?\d{2}:\d{2}[,.]\d{3})(?: (.*))?$/gm;
  const srtMatches = Array.from(text.matchAll(srtRe));
  if (srtMatches.length) {
    // Find all subtitle indexes
    const srtIndexRe = /^\d+$/gm;
    matches = matches.concat(srtMatches, Array.from(text.matchAll(srtIndexRe)));
  }

  // Replace all matched chars with space to keep possibility of tracking words offset
  matches.forEach((match) => {
    const start = match.index;
    const len = match[0].length;
    text = text.substring(0, start) + ' '.repeat(len) + text.substring(start + len);
  });

  return text;
}
