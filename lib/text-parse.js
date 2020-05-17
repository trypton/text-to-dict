import english from 'retext-english';
import unified from 'unified';
import PosTagger from 'wink-pos-tagger';

// Prepare POS tagger
const tagger = PosTagger();

/**
 * Walk through syntax tree node children
 * @generator
 * @param {Object} syntaxTreeNode - unified syntax tree node
 * @param {Object} guard - Object with syntax node types to stop processing
 * @yields {Object} Syntax tree node
 */
function* syntaxTreeWalker(syntaxTreeNode, guard = {}) {
  // Returns node itself before processing its child nodes
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

/**
 * Parse text with POS tagger
 * @param {String} text - text to parse
 * @returns {Dict} Tokens with context
 */
export default function (text) {
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

      // Add context id info to each token
      tokens.forEach((token) => {
        token.contextId = contextId;
      });

      result.context.push(context);
      result.tokens = result.tokens.concat(tokens);
    }
  }

  return result;
}
