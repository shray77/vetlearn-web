#!/usr/bin/env node
/**
 * Кодмод: useStore() → индивидуальные селекторы useStore(s => s.field)
 * Меняет только блоки вида: const { a, b, c } = useStore();  (в т.ч. многострочные)
 * Не трогает: useStore(selector), переименования (a: b) — они репортятся для ручной правки.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(name)) acc.push(p);
  }
  return acc;
}

const files = walk(SRC).filter(f => !f.includes(`${path.sep}store.ts`));
const report = [];
let totalConverted = 0;

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  // Многострочный/однострочный дестрактуринг из useStore()
  const re = /const\s*\{([^{}]+)\}\s*=\s*useStore\(\)\s*;?/gs;
  let m;
  let changed = false;
  while ((m = re.exec(code)) !== null) {
    const fieldsRaw = m[1];
    if (fieldsRaw.includes(':')) {
      report.push({ file, status: 'SKIP_RENAME', snippet: fieldsRaw.trim().slice(0, 80) });
      continue;
    }
    const fields = fieldsRaw.split(',').map(s => s.trim()).filter(Boolean);
    if (fields.length === 0) continue;
    const selectorLines = fields
      .map(f => `  const ${f} = useStore((s) => s.${f});`)
      .join('\n');
    const replacement = `// Селекторы: подписка только на нужные поля (без ре-рендера от чужого стейта)\n${selectorLines}`;
    code = code.slice(0, m.index) + replacement + code.slice(m.index + m[0].length);
    re.lastIndex = m.index + replacement.length;
    changed = true;
    totalConverted += fields.length;
    report.push({ file: path.relative(SRC, file), status: 'OK', fields: fields.length });
  }
  if (changed) fs.writeFileSync(file, code);
}

// Финальная проверка: не осталось ли голых useStore()
const leftovers = [];
for (const file of walk(SRC).filter(f => !f.includes(`${path.sep}store.ts`))) {
  const code = fs.readFileSync(file, 'utf8');
  const re = /const\s*\{[^{}]+\}\s*=\s*useStore\(\)/gs;
  if (re.test(code)) leftovers.push(path.relative(SRC, file));
}

console.log('=== REPORT ===');
for (const r of report) console.log(`${r.status}  ${r.file}${r.fields ? ` (${r.fields} полей)` : ''} ${r.snippet || ''}`);
console.log('=== LEFTOVER useStore() destructures ===');
console.log(leftovers.length ? leftovers.join('\n') : '(none)');
console.log(`Converted fields total: ${totalConverted}`);
