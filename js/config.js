// ============================================================================
// NIRBANA COLLECTION — PLATFORM E-COMMERCE & POS MULTI-KATEGORI
// File: config.js (Konfigurasi Frontend & Endpoint Backend)
// ============================================================================

const CONFIG = {
  // Ganti URL berikut dengan Web App URL dari Deployment Google Apps Script Anda:
  // Contoh: 'https://script.google.com/macros/s/AKfycbx.../exec'
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzgcT45k5xt0Sl65F2uZkAGqzG1jUTKWEYzCe_JXlU0p9FBm1t4N4wj-hSugjYdpQJZaA/exec',

  APP_NAME: 'NIRBANA COLLECTION',
  APP_SLOGAN: 'Lifestyle, Fashion, Services & Digital Goods',
  APP_VERSION: '2.1.0',

  // Mode Demo Offline jika GAS_URL belum diatur/saat offline testing
  DEMO_MODE: true,

  // Default Struk Printer Settings
  PRINTER: {
    DEFAULT_WIDTH: '58mm', // '58mm' atau '80mm'
    DEFAULT_METHOD: 'BROWSER', // 'BLUETOOTH', 'RAWBT', atau 'BROWSER'
    COPIES: 1,
    AUTO_CUT: true
  }
};
