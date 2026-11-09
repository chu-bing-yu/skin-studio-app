/** SSE 增量解析：OpenAI 兼容的 chat/completions 流 */
export function createSseParser(onDelta) {
  let buffer = '';

  function handleLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.indexOf('data:') !== 0) return;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    let json;
    try { json = JSON.parse(payload); } catch (err) { return; }
    const choice = json.choices && json.choices[0];
    const delta = choice && (choice.delta || choice.message);
    const text = delta && (delta.content || '');
    if (text) onDelta(text);
    if (json.usage) onDelta('', json.usage);
  }

  return {
    push(chunk) {
      buffer += chunk;
      const parts = buffer.split('\n');
      buffer = parts.pop() || '';
      parts.forEach(handleLine);
    },
    flush() {
      if (buffer) {
        handleLine(buffer);
        buffer = '';
      }
    }
  };
}

/** 读取 fetch 的 body 流 */
export async function readStream(response, onDelta) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    const text = await response.text();
    return { text: text, usage: null };
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let full = '';
  let usage = null;
  const parser = createSseParser(function (delta, u) {
    if (u) usage = u;
    if (delta) {
      full += delta;
      onDelta(delta);
    }
  });

  /* 逐块读；遇到 \r\n 归一化交给 parser */
  for (;;) {
    const step = await reader.read();
    if (step.done) break;
    parser.push(decoder.decode(step.value, { stream: true }).replace(/\r\n/g, '\n'));
  }
  parser.push(decoder.decode());
  parser.flush();
  return { text: full, usage: usage };
}
