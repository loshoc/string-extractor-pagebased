// This plugin extracts unique strings from UI pages based on a specified prefix.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 300, height: 246 });

let prefix = 'page/';

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'extract-strings') {
    const customPrefix = msg.prefix || prefix;
    const result = await extractStrings(customPrefix);
    figma.currentPage.selection = result.nodes;
    figma.viewport.scrollAndZoomIntoView(result.nodes);
    figma.ui.postMessage({ type: 'extraction-complete', strings: result.strings });
  } else if (msg.type === 'export') {
    const { format, data } = msg;
    if (format === 'json') {
      // Handle JSON export
      figma.ui.postMessage({ type: 'export-json', data: JSON.stringify(data) });
    } else if (format === 'csv') {
      // Handle CSV export
      const csv = convertToCSV(data);
      figma.ui.postMessage({ type: 'export-csv', data: csv });
    }
  }
};

async function extractStrings(prefix: string): Promise<{ strings: string[], nodes: SceneNode[] }> {
  const notifyId = figma.notify('Extracting strings...', { timeout: Infinity });

  const nodes = figma.currentPage.findAll(node => 
    (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT') &&
    node.name.startsWith(prefix)
  );

  const stringSet = new Set<string>();
  const textNodes: SceneNode[] = [];

  for (const node of nodes) {
    await extractStringsFromNode(node, stringSet, textNodes);
  }

  const uniqueStrings = Array.from(stringSet).filter(str => !isPureNumber(str));

  notifyId.cancel();
  figma.notify('Extraction complete!', { timeout: 2000 });

  return { strings: uniqueStrings, nodes: textNodes };
}

async function extractStringsFromNode(node: SceneNode, stringSet: Set<string>, textNodes: SceneNode[]): Promise<void> {
  if (isVisibleTextNode(node) && !isPureNumber(node.characters) && 
      'fontName' in node && typeof node.fontName === 'object' && 'family' in node.fontName &&
      node.fontName.family !== 'Segoe Fluent Icons') {
    const casedText = applyCasing(node.characters, node.textCase as TextCase);
    stringSet.add(casedText);
    textNodes.push(node);
  }

  if ('children' in node) {
    for (const child of node.children) {
      await extractStringsFromNode(child, stringSet, textNodes);
    }
  }
}

function convertToCSV(data: string[]): string {
  return data.join('\n');
}

function isPureNumber(str: string): boolean {
  return /^\d+$/.test(str.trim());
}

function isVisibleTextNode(node: SceneNode): node is TextNode {
  if (node.type !== 'TEXT') return false;
  
  // Check if the node itself is visible
  if (!node.visible) return false;

  // Check if any parent is invisible
  let parent = node.parent;
  while (parent) {
    if ('visible' in parent && !parent.visible) return false;
    parent = parent.parent;
  }

  // Check if the text has content and is not empty or whitespace-only
  return node.characters.trim().length > 0;
}

function applyCasing(text: string, textCase: TextCase): string {
  switch (textCase) {
    case 'UPPER':
      return text.toUpperCase();
    case 'LOWER':
      return text.toLowerCase();
    case 'TITLE':
      return text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    case 'ORIGINAL':
    default:
      return text;
  }
}

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.


// Make sure TextCase is properly typed


type CustomTextCase = 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
