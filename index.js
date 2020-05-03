import fs from 'fs';
import english from 'retext-english';
import unified from 'unified';
import PosTagger from 'wink-pos-tagger';
import WordNet from 'wordnet';

const wordnet = new WordNet();
function isDictionaryWord(word) {
  return new Promise((resolve) => {
    wordnet.lookup(word, function (err, results) {
      resolve(err === null);
    });
  });
}

function stringifyTokens(tokens, field, separator = '') {
  return tokens.reduce((words, token) => words.concat(token[field] || token.normal), []).join(separator);
}

function* syntaxTreeWalker(syntaxTreeNode, guard = {}) {
  yield syntaxTreeNode;

  if (syntaxTreeNode.children && guard[syntaxTreeNode.type] !== true) {
    for (let i = 0; i < syntaxTreeNode.children.length; i++) {
      const walker = syntaxTreeWalker(syntaxTreeNode.children[i], guard);
      let child;
      while (((child = walker.next()), !child.done)) {
        yield child.value;
      }
    }
  }
}

async function tagText(text) {
  const result = {
    context: [],
    tokens: [],
  };

  // Squeeze paragraphs first to get correct sentence nodes
  const squeezedText = text
    .replace(/^[\s\n]+/gm, '') // Remove all empty lines
    .replace(/\s+$/gm, '') // Trim right
    .replace(/ +/g, ' '); // Replace space sequences with one space

  // Build syntax tree to get context of each word
  const syntaxTree = unified().use(english).parse(squeezedText);

  // Prepare POS tagger
  const tagger = PosTagger();

  // Get context of each word
  for (let node of syntaxTreeWalker(syntaxTree, { SentenceNode: true })) {
    // Consider SentenceNode as a context for all its children
    if (node.type === 'SentenceNode') {
      let context = '';

      for (let sentenceChildNode of syntaxTreeWalker(node)) {
        if (sentenceChildNode.value) {
          context += sentenceChildNode.value === '\n' ? ' ' : sentenceChildNode.value;
        }
      }

      const tokens = tagger.tagSentence(context);
      const contextId = result.context.length;

      tokens.forEach((token) => {
        token.contextId = contextId;
      });

      result.context.push(context);
      result.tokens = result.tokens.concat(tokens);
    }
  }

  // Calculate words offset
  // We can't use syntax tree position data here because we didn't preserve spaces
  // Another approach could be building a separate tree from original `text`
  let currentWord = '';
  let startOffset = 0;
  let currentToken = 0;

  // Read text char by char
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    const endOffset = i + 1;

    if (!/\s/.test(char)) {
      currentWord += char;
      const token = result.tokens[currentToken];
      if (token.value === currentWord) {
        token.startOffset = startOffset;
        token.endOffset = endOffset;

        currentWord = '';
        startOffset = endOffset;
        currentToken += 1;
      }
    } else {
      startOffset = endOffset;
    }
  }

  // Find hyphenated words (e.g. good-looking)
  let tokens = [];
  let hyphenatedWordTokens = [];

  for (let i = 0; i < result.tokens.length; i++) {
    const token = result.tokens[i];
    tokens.push(token);

    // Save tokens before and after hyphen
    if (token.pos === 'HYPH') {
      const next = result.tokens[i + 1];
      const prev = result.tokens[i - 1];
      if (prev && next && prev.tag === 'word' && next.tag === 'word' && prev.contextId === next.contextId) {
        if (!hyphenatedWordTokens.length) {
          hyphenatedWordTokens.push(prev);
        }
        hyphenatedWordTokens.push(token, next);
      } else {
        hyphenatedWordTokens = [];
      }
    }

    // Save tokens of hyphenated word as a group token
    if (token.pos !== 'HYPH' && hyphenatedWordTokens.length) {
      const context = result.context[token.contextId];
      const hyphenatedWord = stringifyTokens(hyphenatedWordTokens, 'value');
      const hyphenatedWordIndex = context.indexOf(hyphenatedWord);

      // Try to find the word in context
      if (hyphenatedWordIndex !== -1) {
        // Did we find all parts of a word?
        if (context[hyphenatedWordIndex + 1] !== '-') {
          const hyphenatedLemma = stringifyTokens(hyphenatedWordTokens, 'lemma');
          // Check dictionary if word does exist
          let isKnownWord = await isDictionaryWord(hyphenatedWord);
          // If it doesn't - try lemma as well
          if (!isKnownWord) {
            isKnownWord = await isDictionaryWord(hyphenatedLemma);
          }
          if (isKnownWord) {
            // Remove all hyphenated word tokens
            Array(hyphenatedWordTokens.length)
              .fill(null)
              .forEach(() => tokens.pop());

            // Generate new group token
            tokens.push({
              value: hyphenatedWord,
              tag: 'word',
              normal: stringifyTokens(hyphenatedWordTokens, 'normal'),
              // pos
              lemma: hyphenatedLemma,
              tokens: hyphenatedWordTokens,
            });
          }

          hyphenatedWordTokens = [];
        }
      } else {
        hyphenatedWordTokens = [];
      }
    }
  }

  result.tokens = tokens;

  // Find phrasal verbs (e.g. come on)
  let verbIndex = -1;
  tokens = [];

  for (let i = 0; i < result.tokens.length; i++) {
    const token = result.tokens[i];
    tokens.push(token);

    // Store verb position
    if (token.pos && token.pos.startsWith && token.pos.startsWith('VB')) {
      verbIndex = i;
    }

    const next = result.tokens[i + 1];

    // Checking for the following patterns (PREP => IN | ADV => RP):
    // 1) VERB + PREP
    // 2) VERB + ADV
    // 3) VERB + ADV + PREP
    if (verbIndex !== -1 && ((token.pos === 'RP' && (!next || next.pos !== 'IN')) || token.pos === 'IN')) {
      const verb = result.tokens[verbIndex];
      let phrasalVerbTokens = [verb];

      // Covers VERB + ADV + PREP case
      if (token.pos === 'IN') {
        const prev = result.tokens[i - 1];
        if (prev && prev.pos === 'RP') {
          phrasalVerbTokens.push(prev);
        }
      }

      phrasalVerbTokens.push(token);

      // Make sure all tokens have the same context
      phrasalVerbTokens = phrasalVerbTokens.filter((t) => t.contextId === verb.contextId);
      // Stop processing if only one token left
      phrasalVerbTokens = phrasalVerbTokens.length === 1 ? [] : phrasalVerbTokens;

      const phrasalVerbLemma = stringifyTokens(phrasalVerbTokens, 'lemma', ' ');
      const isKnownWord = await isDictionaryWord(phrasalVerbLemma);
      if (isKnownWord) {
        // Extract verb and all taken after it
        const extractedTokens = [];
        Array(i - verbIndex + 1)
          .fill(null)
          .forEach(() => extractedTokens.unshift(tokens.pop()));

        // Generate new group token in place of verb token
        tokens.push({
          value: stringifyTokens(phrasalVerbTokens, 'value', ' '),
          tag: 'word',
          normal: stringifyTokens(phrasalVerbTokens, 'normal', ' '),
          pos: phrasalVerbTokens[0].pos,
          lemma: phrasalVerbLemma,
          tokens: phrasalVerbTokens,
        });

        // Put possible object tokens back
        if (extractedTokens.length !== phrasalVerbTokens.length) {
          // Remove verb
          extractedTokens.shift();
          // Remove PREP or ADV
          extractedTokens.pop();
          // Remove ADV if applicable
          if (phrasalVerbTokens.length === 3) {
            extractedTokens.pop();
          }
          tokens.push(...extractedTokens);
        }
      }

      verbIndex = -1;
    }

    // TODO: reset verb index if pos can't be a part of object
  }

  result.tokens = tokens;

  // Add frequency in text

  // Add general frequency

  // Add phonetic transcription

  return result;
}

fs.readFile('./the.simpsons.s31e17.srt', 'utf8', async (err, data) => {
  console.time('parse');
  const result = await tagText(toPlainText(data));
  console.timeEnd('parse');
  fs.writeFile('./result.json', JSON.stringify(result, ' ', 2), 'utf8', () => {});
});

function toPlainText(text) {
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

function saveFile(name, data, isJson = true) {
  if (isJson) {
    name += '.json';
    data = JSON.stringify(data, ' ', 2);
  } else {
    name += '.txt';
  }
  fs.writeFile('./' + name, data, 'utf8', () => {});
}
