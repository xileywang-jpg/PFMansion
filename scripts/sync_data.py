#!/usr/bin/env python3
"""
Sync frontend TypeScript data from Go backend JSON data.
Usage: python3 scripts/sync_data.py
"""
import json, os, re

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def strip_comments(content):
    """Strip // comments from TypeScript content, preserving strings."""
    lines = []
    for line in content.split('\n'):
        in_str = escape = False
        for i, c in enumerate(line):
            if escape: escape = False; continue
            if c == '\\': escape = True; continue
            if c == '"': in_str = not in_str; continue
            if not in_str and i + 1 < len(line) and line[i] == '/' and line[i+1] == '/':
                line = line[:i]; break
        lines.append(line.rstrip())
    return '\n'.join(lines)

def parse_ts_array(content, array_name):
    """Parse TypeScript array export into a list of dicts."""
    clean = strip_comments(content)
    idx = clean.index(f'{array_name} = [')
    bracket_pos = idx + len(f'{array_name} = [') - 1
    d = 0
    arr_start = arr_end = None
    for i, c in enumerate(clean[bracket_pos:]):
        if c == '[':
            d += 1
            if d == 1: arr_start = i + bracket_pos + 1
        elif c == ']':
            if d == 1: arr_end = i + bracket_pos; break
            d -= 1
    arr_str = clean[arr_start:arr_end].strip().rstrip(',')
    entries = []
    buf = ''
    d = 0
    in_str = escape = False
    i = 0
    while i < len(arr_str):
        c = arr_str[i]
        if escape: buf += c; escape = False; i += 1; continue
        if c == '\\' and in_str: buf += c; i += 1; continue
        if c == '"': in_str = not in_str; buf += c; i += 1; continue
        if in_str: buf += c; i += 1; continue
        if c == '{': d += 1; buf += c
        elif c == '}':
            d -= 1; buf += c
            if d == 0:
                try: entries.append(json.loads(buf)); buf = ''
                except: pass
        elif c == ',' and d == 0:
            if buf.strip():
                try: entries.append(json.loads(buf.strip()))
                except: pass
            buf = ''
        else: buf += c
        i += 1
    if buf.strip():
        try: entries.append(json.loads(buf.strip()))
        except: pass
    return entries

def write_ts_array(filepath, entries, key_field='id'):
    """Write a list of dicts as a TypeScript array export, preserving header."""
    with open(filepath) as f:
        content = f.read()
    # Keep only the header lines (before TILES_DATA = [)
    idx = content.index('export const TILES_DATA = [')
    header = content[:idx + len('export const TILES_DATA = [')]
    entries.sort(key=lambda x: x.get(key_field, ''))
    items = []
    for e in entries:
        s = json.dumps(e, ensure_ascii=False, indent=2)
        # Add comma after each entry
        items.append(s)
    body = ',\n'.join(items) + ',\n'
    final = header + '\n  ' + body + '];\n'
    with open(filepath, 'w') as f:
        f.write(final)

def parse_ts_object_line_by_line(filepath):
    """Parse TypeScript object export by reading entry by entry."""
    with open(filepath) as f:
        lines = f.read().split('\n')
    entries = {}
    current_key = None
    current_depth = 0
    current_entry_lines = []
    in_str = escape = False
    
    for raw_line in lines:
        line = raw_line.rstrip()
        # Strip // comment
        in_s = esc = False
        clean_line = ''
        for ci, ch in enumerate(line):
            if esc: esc = False; clean_line += ch; continue
            if ch == '\\' and in_s: esc = True; clean_line += ch; continue
            if ch == '"': in_s = not in_s; clean_line += ch; continue
            if not in_s and ci + 1 < len(line) and line[ci] == '/' and line[ci+1] == '/':
                break
            clean_line += ch
        line = clean_line.rstrip()
        if not line.strip():
            continue
        
        for ch in line:
            if ch == '"': in_str = not in_str
            elif ch == '\\': escape = True
            elif not in_str:
                if ch == '{': current_depth += 1
                elif ch == '}': current_depth -= 1
        
        if current_depth == 1 and ': {' in line:
            if current_key and current_entry_lines:
                entry_str = '\n'.join(current_entry_lines)
                clean_entry = strip_comments(entry_str)
                try:
                    val = json.loads(clean_entry)
                    entries[current_key] = val
                    print(f"  Parsed: {current_key}")
                except Exception as ex:
                    print(f"  FAIL {current_key}: {ex}")
                current_entry_lines = []
            m = re.search(r'"([^"]+)":\s*\{', line)
            if m:
                current_key = m.group(1)
                current_entry_lines = [line]
            continue
        if current_key:
            current_entry_lines.append(line)
    
    if current_key and current_entry_lines:
        entry_str = '\n'.join(current_entry_lines)
        clean_entry = strip_comments(entry_str)
        try:
            val = json.loads(clean_entry)
            entries[current_key] = val
            print(f"  Parsed: {current_key}")
        except Exception as ex:
            print(f"  FAIL {current_key}: {ex}")
    return entries

