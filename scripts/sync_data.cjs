#!/usr/bin/env node
/**
 * Sync frontend TypeScript data from Go backend JSON data.
 * Handles both array format (tiles) and object format (events).
 * Usage: node scripts/sync_data.js
 */
const fs = require('fs');
const path = require('path');

const BASE = '/root/.openclaw/workspace/PFMansion';

// ─── Comment stripper (string-aware) ────────────────────────────────────────────
function stripComments(content) {
    const lines = content.split('\n');
    const clean = [];
    for (const raw of lines) {
        let inStr = false, escaped = false;
        let breakAt = raw.length;
        for (let i = 0; i < raw.length; i++) {
            if (escaped) { escaped = false; continue; }
            if (raw[i] === '\\') { escaped = true; continue; }
            if (raw[i] === '"') { inStr = !inStr; continue; }
            if (!inStr && raw.slice(i, i+2) === '//') { breakAt = i; break; }
        }
        clean.push(raw.slice(0, breakAt).trimEnd());
    }
    return clean.join('\n');
}

// ─── Parse TypeScript array ────────────────────────────────────────────────────
function parseTsArray(content, arrayName) {
    const clean = stripComments(content);
    const prefix = `export const ${arrayName} = [`;
    const idx = clean.indexOf(prefix);
    const bracketPos = idx + prefix.length - 1; // position of '['

    // Find matching ']' with depth tracking
    let d = 0, arrStart = -1, arrEnd = -1;
    for (let i = 0; i < clean.slice(bracketPos).length; i++) {
        const c = clean[bracketPos + i];
        if (c === '[') { d++; if (d === 1) arrStart = bracketPos + i + 1; }
        else if (c === ']') { if (d === 1) { arrEnd = bracketPos + i; break; } d--; }
    }

    const arrStr = clean.slice(arrStart, arrEnd).trim().replace(/,\s*$/, '');

    const entries = [];
    let buf = '', d2 = 0, inStr = false, escaped = false;
    for (let i = 0; i < arrStr.length; i++) {
        const c = arrStr[i];
        if (escaped) { buf += c; escaped = false; continue; }
        if (c === '\\' && inStr) { buf += c; continue; }
        if (c === '"') { inStr = !inStr; buf += c; continue; }
        if (inStr) { buf += c; continue; }
        if (c === '{') { d2++; buf += c; }
        else if (c === '}') {
            d2--; buf += c;
            if (d2 === 0) { try { entries.push(JSON.parse(buf)); buf = ''; } catch(e) {} }
        }
        else if (c === ',' && d2 === 0) {
            if (buf.trim()) { try { entries.push(JSON.parse(buf.trim())); } catch(e) {} }
            buf = '';
        } else buf += c;
    }
    if (buf.trim()) { try { entries.push(JSON.parse(buf.trim())); } catch(e) {} }
    return entries;
}

