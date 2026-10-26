// ============================================================================
// NIRBANA COLLECTION — PLATFORM E-COMMERCE & POS MULTI-KATEGORI
// File: struk-printer.js (Driver Printer Thermal Bluetooth, RawBT & Browser)
// ============================================================================

const StrukPrinter = (function() {
  let _bluetoothDevice = null;
  let _characteristic = null;

  // Cek apakah browser mendukung Web Bluetooth
  function isBluetoothSupported() {
    return !!(navigator.bluetooth && navigator.bluetooth.requestDevice);
  }

  // Koneksi ke Thermal Printer via Web Bluetooth
  async function connectBluetooth() {
    if (!isBluetoothSupported()) {
      throw new Error('Browser ini tidak mendukung Web Bluetooth. Gunakan Chrome/Edge di Android atau Komputer.');
    }

    try {
      _bluetoothDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Service
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'
        ]
      });

      const server = await _bluetoothDevice.gatt.connect();
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            _characteristic = char;
            break;
          }
        }
        if (_characteristic) break;
      }

      if (!_characteristic) {
        throw new Error('Karakteristik cetak printer tidak ditemukan pada perangkat Bluetooth ini.');
      }

      return _bluetoothDevice.name || 'Printer Bluetooth Terhubung';
    } catch (err) {
      _bluetoothDevice = null;
      _characteristic = null;
      throw err;
    }
  }

  // Cetak langsung via Web Bluetooth ESC/POS
  async function printBluetooth(escPosBytes) {
    if (!_characteristic || !_bluetoothDevice || !_bluetoothDevice.gatt.connected) {
      await connectBluetooth();
    }

    // Kirim data secara bertahap per 512 bytes (chunking aman Bluetooth)
    const CHUNK_SIZE = 512;
    for (let i = 0; i < escPosBytes.length; i += CHUNK_SIZE) {
      const chunk = escPosBytes.slice(i, i + CHUNK_SIZE);
      if (_characteristic.writeValueWithResponse) {
        await _characteristic.writeValueWithResponse(chunk);
      } else {
        await _characteristic.writeValue(chunk);
      }
    }
    return true;
  }

  // Cetak via Aplikasi Android RawBT Intent
  function printRawBT(escPosBytes) {
    let binary = '';
    const len = escPosBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(escPosBytes[i]);
    }
    const base64 = window.btoa(binary);
    window.location.href = 'rawbt:data:base64,' + base64;
    return true;
  }

  // Cetak via Dialog Browser Standar (Universal USB / LAN Printer)
  function printBrowser(htmlContent) {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Struk Nirbana</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body { font-family: monospace; font-size: 11px; margin: 0; padding: 4mm; color: #000; }
          .thermal-receipt { width: 100%; max-width: 58mm; }
          .receipt-divider { text-align: center; overflow: hidden; margin: 3px 0; font-size: 10px; }
          .receipt-lr { display: flex; justify-content: space-between; margin: 2px 0; }
          .receipt-center { text-align: center; margin: 2px 0; }
          .receipt-box { border: 1px solid #000; padding: 2px 6px; font-weight: bold; }
          .font-bold { font-weight: bold; }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.frameElement.remove(); }, 1500);
          };
        <\/script>
      </body>
      </html>
    `);
    doc.close();
  }

  // Dispatcher Utama Cetak Berdasarkan Metode
  async function cetak(metode, templateStr, data, paperWidth = '58mm', htmlPreview = '') {
    const escBytes = StrukEngine.renderToEscPosBytes(templateStr, data, paperWidth);

    if (metode === 'BLUETOOTH') {
      try {
        await printBluetooth(escBytes);
        return { success: true, message: 'Struk berhasil dikirim ke printer Bluetooth!' };
      } catch (err) {
        console.warn('Bluetooth print gagal, beralih ke dialog cetak browser:', err);
        printBrowser(htmlPreview || StrukEngine.renderToHtml(templateStr, data, paperWidth));
        return { success: true, message: 'Membuka dialog cetak browser (Fallback).' };
      }
    } else if (metode === 'RAWBT') {
      printRawBT(escBytes);
      return { success: true, message: 'Perintah cetak dikirim ke aplikasi RawBT.' };
    } else {
      printBrowser(htmlPreview || StrukEngine.renderToHtml(templateStr, data, paperWidth));
      return { success: true, message: 'Dialog cetak printer dibuka.' };
    }
  }

  return {
    isBluetoothSupported,
    connectBluetooth,
    printBluetooth,
    printRawBT,
    printBrowser,
    cetak
  };
})();