def write_ts_object(filepath, entries):
    """Write a dict as a TypeScript object export, preserving header."""
    with open(filepath) as f:
        content = f.read()
    idx = content.index('export const EVENTS_DATA = {')
    header = content[:idx + len('export const EVENTS_DATA = {')]
    sorted_items = sorted(entries.items(), key=lambda x: x[0])
    pairs = []
    for k, v in sorted_items:
        entry_json = json.dumps({k: v}, ensure_ascii=False, indent=2)
        inner = entry_json.strip()[1:-1].strip()
        pairs.append('  ' + inner)
    body = ',\n'.join(pairs) + ',\n'
    final = header + '\n' + body + '};\n'
    with open(filepath, 'w') as f:
        f.write(final)

def main():
    print("=== Syncing frontend data from backend JSON ===\n")

    with open(f'{BASE}/game/data/tiles.json') as f:
        be_tiles = json.load(f).get('volantis', [])
    with open(f'{BASE}/game/data/events.json') as f:
        be_events_list = json.load(f).get('events', [])
    be_events = {e['id']: e for e in be_events_list}

    tiles_path = f'{BASE}/data/source/volantis/tiles/original.ts'
    events_path = f'{BASE}/data/source/volantis/events/original.ts'
    
    # === Tiles ===
    print("Parsing existing tiles from TypeScript...")
    with open(tiles_path) as f:
        fe_tiles = parse_ts_array(f.read(), 'TILES_DATA')
    fe_tile_ids = {e['id'] for e in fe_tiles}
    print(f"  Found {len(fe_tile_ids)} frontend tiles")

    merged_tiles = {e['id']: e for e in fe_tiles}
    added_tiles = []
    updated_tiles = []
    for bt in be_tiles:
        if bt['id'] in merged_tiles:
            updated_tiles.append(bt)
        else:
            added_tiles.append(bt)
        merged_tiles[bt['id']] = bt
    
    print(f"\nAdding {len(added_tiles)} missing tiles:")
    for t in sorted(added_tiles, key=lambda x: x['id']):
        print(f"  + {t['id']}: {t.get('name', '?')}")
    print(f"\nUpdating {len(updated_tiles)} existing tiles from backend authority")
    
    write_ts_array(tiles_path, list(merged_tiles.values()))
    print(f"\n✅ Wrote {len(merged_tiles)} tiles to frontend")

    # === Events ===
    print("\nParsing existing events from TypeScript...")
    fe_events = parse_ts_object_line_by_line(events_path)
    print(f"  Found {len(fe_events)} frontend events")

    merged_events = dict(fe_events)
    added_events = [be for be in be_events_list if be['id'] not in merged_events]
    for be in added_events:
        merged_events[be['id']] = be
    
    print(f"\nAdding {len(added_events)} missing events:")
    for e in sorted(added_events, key=lambda x: x['id']):
        print(f"  + {e['id']}: {e.get('title', '?')}")
    
    write_ts_object(events_path, merged_events)
    print(f"\n✅ Wrote {len(merged_events)} events to frontend")

    print("\n" + "="*50)
    print("✅ Sync complete!")
    print(f"Now rebuild: cd {BASE} && npm run build")

if __name__ == '__main__':
    main()
