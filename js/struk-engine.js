// ============================================================================
// NIRBANA COLLECTION — PLATFORM E-COMMERCE & POS MULTI-KATEGORI
// File: struk-engine.js (Mesin Parser Direktif Struk Thermal 58mm/80mm)
// ============================================================================

const StrukEngine = (function() {
  // Format mata uang rupiah
  function formatRupiah(num) {
    const n = Number(num) || 0;
    return 'Rp ' + n.toLocaleString('id-ID');
  }

  // Terapkan filter modifier pada variabel
  function applyModifier(val, mod) {
    if (!mod) return val;
    const parts = mod.split(':');
    const type = parts[0].toLowerCase();
    switch (type) {
      case 'rp':
        return formatRupiah(val);
      case 'angka':
        return Number(val || 0).toLocaleString('id-ID');
      case 'kapital':
        return String(val || '').toUpperCase();
      case 'kecil':
        return String(val || '').toLowerCase();
      default:
        return val;
    }
  }

  // Interpolasi variabel {{KUNCI|modifier}}
  function interpolateVars(templateStr, data) {
    return templateStr.replace(/\{\{([A-Za-z0-9_]+)(\|[^}]+)?\}\}/g, function(_, key, mod) {
      let val = data[key];
      if (val === undefined || val === null) val = '';
      if (mod) val = applyModifier(val, mod.slice(1));
      return val;
    });
  }

  // Render template direktif menjadi daftar baris siap olah
  function parseToLines(templateStr, data, paperWidth = '58mm') {
    const cols = (paperWidth === '80mm') ? 48 : 32;
    let text = templateStr;

    // 1. Tangani Kondisional {{?KUNCI}} ... {{/KUNCI}}
    text = text.replace(/\{\{\?([A-Za-z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, function(_, key, content) {
      return (data[key] && data[key] !== '0' && data[key] !== 0) ? content : '';
    });

    // 2. Tangani Perulangan Item {{#ITEM}} ... {{/ITEM}}
    text = text.replace(/\{\{#ITEM\}\}([\s\S]*?)\{\{\/ITEM\}\}/g, function(_, itemTpl) {
      const items = data.ITEM || [];
      return items.map(it => interpolateVars(itemTpl, it)).join('\n');
    });

    // 3. Tangani Variabel Global
    text = interpolateVars(text, data);

    const rawLines = text.split(/\r?\n/);
    const parsedLines = [];

    rawLines.forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('//')) return;

      if (line === '[-]') {
        parsedLines.push({ type: 'DIVIDER', char: '-', text: '-'.repeat(cols) });
      } else if (line === '[=]') {
        parsedLines.push({ type: 'DIVIDER', char: '=', text: '='.repeat(cols) });
      } else if (line.startsWith('[LR]')) {
        const lrContent = line.slice(4).replace(/\[\/LR\]$/, '');
        const parts = lrContent.split('||');
        const left = parts[0] || '';
        const right = parts[1] || '';
        parsedLines.push({ type: 'LR', left, right, cols });
      } else if (line.startsWith('[C]')) {
        let content = line.slice(3).replace(/\[\/C\]$/, '');
        let isBold = false;
        let isBox = false;
        if (content.includes('[B]')) {
          isBold = true;
          content = content.replace(/\[\/?B\]/g, '');
        }
        if (content.includes('[BOX]')) {
          isBox = true;
          content = content.replace(/\[\/?BOX\]/g, '');
        }
        parsedLines.push({ type: 'CENTER', text: content, isBold, isBox });
      } else if (line.startsWith('[R]')) {
        let content = line.slice(3).replace(/\[\/R\]$/, '');
        parsedLines.push({ type: 'RIGHT', text: content });
      } else if (line.startsWith('[QR]')) {
        const qrValue = line.slice(4).replace(/\[\/QR\]$/, '').trim();
        parsedLines.push({ type: 'QR', value: qrValue || data.URL_VERIFIKASI || '' });
      } else if (line.startsWith('[BAR]')) {
        const barValue = line.slice(5).replace(/\[\/BAR\]$/, '').trim();
        parsedLines.push({ type: 'BARCODE', value: barValue || data.NOTA || '' });
      } else if (line === '[FEED]' || line === '[CUT]') {
        parsedLines.push({ type: 'CONTROL', cmd: line });
      } else {
        parsedLines.push({ type: 'LEFT', text: line });
      }
    });

    return parsedLines;
  }

  // Render ke HTML Pratinjau Struk (Thermal 58mm / 80mm)
  function renderToHtml(templateStr, data, paperWidth = '58mm') {
    const lines = parseToLines(templateStr, data, paperWidth);
    let html = `<div class="thermal-receipt paper-${paperWidth}">`;

    lines.forEach(l => {
      switch (l.type) {
        case 'DIVIDER':
          html += `<div class="receipt-divider">${l.text}</div>`;
          break;
        case 'LR':
          html += `<div class="receipt-lr"><span class="receipt-left">${l.left}</span><span class="receipt-right">${l.right}</span></div>`;
          break;
        case 'CENTER':
          if (l.isBox) {
            html += `<div class="receipt-center"><span class="receipt-box">${l.text}</span></div>`;
          } else if (l.isBold) {
            html += `<div class="receipt-center font-bold">${l.text}</div>`;
          } else {
            html += `<div class="receipt-center">${l.text}</div>`;
          }
          break;
        case 'RIGHT':
          html += `<div class="receipt-right-align">${l.text}</div>`;
          break;
        case 'LEFT':
          html += `<div class="receipt-left-align">${l.text}</div>`;
          break;
        case 'QR':
          if (l.value) {
            html += `<div class="receipt-qr"><div id="qr-code-box-${Math.floor(Math.random()*10000)}" data-qr="${l.value}" class="qr-render-target"></div><div class="text-[10px] text-gray-500 mt-1">${l.value}</div></div>`;
          }
          break;
        case 'CONTROL':
          // Feed/Cut space
          html += `<div class="receipt-feed"></div>`;
          break;
      }
    });

    html += `</div>`;
    return html;
  }

  // Render ke Teks Format WhatsApp (Bisa di-copy/dikirim langsung ke WA)
  function renderToWaText(templateStr, data) {
    const lines = parseToLines(templateStr, data, '58mm');
    let wa = '';
    lines.forEach(l => {
      if (l.type === 'DIVIDER') wa += '--------------------------------\n';
      else if (l.type === 'LR') wa += `${l.left} : ${l.right}\n`;
      else if (l.type === 'CENTER') wa += l.isBold ? `*${l.text}*\n` : `${l.text}\n`;
      else if (l.type === 'QR' && l.value) wa += `Link Verifikasi: ${l.value}\n`;
      else if (l.text) wa += `${l.text}\n`;
    });
    return wa;
  }

  // Render ke byte buffer ESC/POS untuk thermal printer
  function renderToEscPosBytes(templateStr, data, paperWidth = '58mm') {
    const lines = parseToLines(templateStr, data, paperWidth);
    const bytes = [];

    // ESC @: Inisialisasi printer
    bytes.push(0x1B, 0x40);

    lines.forEach(l => {
      if (l.type === 'DIVIDER') {
        _appendEscPosText(bytes, l.text + '\n');
      } else if (l.type === 'LR') {
        const cols = (paperWidth === '80mm') ? 48 : 32;
        const totalLen = l.left.length + l.right.length;
        let lineStr = '';
        if (totalLen < cols) {
          lineStr = l.left + ' '.repeat(cols - totalLen) + l.right;
        } else {
          lineStr = l.left + '\n  ' + l.right;
        }
        _appendEscPosText(bytes, lineStr + '\n');
      } else if (l.type === 'CENTER') {
        // Set Center: ESC a 1
        bytes.push(0x1B, 0x61, 0x01);
        if (l.isBold) bytes.push(0x1B, 0x45, 0x01); // Bold ON
        _appendEscPosText(bytes, l.text + '\n');
        if (l.isBold) bytes.push(0x1B, 0x45, 0x00); // Bold OFF
        bytes.push(0x1B, 0x61, 0x00); // Reset Left: ESC a 0
      } else if (l.type === 'LEFT') {
        bytes.push(0x1B, 0x61, 0x00);
        _appendEscPosText(bytes, l.text + '\n');
      } else if (l.type === 'RIGHT') {
        bytes.push(0x1B, 0x61, 0x02);
        _appendEscPosText(bytes, l.text + '\n');
        bytes.push(0x1B, 0x61, 0x00);
      } else if (l.type === 'CONTROL' && l.cmd === '[CUT]') {
        // Feed 3 baris lalu GS V 66 0 (Paper Cut)
        bytes.push(0x1B, 0x64, 0x03);
        bytes.push(0x1D, 0x56, 0x42, 0x00);
      }
    });

    // Feed tambahan
    bytes.push(0x0A, 0x0A);
    return new Uint8Array(bytes);
  }

  function _appendEscPosText(bytesArr, str) {
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      bytesArr.push(code < 128 ? code : 63); // ASCII atau '?'
    }
  }

  return {
    formatRupiah,
    parseToLines,
    renderToHtml,
    renderToWaText,
    renderToEscPosBytes
  };
})();
