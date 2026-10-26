// ============================================================================
// NIRBANA COLLECTION — PLATFORM E-COMMERCE & POS MULTI-KATEGORI
// File: app.js (Single Page Application State, POS Kasir & Modul Bisnis)
// ============================================================================

const App = (function() {
  // Application State
  const state = {
    catalog: {
      toko: {},
      kategori: [],
      produk: []
    },
    cart: [], // [{ id, nama, harga, qty, foto, kategori }]
    activeCategory: 'All',
    searchQuery: '',

    // POS Terminal State (Matching Reference UI)
    posCart: [],
    posFulfillment: 'Dine In',
    posQueue: [
      { id: '6836456', name: 'John Doe', time: '6 min ago', items: 4, table: 'Table 6', status: 'Ready to Serve', statusClass: 'status-pill-ready' },
      { id: '6836457', name: 'Siti Rahma', time: '12 min ago', items: 2, table: 'Take Away', status: 'In Progress', statusClass: 'status-pill-progress' },
      { id: '6836458', name: 'Agus Wijaya', time: '25 min ago', items: 1, table: 'Table 2', status: 'Completed', statusClass: 'status-pill-completed' },
      { id: '6836459', name: 'Dewi Lestari', time: '35 min ago', items: 3, table: 'Delivery', status: 'Canceled', statusClass: 'status-pill-canceled' }
    ],

    // Active Thermal Struk Data
    activeStrukData: null,
    strukTemplate: '',
    printerConfig: {
      metode: 'BROWSER',
      lebar: '58mm'
    },

    currentView: 'storefront',
    adminSubTab: 'overview'
  };

  // Inisialisasi Aplikasi Saat Halaman Dimuat
  async function init() {
    loadLocalCart();
    updateCartUI();
    await fetchCatalog();
    setupEventListeners();
    updateAuthUI();

    // Periksa URL query params (cth: ?lacak=... atau ?invoice=...)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('lacak')) {
      navigate('tracker');
      const val = urlParams.get('lacak');
      document.getElementById('track-input').value = val;
      handleTrackQuery(val);
    } else if (urlParams.has('invoice')) {
      showInvoiceFromParam(urlParams.get('invoice'));
    }

    lucide.createIcons();
  }

  // ==========================================================================
  // 1. NAVIGATION & ROUTING
  // ==========================================================================

  function navigate(viewName) {
    state.currentView = viewName;

    // Sembunyikan semua tampilan
    ['storefront', 'tracker', 'pos', 'admin'].forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.add('hidden');
      const btn = document.getElementById(`nav-btn-${v}`);
      if (btn) btn.classList.remove('active');
    });

    // Tampilkan tampilan aktif
    const targetEl = document.getElementById(`view-${viewName}`);
    if (targetEl) targetEl.classList.remove('hidden');

    const targetBtn = document.getElementById(`nav-btn-${viewName}`);
    if (targetBtn) targetBtn.classList.add('active');

    // Jika masuk ke Admin, pastikan autentikasi
    if (viewName === 'admin') {
      const user = API.getUser();
      if (!user) {
        showLoginModal();
      } else {
        loadAdminSubView(state.adminSubTab);
      }
    } else if (viewName === 'pos') {
      renderPosCatalog();
      renderPosQueue();
      renderPosCart();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    lucide.createIcons();
  }

  function setAdminSubTab(subTab) {
    state.adminSubTab = subTab;
    const tabs = ['overview', 'products', 'orders', 'crm', 'reports', 'struk', 'migration', 'settings'];

    tabs.forEach(t => {
      const el = document.getElementById(`adm-subview-${t}`);
      if (el) el.classList.add('hidden');
      const btn = document.getElementById(`adm-tab-${t}`);
      if (btn) btn.classList.remove('active');
    });

    const activeEl = document.getElementById(`adm-subview-${subTab}`);
    if (activeEl) activeEl.classList.remove('hidden');

    const activeBtn = document.getElementById(`adm-tab-${subTab}`);
    if (activeBtn) activeBtn.classList.add('active');

    loadAdminSubView(subTab);
    lucide.createIcons();
  }

  async function loadAdminSubView(subTab) {
    switch (subTab) {
      case 'overview':
        await loadAdminOverview();
        break;
      case 'products':
        await loadAdminProducts();
        break;
      case 'orders':
        await loadAdminOrders();
        break;
      case 'crm':
        await loadAdminCrm();
        break;
      case 'reports':
        await loadAdminReports();
        break;
      case 'struk':
        await loadStrukConfig();
        break;
      case 'settings':
        await loadSystemSettings();
        break;
    }
    lucide.createIcons();
  }

  // ==========================================================================
  // 2. DATA FETCHING & CATALOG RENDERING
  // ==========================================================================

  async function fetchCatalog() {
    try {
      const res = await API.call('getPublicCatalog');
      if (res.success && res.data) {
        state.catalog = res.data;
        renderCategoryChips();
        renderProductsGrid();
        renderPosCatalog();
      }
    } catch (err) {
      showToast('Gagal memuat katalog: ' + err.message, 'error');
    }
  }

  function renderCategoryChips() {
    const container = document.getElementById('category-chips-container');
    if (!container) return;

    const allCount = state.catalog.produk.length;
    let html = `
      <div class="category-chip ${state.activeCategory === 'All' ? 'active' : ''}" onclick="App.filterCategory('All')">
        <span>Semua Produk</span>
        <span class="category-count-badge">${allCount}</span>
      </div>
    `;

    (state.catalog.kategori || []).forEach(cat => {
      const count = state.catalog.produk.filter(p => p.Kategori === cat.nama).length;
      const isActive = state.activeCategory === cat.nama;
      html += `
        <div class="category-chip ${isActive ? 'active' : ''}" onclick="App.filterCategory('${cat.nama}')">
          <span>${cat.nama}</span>
          <span class="category-count-badge">${count}</span>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function filterCategory(catName) {
    state.activeCategory = catName;
    renderCategoryChips();
    renderProductsGrid();
    if (state.currentView === 'pos') renderPosCatalog();
  }

  function handleSearch(query) {
    state.searchQuery = query.toLowerCase().trim();
    renderProductsGrid();
  }

  function resetFilters() {
    state.activeCategory = 'All';
    state.searchQuery = '';
    const input = document.getElementById('storefront-search');
    if (input) input.value = '';
    renderCategoryChips();
    renderProductsGrid();
  }

  function renderProductsGrid() {
    const grid = document.getElementById('products-grid');
    const empty = document.getElementById('storefront-empty');
    if (!grid) return;

    let filtered = state.catalog.produk.filter(p => {
      const matchCat = (state.activeCategory === 'All' || p.Kategori === state.activeCategory);
      const matchSearch = (!state.searchQuery || 
        String(p.Nama).toLowerCase().includes(state.searchQuery) ||
        String(p.Deskripsi || '').toLowerCase().includes(state.searchQuery) ||
        String(p.SKU || '').toLowerCase().includes(state.searchQuery)
      );
      return matchCat && matchSearch;
    });

    if (!filtered.length) {
      grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }

    if (empty) empty.classList.add('hidden');

    grid.innerHTML = filtered.map(p => {
      const priceFmt = StrukEngine.formatRupiah(p.Harga);
      const strikeFmt = p.HargaCoret ? `<span class="text-xs text-gray-400 line-through ml-2">${StrukEngine.formatRupiah(p.HargaCoret)}</span>` : '';
      const photoUrl = p.FotoUrl || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&auto=format&fit=crop&q=80';
      const cartItem = state.cart.find(it => it.id === p.ProductID);
      const inCartQty = cartItem ? cartItem.qty : 0;

      return `
        <div class="product-card-pos">
          <div class="product-card-photo-box">
            <img src="${photoUrl}" alt="${p.Nama}" class="product-card-photo" loading="lazy">
            <span class="product-category-tag">${p.Kategori}</span>
          </div>
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h4 class="font-bold text-sm text-[#111827] line-clamp-2 leading-snug">${p.Nama}</h4>
              <p class="text-[11.5px] text-gray-500 mt-1 line-clamp-2">${p.Deskripsi || ''}</p>
            </div>
            
            <div class="mt-4 pt-3 border-t border-[#E4E3F5] flex items-center justify-between">
              <div>
                <span class="font-extrabold text-sm text-[#111827]">${priceFmt}</span>
                ${strikeFmt}
              </div>

              ${inCartQty > 0 ? `
                <div class="stepper-pill-control">
                  <button onclick="App.updateCartQty('${p.ProductID}', -1)" class="stepper-btn">-</button>
                  <span class="stepper-value">${inCartQty}</span>
                  <button onclick="App.updateCartQty('${p.ProductID}', 1)" class="stepper-btn">+</button>
                </div>
              ` : `
                <button onclick="App.addToCart('${p.ProductID}', 1)" class="btn-lime-pill !py-1.5 !px-3 text-xs !rounded-full">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i> Keranjang
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();
  }

  // ==========================================================================
  // 3. SHOPPING BAG / CART LOGIC
  // ==========================================================================

  function addToCart(productId, qty = 1) {
    const product = state.catalog.produk.find(p => p.ProductID === productId);
    if (!product) return;

    const existing = state.cart.find(it => it.id === productId);
    if (existing) {
      existing.qty += qty;
    } else {
      state.cart.push({
        id: product.ProductID,
        nama: product.Nama,
        harga: Number(product.Harga) || 0,
        qty: qty,
        foto: product.FotoUrl,
        kategori: product.Kategori
      });
    }

    saveLocalCart();
    updateCartUI();
    renderProductsGrid();
    showToast(`"${product.Nama}" ditambahkan ke keranjang`, 'success');
  }

  function updateCartQty(productId, delta) {
    const item = state.cart.find(it => it.id === productId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      state.cart = state.cart.filter(it => it.id !== productId);
    }

    saveLocalCart();
    updateCartUI();
    renderProductsGrid();
    renderCartDrawer();
  }

  function saveLocalCart() {
    localStorage.setItem('nirbana_cart', JSON.stringify(state.cart));
  }

  function loadLocalCart() {
    try {
      const saved = localStorage.getItem('nirbana_cart');
      if (saved) state.cart = JSON.parse(saved);
    } catch (e) {
      state.cart = [];
    }
  }

  function updateCartUI() {
    const totalCount = state.cart.reduce((sum, it) => sum + it.qty, 0);
    const subtotal = state.cart.reduce((sum, it) => sum + (it.qty * it.harga), 0);

    const badge = document.getElementById('header-cart-badge');
    const totalEl = document.getElementById('header-cart-total');

    if (badge) badge.innerText = totalCount;
    if (totalEl) totalEl.innerText = StrukEngine.formatRupiah(subtotal);
  }

  function toggleCartDrawer(open) {
    const drawer = document.getElementById('cart-drawer-backdrop');
    if (!drawer) return;
    if (open) {
      renderCartDrawer();
      drawer.classList.remove('hidden');
    } else {
      drawer.classList.add('hidden');
    }
    lucide.createIcons();
  }

  function renderCartDrawer() {
    const container = document.getElementById('drawer-cart-items');
    const subtotalEl = document.getElementById('drawer-cart-subtotal');
    if (!container) return;

    if (!state.cart.length) {
      container.innerHTML = `
        <div class="text-center py-16 text-gray-400">
          <i data-lucide="shopping-bag" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
          <p class="text-sm font-semibold">Keranjang Belanja Masih Kosong</p>
          <button onclick="App.toggleCartDrawer(false)" class="btn-outline-pill mt-4 text-xs">Mulai Belanja</button>
        </div>
      `;
      if (subtotalEl) subtotalEl.innerText = 'Rp 0';
      lucide.createIcons();
      return;
    }

    const subtotal = state.cart.reduce((sum, it) => sum + (it.qty * it.harga), 0);
    if (subtotalEl) subtotalEl.innerText = StrukEngine.formatRupiah(subtotal);

    container.innerHTML = state.cart.map(it => `
      <div class="flex items-center gap-3 p-3 bg-[#F8F9FE] rounded-2xl border border-[#E4E3F5]">
        <img src="${it.foto || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=200'}" class="w-14 h-14 object-cover rounded-xl bg-white">
        <div class="flex-1 min-w-0">
          <h5 class="text-xs font-bold text-gray-900 truncate">${it.nama}</h5>
          <span class="text-xs font-extrabold text-[#111827] mt-0.5 block">${StrukEngine.formatRupiah(it.harga)}</span>
          <span class="text-[10px] text-gray-400 uppercase">${it.kategori}</span>
        </div>
        <div class="stepper-pill-control">
          <button onclick="App.updateCartQty('${it.id}', -1)" class="stepper-btn">-</button>
          <span class="stepper-value">${it.qty}</span>
          <button onclick="App.updateCartQty('${it.id}', 1)" class="stepper-btn">+</button>
        </div>
      </div>
    `).join('');

    lucide.createIcons();
  }

  // ==========================================================================
  // 4. CHECKOUT & ONLINE/MANUAL PAYMENT
  // ==========================================================================

  let checkoutFulfillmentMode = 'Shipping';

  function openCheckoutModal() {
    if (!state.cart.length) {
      showToast('Keranjang masih kosong!', 'warning');
      return;
    }
    toggleCartDrawer(false);
    const subtotal = state.cart.reduce((sum, it) => sum + (it.qty * it.harga), 0);
    const grandTotalEl = document.getElementById('checkout-grand-total');
    if (grandTotalEl) grandTotalEl.innerText = StrukEngine.formatRupiah(subtotal);

    document.getElementById('checkout-modal').classList.remove('hidden');
    lucide.createIcons();
  }

  function closeCheckoutModal() {
    document.getElementById('checkout-modal').classList.add('hidden');
  }

  function setCheckoutFulfillment(mode) {
    checkoutFulfillmentMode = mode;
    ['shipping', 'pickup', 'digital'].forEach(m => {
      const btn = document.getElementById(`co-tab-${m}`);
      if (btn) {
        btn.classList.remove('bg-black', 'text-white', 'border-black');
        btn.classList.add('bg-white', 'text-gray-700', 'border-gray-200');
      }
    });
    const activeBtn = document.getElementById(`co-tab-${mode.toLowerCase()}`);
    if (activeBtn) {
      activeBtn.classList.remove('bg-white', 'text-gray-700', 'border-gray-200');
      activeBtn.classList.add('bg-black', 'text-white', 'border-black');
    }
  }

  function togglePaymentMethod(mode) {
    const container = document.getElementById('manual-transfer-container');
    if (!container) return;
    if (mode === 'MANUAL') {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
  }

  async function handleCheckoutSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById('checkout-submit-btn');
    btn.disabled = true;
    btn.innerText = 'Memproses Pesanan...';

    const name = document.getElementById('checkout-name').value;
    const phone = document.getElementById('checkout-phone').value;
    const email = document.getElementById('checkout-email').value;
    const address = document.getElementById('checkout-address').value;
    const paymentMethodEl = document.querySelector('input[name="payment-method"]:checked');
    const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'Payment Gateway';

    const subtotal = state.cart.reduce((sum, it) => sum + (it.qty * it.harga), 0);
    const shippingFee = (checkoutFulfillmentMode === 'Shipping') ? 15000 : 0;

    // Siapkan data upload bukti transfer bila ada
    let proofBase64 = '';
    let proofName = '';
    let proofType = '';

    const proofInput = document.getElementById('checkout-proof-file');
    if (paymentMethod === 'Manual Transfer' && proofInput && proofInput.files && proofInput.files[0]) {
      const file = proofInput.files[0];
      proofName = file.name;
      proofType = file.type;
      proofBase64 = await toBase64(file);
    }

    const payload = {
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      fulfillment: checkoutFulfillmentMode,
      shippingAddress: address,
      paymentMethod: paymentMethod,
      items: state.cart,
      subtotal: subtotal,
      shippingFee: shippingFee,
      pgSettled: (paymentMethod === 'Payment Gateway'), // Simulasi PG instan settled
      paymentProofBase64: proofBase64,
      paymentProofName: proofName,
      paymentProofType: proofType
    };

    try {
      const res = await API.call('createOrder', payload);
      if (res.success) {
        closeCheckoutModal();
        state.cart = [];
        saveLocalCart();
        updateCartUI();
        renderProductsGrid();

        showToast('Pesanan berhasil dibuat! Notifikasi otomatis terkirim.', 'success');
        
        // Tampilkan Struk / Invoice Resmi
        showStrukModal({
          OrderID: res.orderId,
          Tanggal: new Date().toISOString(),
          NamaPelanggan: name,
          NoHP: phone,
          MetodePembayaran: paymentMethod,
          StatusPesanan: res.status,
          Subtotal: subtotal,
          Total: subtotal + shippingFee,
          items: payload.items
        });
      } else {
        showToast('Gagal memproses pesanan: ' + res.message, 'error');
      }
    } catch (err) {
      showToast('Terjadi kesalahan: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Bayar Sekarang →';
    }
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  // ==========================================================================
  // 5. POS / KASIR TERMINAL (Inspired by Reference UI)
  // ==========================================================================

  function renderPosQueue() {
    const queueContainer = document.getElementById('pos-order-queue');
    if (!queueContainer) return;

    queueContainer.innerHTML = state.posQueue.map(order => `
      <div class="bg-white p-3.5 rounded-2xl border border-[#E4E3F5] shadow-sm flex flex-col justify-between">
        <div class="flex items-start justify-between">
          <div>
            <h4 class="text-xs font-extrabold text-[#111827]">${order.name}</h4>
            <span class="text-[10px] text-gray-400">#${order.id}</span>
          </div>
          <span class="text-[10px] text-gray-500 font-medium">${order.time}</span>
        </div>
        
        <div class="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
          <span class="text-[10.5px] font-semibold text-gray-600">${order.table} • ${order.items} items</span>
          <span class="status-pill ${order.statusClass}">${order.status}</span>
        </div>
      </div>
    `).join('');
  }

  function renderPosCatalog() {
    const chipsContainer = document.getElementById('pos-category-chips');
    const gridContainer = document.getElementById('pos-product-grid');
    if (!gridContainer) return;

    // Chips
    if (chipsContainer) {
      chipsContainer.innerHTML = `
        <button onclick="App.filterCategory('All')" class="px-3 py-1 rounded-full text-xs font-semibold ${state.activeCategory === 'All' ? 'bg-[#141619] text-white' : 'bg-white text-gray-600 border border-gray-200'}">All</button>
      ` + (state.catalog.kategori || []).map(cat => `
        <button onclick="App.filterCategory('${cat.nama}')" class="px-3 py-1 rounded-full text-xs font-semibold ${state.activeCategory === cat.nama ? 'bg-[#141619] text-white' : 'bg-white text-gray-600 border border-gray-200'}">${cat.nama}</button>
      `).join('');
    }

    // Products Grid
    let filtered = state.catalog.produk.filter(p => state.activeCategory === 'All' || p.Kategori === state.activeCategory);

    gridContainer.innerHTML = filtered.map(p => {
      const posItem = state.posCart.find(it => it.id === p.ProductID);
      const qty = posItem ? posItem.qty : 0;

      return `
        <div class="bg-white p-3 rounded-2xl border border-[#E4E3F5] flex items-center gap-3 shadow-sm hover:border-gray-400 transition">
          <img src="${p.FotoUrl || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=200'}" class="w-16 h-16 rounded-xl object-cover bg-gray-50">
          <div class="flex-1 min-w-0">
            <span class="text-[10px] text-gray-400 uppercase font-bold">${p.Kategori}</span>
            <h5 class="text-xs font-bold text-[#111827] truncate">${p.Nama}</h5>
            <span class="text-xs font-extrabold text-[#111827] block mt-0.5">${StrukEngine.formatRupiah(p.Harga)}</span>
          </div>

          <div>
            ${qty > 0 ? `
              <div class="stepper-pill-control">
                <button onclick="App.updatePosQty('${p.ProductID}', -1)" class="stepper-btn">-</button>
                <span class="stepper-value">${qty}</span>
                <button onclick="App.updatePosQty('${p.ProductID}', 1)" class="stepper-btn">+</button>
              </div>
            ` : `
              <button onclick="App.addPosItem('${p.ProductID}', 1)" class="w-8 h-8 rounded-full bg-[#141619] text-white flex items-center justify-center font-bold text-sm hover:bg-[#D2F63A] hover:text-[#141619] transition">
                +
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  function addPosItem(productId, qty = 1) {
    const product = state.catalog.produk.find(p => p.ProductID === productId);
    if (!product) return;

    const existing = state.posCart.find(it => it.id === productId);
    if (existing) {
      existing.qty += qty;
    } else {
      state.posCart.push({
        id: product.ProductID,
        nama: product.Nama,
        harga: Number(product.Harga) || 0,
        qty: qty,
        kategori: product.Kategori
      });
    }

    renderPosCart();
    renderPosCatalog();
  }

  function updatePosQty(productId, delta) {
    const item = state.posCart.find(it => it.id === productId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      state.posCart = state.posCart.filter(it => it.id !== productId);
    }

    renderPosCart();
    renderPosCatalog();
  }

  function clearPosCart() {
    state.posCart = [];
    document.getElementById('pos-customer-name').value = '';
    document.getElementById('pos-customer-phone').value = '';
    renderPosCart();
    renderPosCatalog();
  }

  function setPosFulfillment(mode) {
    state.posFulfillment = mode;
    ['dinein', 'takeaway', 'delivery'].forEach(m => {
      const b = document.getElementById(`pos-tab-${m}`);
      if (b) {
        b.classList.remove('bg-[#D8D7FE]', 'text-[#141619]');
        b.classList.add('text-gray-600');
      }
      const badge = document.getElementById(`pos-mode-badge-${m}`);
      if (badge) {
        badge.classList.remove('bg-[#141619]', 'text-white');
        badge.classList.add('text-gray-600');
      }
    });

    const key = mode.toLowerCase().replace(/\s+/g, '');
    const activeBtn = document.getElementById(`pos-tab-${key}`);
    if (activeBtn) {
      activeBtn.classList.remove('text-gray-600');
      activeBtn.classList.add('bg-[#D8D7FE]', 'text-[#141619]');
    }
    const activeBadge = document.getElementById(`pos-mode-badge-${key}`);
    if (activeBadge) {
      activeBadge.classList.remove('text-gray-600');
      activeBadge.classList.add('bg-[#141619]', 'text-white');
    }
  }

  function renderPosCart() {
    const list = document.getElementById('pos-cart-items-list');
    const countLabel = document.getElementById('pos-item-count-label');
    const subtotalEl = document.getElementById('pos-summary-subtotal');
    const totalEl = document.getElementById('pos-summary-total');

    if (!list) return;

    const totalCount = state.posCart.reduce((sum, it) => sum + it.qty, 0);
    const subtotal = state.posCart.reduce((sum, it) => sum + (it.qty * it.harga), 0);

    if (countLabel) countLabel.innerText = `${totalCount} items`;
    if (subtotalEl) subtotalEl.innerText = StrukEngine.formatRupiah(subtotal);
    if (totalEl) totalEl.innerText = StrukEngine.formatRupiah(subtotal);

    if (!state.posCart.length) {
      list.innerHTML = `
        <div class="text-center py-12 text-gray-400 text-xs">
          <i data-lucide="shopping-bag" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
          Pilih menu dari katalog di sebelah kiri
        </div>
      `;
      lucide.createIcons();
      return;
    }

    list.innerHTML = state.posCart.map(it => `
      <div class="bg-white p-3 rounded-2xl border border-[#E4E3F5] flex items-center justify-between shadow-sm">
        <div class="flex-1 min-w-0 pr-2">
          <h5 class="text-xs font-bold text-[#111827] truncate">${it.nama}</h5>
          <span class="text-xs font-extrabold text-[#111827]">${StrukEngine.formatRupiah(it.harga * it.qty)}</span>
        </div>
        <div class="stepper-pill-control">
          <button onclick="App.updatePosQty('${it.id}', -1)" class="stepper-btn">-</button>
          <span class="stepper-value">${it.qty}</span>
          <button onclick="App.updatePosQty('${it.id}', 1)" class="stepper-btn">+</button>
        </div>
        <button onclick="App.updatePosQty('${it.id}', -999)" class="ml-2 text-gray-400 hover:text-red-500">
          <i data-lucide="x-circle" class="w-4 h-4"></i>
        </button>
      </div>
    `).join('');

    lucide.createIcons();
  }

  function promptCookingRequest() {
    const req = prompt('Masukkan catatan khusus / request untuk pesanan:');
    if (req) showToast(`Catatan ditambahkan: "${req}"`, 'info');
  }

  function promptVoucherCode() {
    const code = prompt('Masukkan kode voucher:');
    if (code) showToast(`Voucher "${code}" berhasil dipasang!`, 'success');
  }

  async function submitPosOrder() {
    if (!state.posCart.length) {
      showToast('Pilih minimal 1 produk untuk membuat order kasir.', 'warning');
      return;
    }

    const name = document.getElementById('pos-customer-name').value.trim() || 'Pelanggan Kasir';
    const phone = document.getElementById('pos-customer-phone').value.trim() || '';
    const subtotal = state.posCart.reduce((sum, it) => sum + (it.qty * it.harga), 0);

    const payload = {
      customerName: name,
      customerPhone: phone,
      customerEmail: '',
      fulfillment: state.posFulfillment,
      shippingAddress: 'Transaksi Kasir POS (' + state.posFulfillment + ')',
      paymentMethod: 'Tunai Kasir',
      items: state.posCart,
      subtotal: subtotal,
      shippingFee: 0,
      pgSettled: true
    };

    try {
      const res = await API.call('createOrder', payload);
      if (res.success) {
        showToast('Pesanan Kasir berhasil diproses!', 'success');

        // Masukkan ke Order Line UI Queue
        state.posQueue.unshift({
          id: res.orderId.replace('ORD-', ''),
          name: name,
          time: 'Baru saja',
          items: state.posCart.length,
          table: state.posFulfillment,
          status: 'In Progress',
          statusClass: 'status-pill-progress'
        });

        const orderData = {
          OrderID: res.orderId,
          Tanggal: new Date().toISOString(),
          NamaPelanggan: name,
          NoHP: phone,
          MetodePembayaran: 'Tunai Kasir',
          StatusPesanan: 'Paid',
          Subtotal: subtotal,
          Total: subtotal,
          items: state.posCart
        };

        clearPosCart();
        renderPosQueue();

        // Otomatis Buka Dialog Pratinjau & Cetak Struk Thermal
        showStrukModal(orderData);
      } else {
        showToast('Gagal memproses kasir: ' + res.message, 'error');
      }
    } catch (err) {
      showToast('Error kasir: ' + err.message, 'error');
    }
  }

  // ==========================================================================
  // 6. ORDER TRACKING & LOOKUP (No-Login)
  // ==========================================================================

  async function handleTrackSubmit(event) {
    event.preventDefault();
    const input = document.getElementById('track-input').value.trim();
    if (!input) return;
    handleTrackQuery(input);
  }

  async function handleTrackQuery(query) {
    const container = document.getElementById('tracking-results-container');
    container.innerHTML = `<div class="text-center py-6 text-gray-500 text-sm">Mencari riwayat pesanan...</div>`;

    try {
      const res = await API.call('trackOrder', { kontak: query });
      if (res.success && res.data && res.data.length) {
        container.innerHTML = res.data.map(order => `
          <div class="bg-white p-5 rounded-2xl border border-[#E4E3F5] shadow-sm space-y-3">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-xs font-bold text-gray-400">#${order.orderId}</span>
                <h4 class="text-sm font-extrabold text-[#111827]">${order.nama}</h4>
              </div>
              <span class="status-pill ${getStatusPillClass(order.status)}">${order.status}</span>
            </div>

            <p class="text-xs text-gray-600">${order.itemsSummary || 'Daftar item pesanan'}</p>

            <div class="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
              <span class="font-extrabold text-sm text-[#111827]">${StrukEngine.formatRupiah(order.total)}</span>
              <div class="flex gap-2">
                <button onclick="App.viewOrderStruk('${order.orderId}')" class="btn-outline-pill !py-1.5 !px-3 text-xs">
                  <i data-lucide="printer" class="w-3.5 h-3.5"></i> Struk / Invoice
                </button>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        container.innerHTML = `
          <div class="bg-white p-8 rounded-2xl border border-[#E4E3F5] text-center text-gray-400">
            <i data-lucide="search-x" class="w-10 h-10 mx-auto mb-2 opacity-50"></i>
            <p class="text-sm font-semibold text-gray-600">Tidak Ada Riwayat Pesanan Ditemukan</p>
            <p class="text-xs text-gray-400 mt-1">Pastikan nomor WhatsApp atau Email yang Anda masukkan sesuai saat checkout.</p>
          </div>
        `;
      }
    } catch (err) {
      container.innerHTML = `<div class="text-center py-4 text-red-500 text-xs">Gagal melacak: ${err.message}</div>`;
    }
    lucide.createIcons();
  }

  function getStatusPillClass(status) {
    status = String(status || '').toLowerCase();
    if (status.includes('paid') || status.includes('ready')) return 'status-pill-ready';
    if (status.includes('progress') || status.includes('pending')) return 'status-pill-progress';
    if (status.includes('cancel')) return 'status-pill-canceled';
    return 'status-pill-completed';
  }

  // ==========================================================================
  // 7. THERMAL RECEIPT & INVOICE PREVIEW / PRINT
  // ==========================================================================

  async function showStrukModal(orderData) {
    state.activeStrukData = orderData;
    const modal = document.getElementById('struk-modal');
    const previewTarget = document.getElementById('struk-preview-target');

    // Ambil template aktif atau default
    const tpl = state.strukTemplate || `
[C][B]NIRBANA COLLECTION[/B][/C]
[C]Multi-Category Lifestyle Store[/C]
[C]{{TOKO_ALAMAT}} | WA: {{TOKO_WA}}[/C]
[-]
[LR]Nota: #{{NOTA}}||{{JAM}}[/LR]
[LR]Tgl: {{TANGGAL}}||Kasir: {{KASIR}}[/LR]
[LR]Customer: {{PELANGGAN}}||{{METODE}}[/LR]
[-]
{{#ITEM}}
[L]{{NAMA}} ({{QTY}}x)[/L]
[LR]  @ {{HARGA|rp}}||{{SUB|rp}}[/LR]
{{/ITEM}}
[-]
[LR]Subtotal:||{{SUBTOTAL|rp}}[/LR]
[LR][B]TOTAL AKHIR:[/B]||[B]{{TOTAL|rp}}[/B][/LR]
[-]
[C][BOX]STATUS: {{STATUS}}[/BOX][/C]
[-]
[C]Scan QR Verifikasi Keaslian:[/C]
[QR]{{URL_VERIFIKASI}}
[-]
[C]Terima kasih telah berbelanja![/C]
[FEED][CUT]
    `.trim();

    // Petakan ke kamus data struk
    const mapped = {
      TOKO_NAMA: state.catalog.toko.nama || CONFIG.APP_NAME,
      TOKO_ALAMAT: state.catalog.toko.alamat || 'Jl. Malioboro No. 45, Yogyakarta',
      TOKO_WA: state.catalog.toko.wa || '081234567890',
      NOTA: orderData.OrderID || 'ORD-000',
      TANGGAL: new Date(orderData.Tanggal || Date.now()).toLocaleDateString('id-ID'),
      JAM: new Date(orderData.Tanggal || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      KASIR: 'Kasir 1',
      PELANGGAN: orderData.NamaPelanggan || 'Umum',
      METODE: orderData.MetodePembayaran || 'Tunai',
      ITEM: (orderData.items || []).map(i => ({
        NAMA: i.nama || 'Item',
        QTY: i.qty || 1,
        HARGA: i.harga || 0,
        SUB: (i.qty || 1) * (i.harga || 0)
      })),
      SUBTOTAL: orderData.Subtotal || orderData.Total || 0,
      TOTAL: orderData.Total || 0,
      STATUS: (orderData.StatusPesanan === 'Paid' || orderData.StatusPesanan === 'Completed') ? 'LUNAS' : 'PENDING',
      URL_VERIFIKASI: (state.catalog.toko.appUrl || window.location.origin) + '?nota=' + orderData.OrderID
    };

    const html = StrukEngine.renderToHtml(tpl, mapped, state.printerConfig.lebar || '58mm');
    previewTarget.innerHTML = html;

    // Render QR Code di pratinjau menggunakan library qrcode-generator
    renderQrCodesInPreview();

    modal.classList.remove('hidden');
    lucide.createIcons();
  }

  function renderQrCodesInPreview() {
    const qrTargets = document.querySelectorAll('.qr-render-target');
    qrTargets.forEach(el => {
      const val = el.getAttribute('data-qr');
      if (val) {
        try {
          const qr = qrcode(0, 'M');
          qr.addData(val);
          qr.make();
          el.innerHTML = qr.createImgTag(3, 8);
        } catch (e) {
          console.warn('Gagal render QR:', e);
        }
      }
    });
  }

  function closeStrukModal() {
    document.getElementById('struk-modal').classList.add('hidden');
  }

  async function triggerPrintCurrentStruk() {
    if (!state.activeStrukData) return;
    const previewTarget = document.getElementById('struk-preview-target');
    const res = await StrukPrinter.cetak(
      state.printerConfig.metode || 'BROWSER',
      state.strukTemplate,
      state.activeStrukData,
      state.printerConfig.lebar || '58mm',
      previewTarget ? previewTarget.innerHTML : ''
    );
    showToast(res.message, res.success ? 'success' : 'error');
  }

  function shareStrukWhatsApp() {
    if (!state.activeStrukData) return;
    const text = StrukEngine.renderToWaText(state.strukTemplate, state.activeStrukData);
    const hp = state.activeStrukData.NoHP ? state.activeStrukData.NoHP.replace(/\D/g, '') : '';
    const url = `https://wa.me/${hp}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  async function viewOrderStruk(orderId) {
    try {
      const res = await API.call('getInvoice', { orderId: orderId });
      if (res.success && res.data) {
        showStrukModal(res.data);
      } else {
        showToast('Invoice tidak ditemukan.', 'error');
      }
    } catch (e) {
      showToast('Gagal memuat invoice: ' + e.message, 'error');
    }
  }

  // ==========================================================================
  // 8. ADMIN DASHBOARD & BACK-OFFICE LOGIC
  // ==========================================================================

  async function loadAdminOverview() {
    try {
      const res = await API.call('getDashboardOverview');
      if (res.success && res.data) {
        const stats = res.data.stats;
        document.getElementById('adm-kpi-sales').innerText = StrukEngine.formatRupiah(stats.totalSalesToday);
        document.getElementById('adm-kpi-orders').innerText = stats.newOrdersCount;
        document.getElementById('adm-kpi-awaiting').innerText = `${stats.awaitingPaymentCount} Menunggu Bayar`;
        document.getElementById('adm-kpi-products').innerText = stats.activeProductsCount;
        document.getElementById('adm-kpi-customers').innerText = stats.totalCustomers;

        const tbody = document.getElementById('adm-recent-orders-tbody');
        tbody.innerHTML = (res.data.recentOrders || []).map(o => `
          <tr class="hover:bg-gray-50">
            <td class="p-3 font-mono font-bold text-gray-800">#${o.orderId}</td>
            <td class="p-3 font-semibold">${o.pelanggan}</td>
            <td class="p-3 font-extrabold">${StrukEngine.formatRupiah(o.total)}</td>
            <td class="p-3 text-gray-500">${o.metode}</td>
            <td class="p-3"><span class="status-pill ${getStatusPillClass(o.status)}">${o.status}</span></td>
            <td class="p-3">
              <button onclick="App.viewOrderStruk('${o.orderId}')" class="text-xs text-[#0891B2] font-bold hover:underline">Struk</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (e) {
      showToast('Gagal memuat overview: ' + e.message, 'error');
    }
  }

  async function loadAdminProducts() {
    try {
      const res = await API.call('getProductsAdmin');
      const tbody = document.getElementById('adm-products-tbody');
      if (res.success && res.data && tbody) {
        tbody.innerHTML = res.data.map(p => `
          <tr class="hover:bg-gray-50">
            <td class="p-3">
              <img src="${p.FotoUrl || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=100'}" class="w-10 h-10 object-cover rounded-lg bg-gray-100">
            </td>
            <td class="p-3 font-semibold">
              ${p.Nama}
              <span class="block text-[10px] text-gray-400 font-mono">${p.SKU || ''}</span>
            </td>
            <td class="p-3"><span class="text-xs font-semibold px-2 py-0.5 bg-gray-100 rounded-full">${p.Kategori}</span></td>
            <td class="p-3 font-bold">${StrukEngine.formatRupiah(p.Harga)}</td>
            <td class="p-3">${p.Stok}</td>
            <td class="p-3"><span class="status-pill status-pill-ready">${p.Status}</span></td>
            <td class="p-3 text-right">
              <button onclick="App.deleteProduct('${p.ProductID}')" class="text-red-500 font-semibold hover:underline">Hapus</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (e) {
      showToast('Gagal memuat produk: ' + e.message, 'error');
    }
  }

  async function deleteProduct(pId) {
    if (!confirm('Yakin ingin menghapus produk ini?')) return;
    try {
      const res = await API.call('deleteProduct', { id: pId });
      showToast(res.message, res.success ? 'success' : 'error');
      loadAdminProducts();
      fetchCatalog();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function loadAdminOrders() {
    try {
      const res = await API.call('getOrdersAdmin');
      const tbody = document.getElementById('adm-orders-tbody');
      if (res.success && res.data && tbody) {
        tbody.innerHTML = res.data.map(o => `
          <tr class="hover:bg-gray-50">
            <td class="p-3 font-mono font-bold text-gray-800">#${o.OrderID}</td>
            <td class="p-3 text-gray-500 text-[11px]">${String(o.Tanggal || '').slice(0, 10)}</td>
            <td class="p-3 font-semibold">${o.NamaPelanggan} <span class="text-gray-400 text-[10px] block">${o.NoHP || ''}</span></td>
            <td class="p-3 text-gray-600 max-w-xs truncate">${o.ItemsSummary || ''}</td>
            <td class="p-3 font-extrabold">${StrukEngine.formatRupiah(o.Total)}</td>
            <td class="p-3"><span class="status-pill ${getStatusPillClass(o.StatusPesanan)}">${o.StatusPesanan}</span></td>
            <td class="p-3">
              ${o.BuktiBayarUrl ? `
                <a href="${o.BuktiBayarUrl}" target="_blank" class="text-xs text-[#0891B2] font-bold underline flex items-center gap-1">
                  <i data-lucide="image" class="w-3.5 h-3.5"></i> Lihat Bukti
                </a>
              ` : '<span class="text-gray-400 text-[10px]">Otomatis / Belum Ada</span>'}
            </td>
            <td class="p-3 text-right">
              ${o.StatusPesanan === 'Pending Payment' ? `
                <button onclick="App.verifyOrderPayment('${o.OrderID}', 'ACCEPT')" class="px-2 py-1 bg-green-600 text-white font-bold rounded-lg text-[10px] hover:bg-green-700 mr-1">Terima</button>
                <button onclick="App.verifyOrderPayment('${o.OrderID}', 'REJECT')" class="px-2 py-1 bg-red-600 text-white font-bold rounded-lg text-[10px] hover:bg-red-700">Tolak</button>
              ` : `
                <button onclick="App.viewOrderStruk('${o.OrderID}')" class="text-xs font-bold text-gray-700 hover:underline">Struk</button>
              `}
            </td>
          </tr>
        `).join('');
      }
    } catch (e) {
      showToast('Gagal memuat pesanan: ' + e.message, 'error');
    }
  }

  async function verifyOrderPayment(orderId, decision) {
    try {
      const res = await API.call('verifyPayment', {
        orderId: orderId,
        statusVerifikasi: decision,
        catatan: decision === 'ACCEPT' ? 'Pembayaran lunas terverifikasi' : 'Bukti transfer tidak valid'
      });
      showToast(res.message, res.success ? 'success' : 'error');
      loadAdminOrders();
    } catch (e) {
      showToast('Gagal verifikasi: ' + e.message, 'error');
    }
  }

  async function loadAdminCrm() {
    try {
      const res = await API.call('getCrmCustomers');
      const tbody = document.getElementById('adm-crm-tbody');
      if (res.success && res.data && tbody) {
        tbody.innerHTML = res.data.map(c => `
          <tr class="hover:bg-gray-50">
            <td class="p-3 font-semibold">${c.Nama}</td>
            <td class="p-3 font-mono">${c.NoWA || '-'}</td>
            <td class="p-3 text-gray-500">${c.Email || '-'}</td>
            <td class="p-3"><span class="text-xs font-bold px-2 py-0.5 rounded-full ${c.Segmen === 'VIP Spender' ? 'bg-[#D2F63A] text-black' : 'bg-gray-100 text-gray-700'}">${c.Segmen}</span></td>
            <td class="p-3 font-bold">${StrukEngine.formatRupiah(c.TotalBelanja)}</td>
            <td class="p-3">${c.JumlahOrder}x Order</td>
            <td class="p-3 text-right">
              ${c.NoWA ? `
                <a href="https://wa.me/${c.NoWA.replace(/\D/g, '')}" target="_blank" class="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-full inline-flex items-center gap-1">
                  <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> Chat
                </a>
              ` : '-'}
            </td>
          </tr>
        `).join('');
      }
    } catch (e) {
      showToast('Gagal memuat CRM: ' + e.message, 'error');
    }
  }

  function openWaBlastModal() {
    const judul = prompt('Judul Broadcast (Internal):', 'Promo Spesial Koleksi Baru');
    if (!judul) return;
    const pesan = prompt('Isi Pesan WhatsApp Broadcast:\n(Gunakan {nama} untuk memanggil nama otomatis)', 'Halo {nama}, dapatkan penawaran spesial di Nirbana Collection minggu ini!');
    if (!pesan) return;

    API.call('createWaBlast', { judul: judul, pesan: pesan, sasaran: 'ALL' }).then(res => {
      showToast(res.message, res.success ? 'success' : 'error');
    });
  }

  async function loadAdminReports() {
    const container = document.getElementById('adm-reports-content');
    try {
      const res = await API.call('getSalesReports');
      if (res.success && res.data && container) {
        const d = res.data;
        container.innerHTML = `
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="p-4 bg-gray-50 rounded-xl">
              <span class="text-xs text-gray-500 font-semibold">Total Omset Bersih</span>
              <div class="text-2xl font-extrabold text-[#111827] mt-1">${StrukEngine.formatRupiah(d.totalGross)}</div>
            </div>
            <div class="p-4 bg-gray-50 rounded-xl">
              <span class="text-xs text-gray-500 font-semibold">Total Transaksi Selesai</span>
              <div class="text-2xl font-extrabold text-[#111827] mt-1">${d.settledCount} Transaksi</div>
            </div>
            <div class="p-4 bg-gray-50 rounded-xl">
              <span class="text-xs text-gray-500 font-semibold">Rata-rata Nilai Belanja (AOV)</span>
              <div class="text-2xl font-extrabold text-[#111827] mt-1">${StrukEngine.formatRupiah(d.aov)}</div>
            </div>
          </div>
          <div class="mt-4 pt-4 border-t border-gray-100">
            <h4 class="text-xs font-bold text-gray-700 uppercase mb-2">Metode Pembayaran</h4>
            <div class="space-y-1">
              ${Object.keys(d.methods || {}).map(m => `
                <div class="flex justify-between text-xs py-1">
                  <span>${m}</span>
                  <span class="font-bold">${StrukEngine.formatRupiah(d.methods[m])}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    } catch (e) {
      if (container) container.innerHTML = `<div class="text-red-500 text-xs">Gagal: ${e.message}</div>`;
    }
  }

  async function loadStrukConfig() {
    try {
      const res = await API.call('getStrukTemplates');
      if (res.success && res.data) {
        const tpl = (res.data.templates && res.data.templates[0]) ? res.data.templates[0].IsiTemplate : '';
        document.getElementById('struk-template-textarea').value = tpl;
        state.strukTemplate = tpl;
        if (res.data.printer) {
          state.printerConfig = res.data.printer;
          document.getElementById('printer-method-select').value = res.data.printer.metode || 'BROWSER';
          document.getElementById('printer-width-select').value = res.data.printer.lebar || '58mm';
        }
      }
    } catch (e) {
      console.warn('Gagal memuat struk config:', e);
    }
  }

  async function saveStrukTemplate() {
    const tplText = document.getElementById('struk-template-textarea').value;
    const method = document.getElementById('printer-method-select').value;
    const width = document.getElementById('printer-width-select').value;

    state.strukTemplate = tplText;
    state.printerConfig.metode = method;
    state.printerConfig.lebar = width;

    try {
      const res = await API.call('saveStrukTemplate', {
        templateId: 'TPL-01',
        isiTemplate: tplText,
        lebarKertas: width,
        printerConfig: {
          metode: method,
          lebar: width,
          autoCut: true,
          jumlahSalinan: 1
        }
      });
      showToast(res.message, res.success ? 'success' : 'error');
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  async function testPrintThermal() {
    saveStrukTemplate();
    const testOrder = {
      OrderID: 'ORD-TEST-001',
      Tanggal: new Date().toISOString(),
      NamaPelanggan: 'Uji Kasir Nirbana',
      NoHP: '081234567890',
      MetodePembayaran: 'Thermal Test Print',
      StatusPesanan: 'Paid',
      Subtotal: 185000,
      Total: 185000,
      items: [
        { nama: 'Signature Linen Shirt', qty: 1, harga: 185000 }
      ]
    };
    showStrukModal(testOrder);
  }

  async function connectBluetoothPrinter() {
    try {
      const name = await StrukPrinter.connectBluetooth();
      showToast(`Terhubung ke printer Bluetooth: ${name}`, 'success');
    } catch (e) {
      showToast('Koneksi Bluetooth gagal: ' + e.message, 'error');
    }
  }

  async function runMigration(dryRun) {
    const sourceId = document.getElementById('migration-source-id').value.trim();
    const modul = document.getElementById('migration-module-select').value;
    const logBox = document.getElementById('migration-log-box');

    if (!sourceId) {
      showToast('Masukkan link atau ID Spreadsheet lama!', 'warning');
      return;
    }

    logBox.classList.remove('hidden');
    logBox.innerText = dryRun ? 'Menjalankan simulasi dry-run scan...' : 'Menjalankan eksekusi migrasi batch...';

    try {
      const res = await API.call('jalankanMigrasi', {
        sourceIdOrUrl: sourceId,
        modul: modul,
        dryRun: dryRun
      });
      logBox.innerText = res.message + '\n' + JSON.stringify(res.hasil, null, 2);
      showToast(res.message, 'success');
      if (!dryRun) {
        fetchCatalog();
      }
    } catch (e) {
      logBox.innerText = 'Gagal migrasi: ' + e.message;
      showToast(e.message, 'error');
    }
  }

  async function loadSystemSettings() {
    try {
      const res = await API.call('getSystemSettings');
      if (res.success && res.data) {
        const s = res.data;
        document.getElementById('setting-store-name').value = s.storeName || '';
        document.getElementById('setting-store-wa').value = s.storeWa || '';
        document.getElementById('setting-store-address').value = s.storeAddress || '';
        document.getElementById('setting-bank-bca').value = s.bankBcaNo || '';
        document.getElementById('setting-bank-bca-an').value = s.bankBcaAn || '';
      }
    } catch (e) {
      console.warn('Gagal memuat setting:', e);
    }
  }

  async function saveSystemSettings() {
    const payload = {
      storeName: document.getElementById('setting-store-name').value,
      storeWa: document.getElementById('setting-store-wa').value,
      storeAddress: document.getElementById('setting-store-address').value,
      bankBcaNo: document.getElementById('setting-bank-bca').value,
      bankBcaAn: document.getElementById('setting-bank-bca-an').value,
      fonnteToken: document.getElementById('setting-fonnte-token').value
    };

    try {
      const res = await API.call('saveSystemSettings', payload);
      showToast(res.message, res.success ? 'success' : 'error');
      fetchCatalog();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // ==========================================================================
  // 9. AUTHENTICATION & LOGIN LOGIC
  // ==========================================================================

  function handleAuthClick() {
    const user = API.getUser();
    if (user) {
      if (confirm(`Logout dari akun ${user.nama} (${user.role})?`)) {
        API.clearAuth();
        updateAuthUI();
        navigate('storefront');
        showToast('Anda telah logout.', 'info');
      }
    } else {
      showLoginModal();
    }
  }

  function showLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
  }

  function closeLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;

    try {
      const res = await API.call('login', { username: u, password: p });
      if (res.success && res.token) {
        API.setToken(res.token);
        API.setUser(res.user);
        closeLoginModal();
        updateAuthUI();
        showToast(`Selamat datang, ${res.user.nama}!`, 'success');
        navigate('pos');
      } else {
        showToast('Login gagal: ' + res.message, 'error');
      }
    } catch (e) {
      showToast('Error login: ' + e.message, 'error');
    }
  }

  function updateAuthUI() {
    const user = API.getUser();
    const label = document.getElementById('header-auth-label');
    const btn = document.getElementById('header-auth-btn');

    if (user && label) {
      label.innerText = `${user.nama.split(' ')[0]} (${user.role})`;
      btn.classList.add('!bg-[#D2F63A]', '!text-[#141619]', '!border-transparent');
    } else if (label) {
      label.innerText = 'Staff Login';
      btn.classList.remove('!bg-[#D2F63A]', '!text-[#141619]', '!border-transparent');
    }
  }

  // ==========================================================================
  // 10. TOAST NOTIFICATIONS & LISTENERS
  // ==========================================================================

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `p-3.5 rounded-2xl shadow-lg border text-xs font-bold pointer-events-auto transition-all transform duration-300 flex items-center gap-2.5 translate-y-4 opacity-0`;

    if (type === 'success') {
      toast.classList.add('bg-[#D2F63A]', 'text-[#141619]', 'border-[#B8E622]');
      toast.innerHTML = `<i data-lucide="check-circle-2" class="w-4 h-4"></i> <span>${message}</span>`;
    } else if (type === 'error') {
      toast.classList.add('bg-[#FEE2E2]', 'text-[#DC2626]', 'border-[#FCA5A5]');
      toast.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4"></i> <span>${message}</span>`;
    } else if (type === 'warning') {
      toast.classList.add('bg-amber-100', 'text-amber-900', 'border-amber-300');
      toast.innerHTML = `<i data-lucide="alert-triangle" class="w-4 h-4"></i> <span>${message}</span>`;
    } else {
      toast.classList.add('bg-[#D8D7FE]', 'text-[#141619]', 'border-[#C0BEF0]');
      toast.innerHTML = `<i data-lucide="info" class="w-4 h-4"></i> <span>${message}</span>`;
    }

    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function setupEventListeners() {
    window.addEventListener('nirbana:auth-expired', () => {
      updateAuthUI();
      showToast('Sesi login telah kedaluwarsa.', 'warning');
      navigate('storefront');
    });
  }

  return {
    init,
    navigate,
    setAdminSubTab,
    filterCategory,
    handleSearch,
    resetFilters,
    addToCart,
    updateCartQty,
    toggleCartDrawer,
    openCheckoutModal,
    closeCheckoutModal,
    setCheckoutFulfillment,
    togglePaymentMethod,
    handleCheckoutSubmit,
    setPosFulfillment,
    addPosItem,
    updatePosQty,
    clearPosCart,
    promptCookingRequest,
    promptVoucherCode,
    submitPosOrder,
    handleTrackSubmit,
    viewOrderStruk,
    showStrukModal,
    closeStrukModal,
    triggerPrintCurrentStruk,
    shareStrukWhatsApp,
    handleAuthClick,
    showLoginModal,
    closeLoginModal,
    handleLoginSubmit,
    deleteProduct,
    verifyOrderPayment,
    openWaBlastModal,
    saveStrukTemplate,
    testPrintThermal,
    connectBluetoothPrinter,
    runMigration,
    saveSystemSettings,
    showToast
  };
})();

// Bootstrap Aplikasi Saat DOM Siap
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
