'use strict';
(async () => {
  const status = document.getElementById('status');
  const hint = document.getElementById('hint');
  const encodedKey = new URLSearchParams(location.hash.slice(1)).get('k');
  if (!encodedKey) return;
  if (!/^[A-Za-z0-9_-]{43}$/.test(encodedKey)) {
    status.textContent = 'Кажется, ссылка неполная или неверная.';
    hint.textContent = 'Попроси отправить её ещё раз ♡';
    return;
  }
  if (!crypto.subtle || typeof DecompressionStream === 'undefined') {
    status.textContent = 'Для открытия нужен современный браузер.';
    hint.textContent = 'Попробуй открыть ссылку в обновлённом Safari, Chrome или Edge.';
    return;
  }
  status.textContent = 'Открываем твоё приглашение…';
  hint.textContent = 'Ещё мгновение ♡';
  try {
    const keyBytes = Uint8Array.from(atob(encodedKey.replaceAll('-', '+').replaceAll('_', '/') + '='), c => c.charCodeAt(0));
    if (keyBytes.length !== 32) throw new Error('Invalid link');
    const key = await crypto.subtle.importKey('raw', keyBytes, {name:'AES-GCM'}, false, ['decrypt']);
    const response = await fetch('invitation.bin', {cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer'});
    if (!response.ok) throw new Error('Download failed');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 33 || new TextDecoder().decode(bytes.slice(0,4)) !== 'CFE1') throw new Error('Invalid file');
    const plain = await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(4,16),additionalData:new TextEncoder().encode('private-invitation:v1:gzip'),tagLength:128},key,bytes.slice(16));
    const html = await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    if (!/^<!doctype html>/i.test(html.trimStart())) throw new Error('Invalid invitation');
    const frame = document.createElement('iframe');
    frame.title = 'Твоё приглашение';
    frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    frame.setAttribute('id','invitation');
    frame.hidden = true;
    frame.addEventListener('load', () => {
      document.getElementById('gate').hidden = true;
      frame.hidden = false;
      document.title = frame.contentDocument?.title || 'Твоё приглашение';
    }, {once:true});
    frame.srcdoc = html;
    document.body.append(frame);
  } catch {
    status.textContent = 'Не получилось открыть приглашение.';
    hint.textContent = 'Проверь, что ссылка скопирована целиком, или попроси отправить её ещё раз ♡';
  }
})();
window.addEventListener('hashchange', () => location.reload());
