import { $, escapeHtml } from './html.js';

export function highlightCode(code) {
  return code.split('\n').map(line => {
    const commentStart = line.indexOf('//');
    const source = commentStart >= 0 ? line.slice(0, commentStart) : line;
    const comment = commentStart >= 0 ? line.slice(commentStart) : '';
    const tokens = escapeHtml(source).replace(
      /(&quot;.*?&quot;)|\b(\d+(?:\.\d+)?)\b|\b(const|let|new|Math)\b|\b(position|rotation|fov|lookAt|order)\b/g,
      (match, str, num, kw, prop) => {
        if (str) return `<span class="tk-str">${str}</span>`;
        if (num) return `<span class="tk-num">${num}</span>`;
        if (kw) return `<span class="tk-kw">${kw}</span>`;
        return `<span class="tk-prop">${prop}</span>`;
      },
    );
    return tokens + (comment ? `<span class="tk-com">${escapeHtml(comment)}</span>` : '');
  }).join('\n');
}

export function showCode(entry) {
  if (!entry) {
    $('code-title').textContent = 'escolha um movimento';
    $('code-body').innerHTML = `<span class="tk-com">${escapeHtml('// aperte um botão de movimento e o código aparece aqui')}</span>`;
    return;
  }
  $('code-title').textContent = entry.label;
  const noteLines = entry.notes.map(note => `// ${note}`).join('\n');
  $('code-body').innerHTML = highlightCode(`${noteLines}\n${entry.code}`);
}