// ─── Parse TypeScript object ──────────────────────────────────────────────────
function parseTsObject(content) {
    const clean = stripComments(content);
    const idx = clean.indexOf('export const EVENTS_DATA = {');
    const bracePos = clean.indexOf('{', idx);
    const bodyStart = bracePos + 1;

    let d = 1, bodyEnd = -1;
    for (let i = bodyStart; i < clean.length; i++) {
        if (clean[i] === '{') d++;
        else if (clean[i] === '}') { d--; if (d === 0) { bodyEnd = i; break; } }
    }

    const body = clean.slice(bodyStart, bodyEnd);

    const entries = {};
    let key = null, buf = '', entryDepth = 0, inStr = false, escaped = false;
    for (let i = 0; i < body.length; i++) {
        const c = body[i];
        if (escaped) { buf += c; escaped = false; continue; }
        if (c === '\\' && inStr) { buf += c; continue; }
        if (c === '"') { inStr = !inStr; buf += c; continue; }
        if (inStr) { buf += c; continue; }
        if (c === '{') {
            if (entryDepth === 0) {
                const t = buf.trim();
                const m = t.match(/^\"([^\"]+)\":\s*$/);
                if (m) { key = m[1]; buf = ''; }
            }
            entryDepth++; buf += c;
        } else if (c === '}') {
            entryDepth--; buf += c;
            if (entryDepth === 0 && key) {
                try { entries[key] = JSON.parse(buf); }
                catch(e) { console.log(`  FAIL: ${key}`); }
                buf = ''; key = null;
            }
        } else if (c === ',' && entryDepth === 0) {
            buf = ''; // Reset at top-level comma
        } else { buf += c; }
    }
    return entries;
}

// ─── Write TypeScript array ───────────────────────────────────────────────────
function writeTsArray(filepath, entries, keyField = 'id') {
    let content = fs.readFileSync(filepath, 'utf8');
    const prefix = `export const TILES_DATA = [`;
    const idx = content.indexOf(prefix);
    const bracketPos = idx + prefix.length - 1;

    // Find matching ]
    let d = 0, arrEnd = -1;
    for (let i = 0; i < content.slice(bracketPos).length; i++) {
        const c = content[bracketPos + i];
        if (c === '[') d++;
        else if (c === ']') { if (d === 1) { arrEnd = bracketPos + i; break; } d--; }
    }

    const header = content.slice(0, bracketPos + 1); // includes '['
    entries.sort((a, b) => (a[keyField] || '').localeCompare(b[keyField] || ''));
    const itemsStr = entries.map(e => JSON.stringify(e, null, 2)).join(',\n');
    fs.writeFileSync(filepath, header + '\n  ' + itemsStr + ',\n];\n');
}

// ─── Write TypeScript object ───────────────────────────────────────────────────
function writeTsObject(filepath, entries) {
    let content = fs.readFileSync(filepath, 'utf8');
    const idx = content.indexOf('export const EVENTS_DATA = {');
    const header = content.slice(0, idx + 'export const EVENTS_DATA = {'.length);
    const sortedKeys = Object.keys(entries).sort();
    const pairs = sortedKeys.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(entries[k], null, 4).replace(/\n/g, '\n  ')}`);
    fs.writeFileSync(filepath, header + '\n' + pairs.join(',\n') + ',\n};\n');
}

// ─── Main ──────────────────────────────────────────────────────────────────────
console.log('=== Syncing frontend data from backend JSON ===\n');

const beTiles = JSON.parse(fs.readFileSync(`${BASE}/game/data/tiles.json`)).volantis || [];
const beEventsRaw = JSON.parse(fs.readFileSync(`${BASE}/game/data/events.json`)).events || [];
const beEvents = {};
for (const e of beEventsRaw) beEvents[e.id] = e;

const tilesPath = `${BASE}/data/source/volantis/tiles/original.ts`;
const eventsPath = `${BASE}/data/source/volantis/events/original.ts`;

// ── Tiles ──
console.log('Parsing existing tiles from TypeScript...');
const feTiles = parseTsArray(fs.readFileSync(tilesPath, 'utf8'), 'TILES_DATA');
const feTileIds = new Set(feTiles.map(t => t.id));
console.log(`  Found ${feTileIds.size} frontend tiles`);

const mergedTiles = new Map(feTiles.map(t => [t.id, t]));
let addedTiles = 0;
for (const bt of beTiles) {
    if (!mergedTiles.has(bt.id)) { mergedTiles.set(bt.id, bt); addedTiles++; }
}
console.log(`\nAdding ${addedTiles} missing tiles`);
writeTsArray(tilesPath, Array.from(mergedTiles.values()));
console.log(`✅ Wrote ${mergedTiles.size} tiles to frontend`);

// ── Events ──
console.log('\nParsing existing events from TypeScript...');
const feEvents = parseTsObject(fs.readFileSync(eventsPath, 'utf8'));
console.log(`  Found ${Object.keys(feEvents).length} frontend events`);

const mergedEvents = { ...feEvents };
let addedEvents = 0;
for (const [id, ev] of Object.entries(beEvents)) {
    if (!mergedEvents[id]) { mergedEvents[id] = ev; addedEvents++; }
}
console.log(`\nAdding ${addedEvents} missing events`);
writeTsObject(eventsPath, mergedEvents);
console.log(`✅ Wrote ${Object.keys(mergedEvents).length} events to frontend`);

console.log('\n' + '='.repeat(50));
console.log('✅ Sync complete!');
console.log('Now rebuild: cd /root/.openclaw/workspace/PFMansion && npm run build');
