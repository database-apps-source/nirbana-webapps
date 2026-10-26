// ============================================================================
// NIRBANA COLLECTION — PLATFORM E-COMMERCE & POS MULTI-KATEGORI
// File: api.js (Client API Wrapper, Anti-CORS Fetch & Deduplikasi In-Flight)
// ============================================================================

const API = (function() {
  const _inflight = {};
  let _writeEpoch = 0;

  function getToken() {
    return localStorage.getItem('nirbana_token') || '';
  }

  function setToken(token) {
    if (token) localStorage.setItem('nirbana_token', token);
    else localStorage.removeItem('nirbana_token');
  }

  function getUser() {
    try {
      const u = localStorage.getItem('nirbana_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  }

  function setUser(user) {
    if (user) localStorage.setItem('nirbana_user', JSON.stringify(user));
    else localStorage.removeItem('nirbana_user');
  }

  function clearAuth() {
    localStorage.removeItem('nirbana_token');
    localStorage.removeItem('nirbana_user');
  }

  // Panggilan API Utama (Anti-CORS & Anti-Bottleneck)
  async function call(action, data = {}, forceNoCache = false) {
    const isRead = /^(get|fetch|read|ping|track|verifikasi)/i.test(action);

    if (!isRead || forceNoCache) {
      _writeEpoch++;
      return _executeRequest(action, data);
    }

    // Deduplikasi request in-flight agar pemanggilan berulang tidak membebani server
    const cacheKey = `${_writeEpoch}|${action}|${JSON.stringify(data)}`;
    if (_inflight[cacheKey]) {
      return _inflight[cacheKey];
    }

    const promise = _executeRequest(action, data);
    _inflight[cacheKey] = promise;
    promise.finally(() => {
      delete _inflight[cacheKey];
    });

    return promise;
  }

  async function _executeRequest(action, data) {
    const url = CONFIG.GAS_URL;
    const token = getToken();

    // Jika masih memakai URL demo atau offline, sediakan mock response cerdas
    if (!url || url.includes('AKfycbz_NIRBANA_COLLECTION_DEMO')) {
      return _mockResponse(action, data);
    }

    try {
      // WAJIB text/plain;charset=utf-8 untuk menghindari CORS Preflight OPTIONS di GAS!
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: action,
          data: data,
          token: token
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
      }

      const result = await res.json();
      if (!result.success && result.code === 401) {
        clearAuth();
        window.dispatchEvent(new CustomEvent('nirbana:auth-expired'));
      }
      return result;
    } catch (err) {
      console.warn(`[API Error: ${action}]`, err);
      // Fallback ke mock jika server gagal tersambung saat development
      if (CONFIG.DEMO_MODE) {
        console.info('Menggunakan respons demonstrasi offline...');
        return _mockResponse(action, data);
      }
      return {
        success: false,
        message: `Koneksi gagal: ${err.message}. Periksa jaringan atau URL Google Apps Script Anda.`
      };
    }
  }

  // Mock Database Produk untuk pengujian offline / demo
  let _mockProducts = null;
  function _getMockProducts() {
    if (!_mockProducts) {
      try {
        const saved = localStorage.getItem('nirbana_mock_products');
        if (saved) _mockProducts = JSON.parse(saved);
      } catch (e) {}
    }
    if (!_mockProducts || !_mockProducts.length) {
      _mockProducts = [
        {
          ProductID: 'PRD-01',
          Nama: 'Signature Linen Oversized Shirt',
          SKU: 'FASH-001',
          Kategori: 'Fashion',
          Harga: 185000,
          HargaCoret: 225000,
          Stok: 48,
          Deskripsi: 'Kemeja linen adem premium dengan potongan oversized modern.',
          FotoUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&auto=format&fit=crop&q=80',
          Status: 'ACTIVE'
        },
        {
          ProductID: 'PRD-02',
          Nama: '1-on-1 Branding & UI Design Consultation (1 Hr)',
          SKU: 'SERV-001',
          Kategori: 'Services',
          Harga: 350000,
          HargaCoret: 500000,
          Stok: 9999,
          Deskripsi: 'Sesi konsultasi privat via Google Meet membahas strategi branding dan desain UI.',
          FotoUrl: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=600&auto=format&fit=crop&q=80',
          Status: 'ACTIVE'
        },
        {
          ProductID: 'PRD-03',
          Nama: 'E-Commerce UI Kit & Wireframe Pack (Figma)',
          SKU: 'DIGI-001',
          Kategori: 'Digital Goods',
          Harga: 125000,
          HargaCoret: 200000,
          Stok: 9999,
          Deskripsi: 'Koleksi 50+ komponen antarmuka e-commerce dan file Figma siap pakai.',
          FotoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
          Status: 'ACTIVE'
        },
        {
          ProductID: 'PRD-04',
          Nama: 'Cold Brew Reserve Coffee 500ml',
          SKU: 'FNB-001',
          Kategori: 'FnB',
          Harga: 38000,
          HargaCoret: 45000,
          Stok: 30,
          Deskripsi: 'Kopi seduh dingin arabika premium dengan rasa manis alami cokelat dan karamel.',
          FotoUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
          Status: 'ACTIVE'
        },
        {
          ProductID: 'PRD-05',
          Nama: 'Compact 65W GaN Fast Charger',
          SKU: 'ELEC-001',
          Kategori: 'Electronics',
          Harga: 249000,
          HargaCoret: 299000,
          Stok: 15,
          Deskripsi: 'Charger cepat multi-port USB-C PD untuk smartphone, tablet, dan laptop.',
          FotoUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80',
          Status: 'ACTIVE'
        },
        {
          ProductID: 'PRD-06',
          Nama: 'Artisanal Butter Croissant (Pack of 2)',
          SKU: 'FNB-002',
          Kategori: 'FnB',
          Harga: 42000,
          HargaCoret: 50000,
          Stok: 20,
          Deskripsi: 'Croissant renyah dengan butter Prancis premium yang wangi dan lumer.',
          FotoUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
          Status: 'ACTIVE'
        }
      ];
      localStorage.setItem('nirbana_mock_products', JSON.stringify(_mockProducts));
    }
    return _mockProducts;
  }

  function _saveMockProducts(list) {
    _mockProducts = list;
    try {
      localStorage.setItem('nirbana_mock_products', JSON.stringify(list));
    } catch (e) {}
  }

  // Demo Mock Data untuk pengetesan instan tanpa perlu deploy backend lebih dahulu
  function _mockResponse(action, data) {
    return new Promise(resolve => {
      setTimeout(() => {
        const products = _getMockProducts();

        if (action === 'getPublicCatalog') {
          resolve({
            success: true,
            cached: false,
            data: {
              toko: {
                nama: CONFIG.APP_NAME,
                slogan: CONFIG.APP_SLOGAN,
                alamat: 'Jl. Malioboro No. 45, Yogyakarta',
                wa: '081234567890',
                rekening: [
                  { bank: 'BCA', noRek: '8910-1234-56', atasNama: 'Nirbana Collection' },
                  { bank: 'Mandiri', noRek: '137-00-9876543-1', atasNama: 'Nirbana Collection' }
                ],
                paymentGatewayAktif: true
              },
              kategori: [
                { id: 'KAT-01', nama: 'Fashion', deskripsi: 'Pakaian & aksesoris', urutan: 1 },
                { id: 'KAT-02', nama: 'Services', deskripsi: 'Jasa konsultasi & kreatif', urutan: 2 },
                { id: 'KAT-03', nama: 'Digital Goods', deskripsi: 'File download & template', urutan: 3 },
                { id: 'KAT-04', nama: 'FnB', deskripsi: 'Kopi & artisanal snacks', urutan: 4 },
                { id: 'KAT-05', nama: 'Electronics', deskripsi: 'Gadget & charger', urutan: 5 }
              ],
              produk: products
            }
          });
        } else if (action === 'getProductsAdmin') {
          resolve({
            success: true,
            data: products
          });
        } else if (action === 'saveProduct') {
          const pId = data.id || ('PRD-' + Math.floor(1000 + Math.random() * 9000));
          const idx = products.findIndex(p => p.ProductID === pId);
          const newProd = {
            ProductID: pId,
            Nama: data.nama || 'Produk Baru',
            SKU: data.sku || ('SKU-' + Math.floor(100 + Math.random() * 900)),
            Kategori: data.kategori || 'Fashion',
            Harga: Number(data.harga) || 0,
            HargaCoret: Number(data.hargaCoret) || 0,
            Stok: data.unlimited ? 999999 : (Number(data.stok) || 0),
            Deskripsi: data.deskripsi || '',
            FotoUrl: data.photoUrl || (data.photoBase64 ? ('data:' + (data.photoType || 'image/jpeg') + ';base64,' + data.photoBase64) : 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600'),
            Status: data.status || 'ACTIVE',
            FileUrl: data.fileUrl || '',
            DiperbaruiPada: new Date().toISOString()
          };

          if (idx > -1) {
            products[idx] = Object.assign({}, products[idx], newProd);
          } else {
            products.unshift(newProd);
          }
          _saveMockProducts(products);

          resolve({
            success: true,
            message: 'Produk berhasil disimpan ke database!',
            id: pId
          });
        } else if (action === 'deleteProduct') {
          const updated = products.filter(p => p.ProductID !== data.id);
          _saveMockProducts(updated);
          resolve({
            success: true,
            message: 'Produk berhasil dihapus dari database.'
          });
        } else if (action === 'createOrder') {
          const ordId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
          resolve({
            success: true,
            orderId: ordId,
            invoiceId: 'INV-' + ordId.replace('ORD-', ''),
            total: (data.subtotal || 0) + (data.shippingFee || 0),
            status: data.paymentMethod === 'Payment Gateway' ? 'Paid' : 'Pending Payment',
            message: 'Pesanan berhasil dibuat (Mode Simulasi Demo)!'
          });
        } else if (action === 'login') {
          if (data.username === 'owner' || data.username === 'admin@nirbana.id' || data.username === 'darurat') {
            resolve({
              success: true,
              token: 'demo.hmac.session.token.64bits',
              user: {
                email: 'owner@nirbana.id',
                nama: 'Owner Nirbana',
                role: 'OWNER',
                izin: ['*']
              }
            });
          } else {
            resolve({
              success: true,
              token: 'demo.hmac.session.token.staff',
              user: {
                email: data.username,
                nama: 'Staff Kasir 1',
                role: 'STAFF',
                izin: ['POS', 'Orders']
              }
            });
          }
        } else if (action === 'getDashboardOverview') {
          resolve({
            success: true,
            data: {
              stats: {
                totalSalesToday: 4850000,
                newOrdersCount: 28,
                awaitingPaymentCount: 6,
                activeProductsCount: 12,
                totalCustomers: 45
              },
              recentOrders: [
                { orderId: 'ORD-6836456', tanggal: new Date().toISOString(), pelanggan: 'Budi Santoso', total: 350000, status: 'Paid', metode: 'Payment Gateway' },
                { orderId: 'ORD-6836455', tanggal: new Date().toISOString(), pelanggan: 'Siti Rahma', total: 185000, status: 'Pending Payment', metode: 'Manual Transfer', buktiBayarUrl: 'https://images.unsplash.com/photo-1554415707-9e4c019ffb49?w=400' },
                { orderId: 'ORD-6836454', tanggal: new Date().toISOString(), pelanggan: 'Agus Wijaya', total: 42000, status: 'Completed', metode: 'Cash' }
              ]
            }
          });
        } else if (action === 'getOrdersAdmin') {
          resolve({
            success: true,
            data: [
              { OrderID: 'ORD-6836456', Tanggal: new Date().toISOString(), NamaPelanggan: 'Budi Santoso', NoHP: '081234567890', Total: 350000, StatusPesanan: 'Paid', MetodePembayaran: 'Payment Gateway', ItemsSummary: 'Signature Linen Shirt (1x), Cold Brew (2x)' },
              { OrderID: 'ORD-6836455', Tanggal: new Date().toISOString(), NamaPelanggan: 'Siti Rahma', NoHP: '081987654321', Total: 185000, StatusPesanan: 'Pending Payment', MetodePembayaran: 'Manual Transfer', ItemsSummary: 'Signature Linen Shirt (1x)', BuktiBayarUrl: 'https://images.unsplash.com/photo-1554415707-9e4c019ffb49?w=400' },
              { OrderID: 'ORD-6836454', Tanggal: new Date().toISOString(), NamaPelanggan: 'Agus Wijaya', NoHP: '085712345678', Total: 42000, StatusPesanan: 'Completed', MetodePembayaran: 'Tunai Kasir', ItemsSummary: 'Artisanal Croissant (1x)' },
              { OrderID: 'ORD-6836453', Tanggal: new Date().toISOString(), NamaPelanggan: 'Dewi Lestari', NoHP: '082199887766', Total: 249000, StatusPesanan: 'Paid', MetodePembayaran: 'Payment Gateway', ItemsSummary: 'Compact 65W GaN Charger (1x)' }
            ]
          });
        } else if (action === 'getCrmCustomers') {
          resolve({
            success: true,
            data: [
              { KontakID: 'KTK-001', Nama: 'Budi Santoso', NoWA: '081234567890', Email: 'budi@example.com', Segmen: 'VIP Spender', TotalBelanja: 1890000, JumlahOrder: 6, TerakhirBelanja: new Date().toISOString() },
              { KontakID: 'KTK-002', Nama: 'Siti Rahma', NoWA: '081987654321', Email: 'siti@example.com', Segmen: 'Pelanggan Setia', TotalBelanja: 620000, JumlahOrder: 3, TerakhirBelanja: new Date().toISOString() },
              { KontakID: 'KTK-003', Nama: 'Agus Wijaya', NoWA: '085712345678', Email: 'agus@example.com', Segmen: 'Pelanggan Baru', TotalBelanja: 42000, JumlahOrder: 1, TerakhirBelanja: new Date().toISOString() }
            ]
          });
        } else {
          resolve({
            success: true,
            message: `Aksi '${action}' selesai diproses dalam mode demo.`,
            data: {}
          });
        }
      }, 250);
    });
  }

  return {
    call,
    getToken,
    setToken,
    getUser,
    setUser,
    clearAuth
  };
})();
