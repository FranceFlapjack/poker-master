// Lesson text helpers, pure (no DOM): frontmatter and `key: value` fence parameters. Shared with scripts/.

export function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { meta: {}, body: md }
  const meta = {}
  let listKey = null
  for (const raw of m[1].split(/\r?\n/)) {
    const li = raw.match(/^\s+-\s+(.*)$/)
    if (li && listKey) { meta[listKey].push(li[1].trim()); continue }
    const kv = raw.match(/^([\w-]+):\s*(.*)$/)
    if (kv) {
      if (kv[2] === '') { listKey = kv[1]; meta[kv[1]] = [] }
      else { listKey = null; meta[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, '$1') }
    }
  }
  return { meta, body: md.slice(m[0].length) }
}

/** parse "key: value" lines; everything after the first blank line (or a line not matching) is `rest` */
export function parseParams(text) {
  const params = {}; const lines = text.split(/\r?\n/); let i = 0
  for (; i < lines.length; i++) {
    const kv = lines[i].match(/^([\w-]+):\s*(.*)$/)
    if (!kv) break
    params[kv[1]] = kv[2].trim()
  }
  params.rest = lines.slice(i).join('\n').trim()
  return params
}

