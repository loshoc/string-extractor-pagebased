"use strict";
// This plugin extracts unique strings from UI pages based on a specified prefix.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).
// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 300, height: 246 });
let prefix = 'page/';
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.type === 'extract-strings') {
        const customPrefix = msg.prefix || prefix;
        const result = yield extractStrings(customPrefix);
        figma.currentPage.selection = result.nodes;
        figma.viewport.scrollAndZoomIntoView(result.nodes);
        figma.ui.postMessage({ type: 'extraction-complete', strings: result.strings });
    }
    else if (msg.type === 'export') {
        const { format, data } = msg;
        if (format === 'json') {
            // Handle JSON export
            figma.ui.postMessage({ type: 'export-json', data: JSON.stringify(data) });
        }
        else if (format === 'csv') {
            // Handle CSV export
            const csv = convertToCSV(data);
            figma.ui.postMessage({ type: 'export-csv', data: csv });
        }
    }
});
function extractStrings(prefix) {
    return __awaiter(this, void 0, void 0, function* () {
        const notifyId = figma.notify('Extracting strings...', { timeout: Infinity });
        const nodes = figma.currentPage.findAll(node => (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT') &&
            node.name.startsWith(prefix));
        const stringSet = new Set();
        const textNodes = [];
        for (const node of nodes) {
            yield extractStringsFromNode(node, stringSet, textNodes);
        }
        const uniqueStrings = Array.from(stringSet).filter(str => !isPureNumber(str));
        notifyId.cancel();
        figma.notify('Extraction complete!', { timeout: 2000 });
        return { strings: uniqueStrings, nodes: textNodes };
    });
}
function extractStringsFromNode(node, stringSet, textNodes) {
    return __awaiter(this, void 0, void 0, function* () {
        if (isVisibleTextNode(node) && !isPureNumber(node.characters) &&
            'fontName' in node && typeof node.fontName === 'object' && 'family' in node.fontName &&
            node.fontName.family !== 'Segoe Fluent Icons') {
            const casedText = applyCasing(node.characters, node.textCase);
            stringSet.add(casedText);
            textNodes.push(node);
        }
        if ('children' in node) {
            for (const child of node.children) {
                yield extractStringsFromNode(child, stringSet, textNodes);
            }
        }
    });
}
function convertToCSV(data) {
    return data.join('\n');
}
function isPureNumber(str) {
    return /^\d+$/.test(str.trim());
}
function isVisibleTextNode(node) {
    if (node.type !== 'TEXT')
        return false;
    // Check if the node itself is visible
    if (!node.visible)
        return false;
    // Check if any parent is invisible
    let parent = node.parent;
    while (parent) {
        if ('visible' in parent && !parent.visible)
            return false;
        parent = parent.parent;
    }
    // Check if the text has content and is not empty or whitespace-only
    return node.characters.trim().length > 0;
}
function applyCasing(text, textCase) {
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
