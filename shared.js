/* DIMONTI STORE - SHARED JS (fixed) */
document.addEventListener('DOMContentLoaded', function () {
  // WhatsApp en formato E.164
  const DIMONTI_WA = '573016593662';

  /* ================= MENÚ MÓVIL ================= */
  const hamburgerBtn = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const closeMenuBtn = document.querySelector('.close-menu');
  if (hamburgerBtn && mobileMenu && closeMenuBtn) {
    hamburgerBtn.addEventListener('click', () => mobileMenu.classList.add('active'));
    closeMenuBtn.addEventListener('click', () => mobileMenu.classList.remove('active'));
  }

  /* ================= CARRITO ================= */
  const openCartTriggers = document.querySelectorAll('.js-open-cart');
  const closeCartTriggers = document.querySelectorAll('.js-close-cart');
  const cartOverlay = document.querySelector('.cart-overlay');
  const sideCart = document.querySelector('.side-cart');

  function formatCurrency(v) { return `$${Number(v).toLocaleString('es-CO')}`; }

  window.openCart = function () {
    renderCart();
    cartOverlay && cartOverlay.classList.add('active');
    sideCart && sideCart.classList.add('active');
  };
  window.closeCart = function () {
    cartOverlay && cartOverlay.classList.remove('active');
    sideCart && sideCart.classList.remove('active');
  };

  openCartTriggers.forEach(b => b.addEventListener('click', e => { e.preventDefault(); window.openCart(); }));
  closeCartTriggers.forEach(b => b.addEventListener('click', window.closeCart));
  cartOverlay && cartOverlay.addEventListener('click', window.closeCart);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && sideCart && sideCart.classList.contains('active')) window.closeCart(); });

  function renderCart() {
    if (!sideCart) return;
    const body = sideCart.querySelector('.side-cart-body');
    const foot = sideCart.querySelector('.side-cart-footer');
    const cart = JSON.parse(localStorage.getItem('dimontiCart') || '[]');
    if (!body || !foot) return;
    body.innerHTML = '';
    foot.innerHTML = '';
    if (!cart.length) { body.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío.</p>'; return; }
    let subtotal = 0;
    cart.forEach(it => {
      subtotal += it.price * it.quantity;
      body.innerHTML += [
        '<div class="cart-item" data-item-id="', it.id, '">',
          '<div class="cart-item-image"><img src="', it.image, '" alt="', it.name, '"></div>',
          '<div class="cart-item-details">',
            '<p class="item-name">', it.name, '</p>',
            '<p class="item-meta">Color: ', it.color, ' / Talla: ', it.size, '</p>',
            '<p class="item-price">', formatCurrency(it.price), '</p>',
            '<div class="quantity-selector">',
              '<button class="quantity-btn decrease-qty" data-id="', it.id, '" aria-label="Disminuir">-</button>',
              '<input type="number" value="', it.quantity, '" min="1" readonly>',
              '<button class="quantity-btn increase-qty" data-id="', it.id, '" aria-label="Aumentar">+</button>',
            '</div>',
          '</div>',
          '<div class="cart-item-actions">',
            '<button class="remove-item-btn" data-id="', it.id, '" title="Eliminar" aria-label="Eliminar del carrito">',
              '<i class="fas fa-trash-alt"></i>',
            '</button>',
          '</div>',
        '</div>'
      ].join('');
    });
    foot.innerHTML = [
      '<div class="summary-row"><span>Subtotal:</span><span id="cart-subtotal">', formatCurrency(subtotal), '</span></div>',
      '<button class="checkout-btn">Finalizar Pedido</button>'
    ].join('');
  }

  function updateCartItem(id, qty) {
    const cart = JSON.parse(localStorage.getItem('dimontiCart') || '[]');
    const i = cart.findIndex(x => x.id === id);
    if (i > -1) {
      if (qty <= 0) cart.splice(i, 1);
      else cart[i].quantity = qty;
      localStorage.setItem('dimontiCart', JSON.stringify(cart));
      renderCart(); window.updateCartIcon();
    }
  }

  sideCart && sideCart.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.dataset.id) {
      const id = btn.dataset.id;
      const cart = JSON.parse(localStorage.getItem('dimontiCart') || '[]');
      const it = cart.find(x => x.id === id);
      if (!it) return;
      if (btn.classList.contains('increase-qty')) updateCartItem(id, it.quantity + 1);
      else if (btn.classList.contains('decrease-qty')) updateCartItem(id, it.quantity - 1);
      else if (btn.classList.contains('remove-item-btn')) updateCartItem(id, 0);
    }
    if (btn && btn.classList.contains('checkout-btn')) {
      const cart = JSON.parse(localStorage.getItem('dimontiCart') || '[]');
      if (!cart.length) { alert('Tu carrito está vacío.'); return; }
      createPaymentModal();
    }
  });

  window.updateCartIcon = function () {
    const cart = JSON.parse(localStorage.getItem('dimontiCart') || '[]');
    const n = cart.reduce((s, i) => s + i.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => el.textContent = n);
  };
  window.updateCartIcon();

  /* ================= CHECKOUT ================= */
  function waLink(phone, text) { return 'https://wa.me/' + encodeURIComponent(phone) + '?text=' + encodeURIComponent(text); }
  function genOrderId() { return 'DIM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase(); }
  function collectBillingData(root = document) {
    const g = s => (root.querySelector(s) && root.querySelector(s).value || '').trim();
    return {
      nombre: g('#recipient-name'), apellidos: g('#recipient-lastname'), pais: g('#billing-country') || 'Colombia', cc: g('#billing-id'),
      direccion: g('#shipping-address'), direccion2: g('#shipping-address-2'), ciudad: g('#billing-city'), departamento: g('#billing-state'),
      postal: g('#billing-postcode'), telefono: g('#billing-phone'), email: g('#billing-email'), notas: g('#order-notes')
    };
  }
  function buildTicket({ orderId, cart, totales, metodo, facturacion }) {
    const L = [];
    L.push('¡Hola Dimonti Store! 👋', '', '*ORDER ID:* ' + orderId, '', '*DATOS DE FACTURACIÓN*');
    if (facturacion.nombre) L.push('- *Nombre:* ' + facturacion.nombre);
    if (facturacion.apellidos) L.push('- *Apellidos:* ' + facturacion.apellidos);
    if (facturacion.cc) L.push('- *CC/Pasaporte:* ' + facturacion.cc);
    if (facturacion.pais) L.push('- *País/Región:* ' + facturacion.pais);
    if (facturacion.direccion) L.push('- *Dirección:* ' + facturacion.direccion);
    if (facturacion.direccion2) L.push('- *Apto/Det:* ' + facturacion.direccion2);
    if (facturacion.ciudad) L.push('- *Ciudad:* ' + facturacion.ciudad);
    if (facturacion.departamento) L.push('- *Depto:* ' + facturacion.departamento);
    if (facturacion.postal) L.push('- *C.P.:* ' + facturacion.postal);
    if (facturacion.telefono) L.push('- *Tel.:* ' + facturacion.telefono);
    if (facturacion.email) L.push('- *Email:* ' + facturacion.email);
    if (facturacion.notas) { L.push('', '*Notas del pedido:* ' + facturacion.notas); }
    L.push('', '*RESUMEN DE PEDIDO*');
    cart.forEach(it => L.push('- *' + it.quantity + 'x* ' + it.name + ' (Color: ' + it.color + ', Talla: ' + it.size + ')'));
    if (totales.subtotal) L.push('\n*Subtotal:* ' + totales.subtotal);
    if (totales.envio) L.push('*Envío:* ' + totales.envio);
    if (totales.total) L.push('*Total:* ' + totales.total);
    L.push('', '*Método de Pago:* ' + metodo);
    return L.join('\n');
  }

  function createPaymentModal() {
    const old = document.querySelector('.payment-modal-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'payment-modal-overlay payment-fullscreen';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = [
      '<div class="payment-modal-content">',
        '<div class="pmc-header">',
          '<button class="close-btn" aria-label="Cerrar">&times;</button>',
          '<div class="modal-progress-bar">',
            '<div class="progress-header"><h4 id="current-step-title">Datos y Resumen</h4></div>',
            '<div class="progress-line-container"><div class="progress-line-active"></div></div>',
          '</div>',
        '</div>',
        '<div class="modal-views-container">',
          '<section class="modal-view active" id="view-1">',
            '<div class="two-col">',
              '<div class="col form-col">',
                '<div class="form-grid">',
                  '<input type="text" id="recipient-name" placeholder="Nombre *" required>',
                  '<input type="text" id="recipient-lastname" placeholder="Apellidos *" required>',
                  '<select id="billing-country" required><option value="Colombia" selected>Colombia</option></select>',
                  '<input type="text" id="billing-id" placeholder="CC / Pasaporte *" required>',
                  '<input type="text" id="shipping-address" placeholder="Dirección de la calle *" required>',
                  '<input type="text" id="shipping-address-2" placeholder="Apartamento, habitación, etc. (opcional)">',
                  '<input type="text" id="billing-city" placeholder="Ciudad *" required>',
                  '<input type="text" id="billing-state" placeholder="Departamento *" required>',
                  '<input type="text" id="billing-postcode" placeholder="Código postal (opcional)">',
                  '<input type="tel" id="billing-phone" placeholder="Teléfono (opcional)">',
                  '<input type="email" id="billing-email" placeholder="Correo electrónico *" required>',
                  '<textarea id="order-notes" placeholder="Notas del pedido (opcional)"></textarea>',
                '</div>',
                '<div class="modal-actions"><button id="to-step-2" class="modal-btn primary" disabled>Continuar</button></div>',
              '</div>',
              '<aside class="col summary-col">',
                '<div class="summary-card">',
                  '<h5 class="summary-title">Tu pedido</h5>',
                  '<div id="live-billing-preview" class="billing-preview"></div>',
                  '<div class="summary-divider"></div>',
                  '<div id="cart-lines"></div>',
                  '<div class="summary-totals">',
                    '<div class="row br"><span>Subtotal</span><span id="summary-subtotal">—</span></div>',
                    '<div class="row br"><span>Envío</span><span id="summary-shipping">—</span></div>',
                    '<div class="row total"><span>Total</span><span id="summary-total">—</span></div>',
                  '</div>',
                '</div>',
              '</aside>',
            '</div>',
          '</section>',

          '<section class="modal-view" id="view-2">',
            '<div class="payment-options">',
              '<div class="payment-option">',
                '<input type="radio" id="pay-addi" name="payment_method" value="ADDI">',
                '<label for="pay-addi" class="payment-label-flex"><img src="addi_logo_480x480.png" alt="Addi"><span>Paga a cuotas con ADDI</span></label>',
              '</div>',
              '<div class="payment-option">',
                '<input type="radio" id="pay-nequi-davi" name="payment_method" value="Nequi / Daviplata">',
                '<label for="pay-nequi-davi" class="payment-label-flex">',
                  '<div class="payment-icon-wrapper">',
                    '<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSv733vhzl4XlJCl13S1VvTQ6gfwbpw_eZV_g&s" alt="Nequi">',
                    '<img src="https://images.seeklogo.com/logo-png/45/3/daviplata-logo-png_seeklogo-457809.png" alt="Daviplata">',
                  '</div><span>Nequi / Daviplata</span>',
                '</label>',
              '</div>',
              '<div class="payment-option">',
                '<input type="radio" id="pay-bancolombia" name="payment_method" value="Transferencia Bancolombia">',
                '<label for="pay-bancolombia" class="payment-label-flex"><img src="https://images.seeklogo.com/logo-png/42/1/bancolombia-logo-png_seeklogo-428092.png" alt="Bancolombia"><span>Transferencia Bancolombia</span></label>',
              '</div>',
              '<div class="payment-option">',
                '<input type="radio" id="pay-bold" name="payment_method" value="Tarjeta Crédito/Débito (Bold)">',
                '<label for="pay-bold" class="payment-label-flex"><img src="https://images.seeklogo.com/logo-png/47/2/bold-logo-png_seeklogo-479645.png" alt="Bold"><span>Tarjeta Crédito/Débito (via Bold)</span></label>',
              '</div>',
              '<div class="payment-option">',
                '<input type="radio" id="pay-cod" name="payment_method" value="Contra Entrega">',
                '<label for="pay-cod" class="payment-label-flex"><span>Contra Entrega</span></label>',
              '</div>',
            '</div>',
            '<div id="payment-instructions-content" class="instructions"></div>',
            '<div class="modal-actions"><button id="to-step-3" class="modal-btn primary" disabled>Ir a WhatsApp</button></div>',
          '</section>',

          '<section class="modal-view" id="view-3">',
            '<p class="wa-note">Al continuar se copiará tu pedido y se abrirá WhatsApp con el ticket listo para enviar.</p>',
            '<textarea id="whatsapp-message-textarea" readonly style="display:none;"></textarea>',
            '<div class="modal-actions"><button id="copy-open-wa" class="modal-btn primary">Copiar y abrir WhatsApp</button></div>',
          '</section>',
        '</div>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);

    // Estilos (con template string cerrado correctamente)
    const s = document.createElement('style');
    s.textContent = `
      .payment-fullscreen{position:fixed;inset:0;background:#fff;z-index:9999;display:flex;flex-direction:column;overflow:auto}
      .payment-modal-content{width:100%;min-height:100%;display:flex;flex-direction:column}
      .pmc-header{position:sticky;top:0;background:#fff;z-index:2;padding:14px 16px 12px;border-bottom:1px solid rgba(0,0,0,.12)}
      .close-btn{position:absolute;right:16px;top:10px;font-size:28px;line-height:1;background:transparent;border:0;cursor:pointer;color:#333}
      .modal-views-container{width:100%;max-width:1200px;margin:0 auto;padding:18px;flex:1}
      .progress-header{text-align:center;margin-bottom:.6rem;height:24px}
      #current-step-title{font-size:1rem;font-weight:600;color:#333;text-transform:uppercase;letter-spacing:1px}
      .progress-line-container{width:100%;height:4px;background:rgba(0,0,0,.08);border-radius:4px;overflow:hidden}
      .progress-line-active{height:100%;background:#1a1a1a;border-radius:4px;width:0%;transition:width .4s ease}
      .modal-view{display:none}.modal-view.active{display:block}
      .modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}
      .modal-btn{appearance:none;border:0;border-radius:10px;padding:12px 16px;cursor:pointer;font-weight:700}
      .modal-btn.primary{background:#111;color:#fff}.modal-btn.primary:disabled{opacity:.4;cursor:not-allowed}
      .two-col{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:26px;align-items:start}
      @media (max-width:1024px){.two-col{grid-template-columns:1fr;gap:18px}}
      .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .form-grid input,.form-grid select,.form-grid textarea{width:100%;padding:12px 14px;border:1px solid rgba(0,0,0,.18);border-radius:8px;font-size:.95rem;background:#fff}
      .form-grid textarea{grid-column:span 2;min-height:96px}
      #shipping-address,#shipping-address-2,#billing-email{grid-column:span 2}
      @media (max-width:640px){
        .modal-views-container{padding:14px}
        .form-grid{grid-template-columns:1fr;gap:10px}
        #shipping-address,#shipping-address-2,#billing-email{grid-column:span 1}
        .modal-actions{justify-content:stretch}
        .modal-btn{width:100%;padding:14px 16px}
        .close-btn{top:8px;right:10px;font-size:30px}
      }
      .summary-col{position:sticky;top:92px;height:fit-content;align-self:start}
      .summary-card{border:1px solid rgba(0,0,0,.12);border-radius:12px;padding:16px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.03)}
      .summary-title{font-size:1.1rem;margin:0 0 10px}
      .billing-preview{font-size:.92rem;color:#333;line-height:1.45;display:grid;gap:8px;border:1px solid rgba(0,0,0,.08);border-radius:8px;padding:10px 12px;background:#fafafa}
      .billing-preview .line{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(0,0,0,.08);padding:4px 0}
      .billing-preview .line:last-child{border-bottom:0}
      .summary-divider{height:1px;background:linear-gradient(to right, rgba(0,0,0,.10), rgba(0,0,0,.02));margin:12px 0}
      #cart-lines .item{display:flex;justify-content:space-between;gap:10px;font-size:.92rem;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.10)}
      #cart-lines .item:last-child{border-bottom:0}
      #cart-lines .meta{color:#555;font-size:.85rem}
      .summary-totals{margin-top:10px;border-top:2px solid rgba(0,0,0,.12)}
      .summary-totals .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dashed rgba(0,0,0,.14)}
      .summary-totals .row.total{border-bottom:0;font-weight:800;font-size:1.02rem}
    `;
    document.body.appendChild(s);

    setTimeout(() => overlay.classList.add('active'), 10);

    const views = overlay.querySelectorAll('.modal-view');
    const progressLine = overlay.querySelector('.progress-line-active');
    const titles = ['Datos y Resumen', 'Método de Pago', 'WhatsApp'];
    const stepTitleEl = overlay.querySelector('#current-step-title');
    function goTo(n) {
      const pct = ((n - 1) / (titles.length - 1)) * 100;
      progressLine.style.width = pct + '%';
      stepTitleEl.textContent = titles[n - 1] || titles[titles.length - 1];
      views.forEach(v => v.classList.remove('active'));
      const curr = overlay.querySelector('#view-' + n);
      if (curr) curr.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderCartSummary() {
      const cart = JSON.parse(localStorage.getItem('dimontiCart') || '[]');
      const lines = overlay.querySelector('#cart-lines');
      const sub = overlay.querySelector('#summary-subtotal');
      const ship = overlay.querySelector('#summary-shipping');
      const tot = overlay.querySelector('#summary-total');
      if (!lines || !sub || !ship || !tot) return;
      lines.innerHTML = '';
      let subtotal = 0;
      cart.forEach(it => {
        subtotal += it.price * it.quantity;
        lines.innerHTML += [
          '<div class="item">',
            '<div><div>', it.quantity, '× ', it.name, '</div><div class="meta">Color: ', it.color, ' • Talla: ', it.size, '</div></div>',
            '<div>', formatCurrency(it.price * it.quantity), '</div>',
          '</div>'
        ].join('');
      });
      sub.textContent = formatCurrency(subtotal);
      const envio = 13000;
      ship.textContent = '$' + Number(envio).toLocaleString('es-CO');
      tot.textContent = formatCurrency(subtotal + envio);
    }
    function updateBillingPreview() {
      const pv = overlay.querySelector('#live-billing-preview');
      if (!pv) return;
      const d = collectBillingData(overlay);
      pv.innerHTML = [
        '<div class="line"><strong>Nombre:</strong><span>', (d.nombre || ''), ' ', (d.apellidos || ''), '</span></div>',
        '<div class="line"><strong>CC/Pasaporte:</strong><span>', d.cc || '', '</span></div>',
        '<div class="line"><strong>País:</strong><span>', d.pais || '', '</span></div>',
        '<div class="line"><strong>Dirección:</strong><span>', d.direccion || '', (d.direccion2 ? (' - ' + d.direccion2) : ''), '</span></div>',
        '<div class="line"><strong>Ciudad/Depto:</strong><span>', d.ciudad || '', (d.departamento ? (' / ' + d.departamento) : ''), '</span></div>',
        '<div class="line"><strong>Código Postal:</strong><span>', d.postal || '', '</span></div>',
        '<div class="line"><strong>Teléfono:</strong><span>', d.telefono || '', '</span></div>',
        '<div class="line"><strong>Email:</strong><span>', d.email || '', '</span></div>',
        (d.notas ? '<div class="line"><strong>Notas:</strong><span>' + d.notas + '</span></div>' : '')
      ].join('');
    }
    renderCartSummary(); updateBillingPreview();

    const required = ['#recipient-name', '#recipient-lastname', '#billing-id', '#shipping-address', '#billing-city', '#billing-state', '#billing-email'];
    const btn2 = overlay.querySelector('#to-step-2');
    function validateStep1() {
      if (!btn2) return;
      btn2.disabled = !required.every(sel => {
        const el = overlay.querySelector(sel);
        return el && String(el.value || '').trim().length > 0;
      });
    }
    overlay.querySelectorAll('#view-1 input,#view-1 textarea,#view-1 select').forEach(el => {
      el.addEventListener('input', () => { updateBillingPreview(); validateStep1(); });
      el.addEventListener('change', () => { updateBillingPreview(); validateStep1(); });
    });
    validateStep1();
    btn2 && btn2.addEventListener('click', () => goTo(2));

    let payMethod = '';
    const btn3 = overlay.querySelector('#to-step-3');
    const instr = overlay.querySelector('#payment-instructions-content');

    function renderInstructions(method) {
      if (!instr) return;
      const totalText = (overlay.querySelector('#summary-total') && overlay.querySelector('#summary-total').textContent) || 'N/A';
      function box(inner) { return '<div class="payment-details-box">' + inner + '</div>'; }
      const totalBox = '<div class="payment-info-line"><strong>Total:</strong> <span>' + totalText + '</span></div>';
      let html = '';
      if (method === 'ADDI') html = box(totalBox + '<p>Para pagar con <strong>ADDI</strong>, te enviaremos un link seguro por WhatsApp.</p>');
      if (method === 'Nequi / Daviplata') html = box(
        totalBox +
        '<p>Envía el pago a:</p>' +
        '<div class="payment-info-line"><strong id="nequi-number">300 500 1484</strong>' +
        '<button id="copy-nequi-btn" class="modal-btn-copy">Copiar</button></div>' +
        '<p style="font-size:.85rem;color:#777">Guarda el comprobante para adjuntarlo por WhatsApp.</p>'
      );
      if (method === 'Transferencia Bancolombia') html = box(
        totalBox +
        '<p>Cuenta de Ahorros <strong>Bancolombia</strong>:</p>' +
        '<div class="payment-info-line" style="flex-direction:column;align-items:flex-start;">' +
          '<div><strong>Titular:</strong> ALEJANDRA BOLAÑOZ MONTILLA</div>' +
          '<div><strong>N° Cuenta:</strong> <span id="bancolombia-number">567 079227 75</span></div>' +
        '</div>' +
        '<button id="copy-bancolombia-btn" class="modal-btn-copy">Copiar Número de Cuenta</button>' +
        '<p style="font-size:.85rem;color:#777">Guarda el comprobante para adjuntarlo por WhatsApp.</p>'
      );
      if (method === 'Tarjeta Crédito/Débito (Bold)') html = box(totalBox + '<p>Te enviaremos un <strong>link de pago Bold</strong> por WhatsApp.</p>');
      if (method === 'Contra Entrega') html = box(totalBox + '<p><strong>Contra Entrega:</strong> Pagas en efectivo al recibir.</p>');
      instr.innerHTML = html;

      function copy(sel, btnSel) {
        const btn = overlay.querySelector(btnSel);
        if (!btn) return;
        btn.addEventListener('click', (e) => {
          const el = overlay.querySelector(sel);
          const text = el ? el.textContent || '' : '';
          navigator.clipboard.writeText(text).then(() => {
            const t = e.target;
            const o = t.textContent;
            t.textContent = 'Copiado';
            setTimeout(() => t.textContent = o, 1200);
          });
        });
      }
      copy('#nequi-number', '#copy-nequi-btn');
      copy('#bancolombia-number', '#copy-bancolombia-btn');
    }

    overlay.querySelectorAll('input[name="payment_method"]').forEach(r => {
      r.addEventListener('change', e => {
        payMethod = e.target.value;
        if (btn3) btn3.disabled = !payMethod;
        renderInstructions(payMethod);
      });
    });
    btn3 && btn3.addEventListener('click', () => goTo(3));

    function buildCurrentTicket() {
      const cart = JSON.parse(localStorage.getItem('dimontiCart') || '[]');
      const subtotal = (overlay.querySelector('#summary-subtotal') && overlay.querySelector('#summary-subtotal').textContent) || '';
      const envio = (overlay.querySelector('#summary-shipping') && overlay.querySelector('#summary-shipping').textContent) || '';
      const total = (overlay.querySelector('#summary-total') && overlay.querySelector('#summary-total').textContent) || '';
      const billing = collectBillingData(overlay);
      const orderId = genOrderId();
      return buildTicket({ orderId, cart, totales: { subtotal, envio, total }, metodo: payMethod || 'No especificado', facturacion: billing });
    }

    const copyOpen = overlay.querySelector('#copy-open-wa');
    copyOpen && copyOpen.addEventListener('click', () => {
      const text = buildCurrentTicket();
      navigator.clipboard.writeText(text).then(() => {
        window.open(waLink(DIMONTI_WA, text), '_blank', 'noopener');
        localStorage.setItem('dimontiCart', '[]');
        renderCart(); window.updateCartIcon();
        overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 200);
      });
    });

    const closeBtn = overlay.querySelector('.close-btn');
    closeBtn && closeBtn.addEventListener('click', () => {
      overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 200);
    });
  }

  /* ================= MODALES INFO ================= */

  // ¿Dónde está mi pedido?
  function openWhereIsMyOrderModal() {
    document.querySelector('.order-help-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'order-help-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="order-help-content" role="document" tabindex="-1">
        <div class="oh-header">
          <div class="oh-brand">
            <span class="oh-logo-main">DIMONTI</span>
            <span class="oh-logo-sub">STORE®</span>
          </div>
          <button class="order-help-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="oh-hero">
          <div class="oh-hero-icon" aria-hidden="true"><i class="fas fa-location-crosshairs"></i></div>
          <h3 class="oh-title">¿Dónde está mi pedido?</h3>
          <p class="oh-intro">Si ya realizaste tu compra y deseas conocer el estado de tu envío, sigue estos pasos:</p>
        </div>
        <div class="oh-body">
          <ol class="oh-steps">
            <li class="oh-step">
              <div class="oh-step-bullet">1</div>
              <div class="oh-step-content">
                <h4>Verifica tu guía de envío</h4>
                <p>Al despachar tu pedido, te enviamos una foto o número de guía por WhatsApp o correo. Con ese número puedes rastrear con la transportadora.</p>
              </div>
            </li>
            <li class="oh-step">
              <div class="oh-step-bullet">2</div>
              <div class="oh-step-content">
                <h4>Comunícate por WhatsApp</h4>
                <p>Escríbenos a <a class="oh-wa" href="https://wa.me/573016593662" target="_blank" rel="noopener">+57 301 659 3662</a>. Te ayudamos a verificar estado y ubicación.</p>
              </div>
            </li>
            <li class="oh-step">
              <div class="oh-step-bullet">3</div>
              <div class="oh-step-content">
                <h4>Envíanos la información</h4>
                <p>Comparte la <strong>foto</strong> o el <strong>número de guía</strong> para rastrear tu paquete de forma rápida y precisa.</p>
              </div>
            </li>
            <li class="oh-step">
              <div class="oh-step-bullet">4</div>
              <div class="oh-step-content">
                <h4>Recibe la actualización</h4>
                <p>Confirmamos estado actual, transportadora y fecha estimada de entrega.</p>
              </div>
            </li>
          </ol>
          <div class="oh-note">
            <p>💬 <strong>Recuerda:</strong></p>
            <ul>
              <li>Los tiempos de entrega varían por ciudad y operador logístico.</li>
              <li>Si no recibes tu guía en <strong>24h hábiles</strong> tras comprar, contáctanos.</li>
            </ul>
          </div>
          <p class="oh-footer">📦 En <strong>Dimonti Store</strong> cuidamos cada detalle para que tu pedido llegue a tiempo y en perfectas condiciones.</p>
        </div>
      </div>
    `;

    const styles = document.createElement('style');
    styles.textContent = `
      .order-help-overlay{position:fixed;inset:0;background:radial-gradient(1200px 600px at 70% -10%, rgba(212,175,55,.10), transparent 60%), rgba(0,0,0,.78);backdrop-filter:blur(4px);z-index:3000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s ease;padding:18px;overflow:auto}
      .order-help-overlay.active{opacity:1}
      .order-help-content{width:min(920px,95vw);max-height:92vh;overflow:auto;color:#1c1c1c;border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.98)) padding-box,linear-gradient(135deg,rgba(212,175,55,.95),rgba(212,175,55,.35),rgba(0,0,0,.12)) border-box;border:2px solid transparent;box-shadow:0 18px 60px rgba(0,0,0,.22);transform:translateY(10px) scale(.985);transition:transform .28s cubic-bezier(.2,.8,.2,1)}
      .order-help-overlay.active .order-help-content{transform:translateY(0) scale(1)}
      .oh-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(0,0,0,.08);background:linear-gradient(180deg,#fff,#fafafa)}
      .oh-brand{font-family:'Orbitron',sans-serif;text-transform:uppercase;letter-spacing:2px}
      .oh-logo-main{display:block;font-weight:900;font-size:1.1rem;color:#000}
      .oh-logo-sub{display:block;font-size:.65rem;color:#d4af37;letter-spacing:1px;margin-top:-4px}
      .order-help-close{border:0;background:transparent;cursor:pointer;font-size:30px;line-height:1;color:#777;padding:8px 10px;border-radius:10px}
      .order-help-close:hover{color:#000;background:#f1f1f1}
      .oh-hero{text-align:center;padding:18px 22px 8px}
      .oh-hero-icon{width:56px;height:56px;margin:0 auto 8px;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle at 40% 40%, rgba(212,175,55,.3), rgba(212,175,55,.15) 60%, transparent 61%);border:2px solid rgba(212,175,55,.65)}
      .oh-hero-icon i{font-size:1.2rem;color:#000}
      .oh-title{font-family:'Cinzel',serif;text-transform:uppercase;letter-spacing:.5px;font-size:1.35rem;margin:6px 0 6px}
      .oh-intro{color:#444;margin:0 auto 10px;max-width:740px}
      .oh-body{padding:6px 22px 22px}
      .oh-steps{list-style:none;margin:8px 0 14px;padding:0}
      .oh-step{display:flex;gap:14px;padding:12px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:12px;box-shadow:0 3px 14px rgba(0,0,0,.04)}
      .oh-step + .oh-step{margin-top:10px}
      .oh-step-bullet{flex:0 0 34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:800;color:#000;border:2px solid #000;background:#fff}
      .oh-step-content h4{margin:2px 0 4px;font-size:.98rem}
      .oh-step-content p{margin:0;color:#333;line-height:1.55}
      .oh-note{background:#fafafa;border:1px dashed rgba(0,0,0,.14);border-radius:12px;padding:12px 14px;margin-top:8px}
      .oh-note ul{margin:6px 0 0 18px}
      .oh-note li{margin:4px 0}
      .oh-wa{color:#000;font-weight:800;border-bottom:1px solid rgba(0,0,0,.25)}
      .oh-wa:hover{opacity:.85}
      .oh-footer{color:#333;margin-top:10px}
      @media (max-width:560px){
        .order-help-overlay{padding:10px}
        .order-help-content{width:100%;max-height:96vh;border-radius:14px}
        .oh-header{padding:12px 12px}
        .oh-hero{padding:14px 12px 4px}
        .oh-title{font-size:1.1rem}
        .oh-body{padding:4px 12px 14px}
        .oh-step{padding:10px;gap:12px}
        .oh-step-bullet{flex-basis:30px;height:30px;font-size:.9rem}
        .order-help-close{font-size:32px;padding:10px 12px}
      }
    `;
    document.body.appendChild(styles);
    document.body.appendChild(overlay);

    const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 200); };
    overlay.querySelector('.order-help-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });

    requestAnimationFrame(() => {
      overlay.classList.add('active');
      const c = overlay.querySelector('.order-help-content'); if (c) c.focus();
    });
  }

  // Política de Compra (igual al anterior, ya corregido antes)
  function openPurchasePolicyModal() {
    document.querySelector('.policy-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'policy-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="policy-content" role="document" tabindex="-1">
        <div class="plc-header">
          <div class="plc-brand">
            <span class="plc-logo-main">DIMONTI</span>
            <span class="plc-logo-sub">STORE®</span>
          </div>
          <button class="plc-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="plc-body">
          <h3 class="plc-title">Política de Compra</h3>
          <div class="plc-section">
            <h4>Garantía</h4>
            <p>Ofrecemos una <strong>garantía de 30 días</strong> por defectos de pegue y costura. Si tus zapatos presentan algún problema dentro de este plazo, contáctanos para resolver el inconveniente.</p>
          </div>
          <div class="plc-section">
            <h4>Compras por Mayor</h4>
            <p>Para acceder a nuestros <strong>precios mayoristas</strong>, debes realizar una compra mínima de <strong>6 pares</strong> de zapatos. Esto nos permite ofrecerte un valor competitivo y justo.</p>
          </div>
          <div class="plc-section">
            <h4>Precios Mayoristas y por Caja</h4>
            <ul>
              <li>Los <strong>precios por caja</strong> varían según la referencia.</li>
              <li>Cada caja contiene <strong>una sola referencia</strong>; no se pueden combinar diferentes referencias en una misma caja.</li>
              <li>Ideales para compras en grandes cantidades y aprovechar descuentos especiales.</li>
            </ul>
          </div>
          <div class="plc-section">
            <h4>Cambios</h4>
            <p>Solo se aceptan por el <strong>mismo modelo, talla y color</strong>. El producto debe estar en <strong>estado original</strong> (sin uso ni suciedad) y con <strong>todos los accesorios</strong> incluidos.</p>
          </div>
          <div class="plc-section">
            <h4>Envíos</h4>
            <ul>
              <li>El costo de envío varía según la ubicación y se suma al precio de los zapatos.</li>
              <li>Nuestros asesores te informarán el <strong>costo y los tiempos</strong> de entrega.</li>
              <li>Los pedidos realizados después de las <strong>2:00 p. m.</strong> se consideran para el envío del día siguiente.</li>
            </ul>
          </div>
          <div class="plc-section">
            <h4>Envíos Contra Entrega</h4>
            <p>Para garantizar la seguridad del pedido, <strong>solicitamos el valor del envío</strong> anticipado en pedidos contra entrega.</p>
          </div>
          <div class="plc-section">
            <h4>Confirmación de Pago</h4>
            <p>Una vez realices tu pago, envía la <strong>captura del comprobante</strong> y los datos solicitados por nuestro asesor. Esto nos permitirá procesar tu pedido de forma eficiente.</p>
          </div>
          <div class="plc-section">
            <h4>Contacto</h4>
            <p>¿Preguntas o inquietudes? Escríbenos por WhatsApp a <a class="plc-wa" href="https://wa.me/573016593662" target="_blank" rel="noopener">+57 301 659 3662</a>. Estamos para ayudarte.</p>
          </div>
        </div>
      </div>
    `;

    const styles = document.createElement('style');
    styles.textContent = `
      .policy-overlay{position:fixed;inset:0;background:radial-gradient(1200px 600px at 70% -10%, rgba(212,175,55,.10), transparent 60%), rgba(0,0,0,.78);backdrop-filter:blur(4px);z-index:3000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s ease;padding:18px;overflow:auto}
      .policy-overlay.active{opacity:1}
      .policy-content{width:min(920px,95vw);max-height:92vh;overflow:auto;color:#1c1c1c;border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.98)) padding-box,linear-gradient(135deg,rgba(212,175,55,.95),rgba(212,175,55,.35),rgba(0,0,0,.12)) border-box;border:2px solid transparent;box-shadow:0 18px 60px rgba(0,0,0,.22);transform:translateY(10px) scale(.985);transition:transform .28s cubic-bezier(.2,.8,.2,1)}
      .policy-overlay.active .policy-content{transform:translateY(0) scale(1)}
      .plc-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(0,0,0,.08);background:linear-gradient(180deg,#fff,#fafafa)}
      .plc-brand{font-family:'Orbitron',sans-serif;text-transform:uppercase;letter-spacing:2px}
      .plc-logo-main{display:block;font-weight:900;font-size:1.1rem;color:#000}
      .plc-logo-sub{display:block;font-size:.65rem;color:#d4af37;letter-spacing:1px;margin-top:-4px}
      .plc-close{border:0;background:transparent;cursor:pointer;font-size:30px;line-height:1;color:#777;padding:8px 10px;border-radius:10px}
      .plc-close:hover{color:#000;background:#f1f1f1}
      .plc-body{padding:18px 22px 22px}
      .plc-title{font-family:'Cinzel',serif;text-transform:uppercase;letter-spacing:.5px;font-size:1.35rem;margin:0 0 12px;text-align:center}
      .plc-section{border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:14px 16px;background:#fff;box-shadow:0 3px 14px rgba(0,0,0,.04)}
      .plc-section + .plc-section{margin-top:12px}
      .plc-section h4{margin:0 0 6px;font-size:1rem}
      .plc-section p,.plc-section li{color:#333;line-height:1.55}
      .plc-section ul{margin:6px 0 0 18px}
      .plc-wa{color:#000;font-weight:800;border-bottom:1px solid rgba(0,0,0,.25)}
      .plc-wa:hover{opacity:.85}
      @media (max-width:560px){
        .policy-overlay{padding:10px}
        .policy-content{width:100%;max-height:96vh;border-radius:14px}
        .plc-header{padding:12px 12px}
        .plc-body{padding:14px 12px 16px}
        .plc-title{font-size:1.15rem}
        .plc-close{font-size:32px;padding:10px 12px}
      }
    `;
    document.body.appendChild(styles);
    document.body.appendChild(overlay);

    const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 200); };
    overlay.querySelector('.plc-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });

    requestAnimationFrame(() => {
      overlay.classList.add('active');
      const c = overlay.querySelector('.policy-content'); if (c) c.focus();
    });
  }

  // Política de Datos
  function openDataPolicyModal() {
    document.querySelector('.data-policy-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'data-policy-overlay';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="dp-content" role="document" tabindex="-1">
        <div class="dp-header">
          <div class="dp-brand">
            <span class="dp-logo-main">DIMONTI</span>
            <span class="dp-logo-sub">STORE®</span>
          </div>
          <button class="dp-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="dp-body">
          <h3 class="dp-title">Política de Datos</h3>
          <div class="dp-section">
            <h4>¿Qué datos recolectamos?</h4>
            <ul>
              <li><strong>Identificación y contacto:</strong> nombre, apellidos, email, teléfono.</li>
              <li><strong>Envío y facturación:</strong> dirección, ciudad, departamento, país, documento.</li>
              <li><strong>Pedido y soporte:</strong> productos, cantidades, preferencias, mensajes por WhatsApp o formulario.</li>
              <li><strong>Pago:</strong> referencia del pago/estado (no almacenamos datos de tarjetas en nuestros servidores).</li>
              <li><strong>Uso del sitio:</strong> páginas visitadas, clics, tiempo en el sitio, IP y dispositivo/navegador.</li>
              <li><strong>Cookies y analítica:</strong> para sesión, carrito y métricas (p. ej., Google Analytics).</li>
            </ul>
          </div>
          <div class="dp-section">
            <h4>¿Para qué usamos tus datos?</h4>
            <ul>
              <li>Procesar y entregar pedidos, y gestionar cambios/garantías.</li>
              <li>Soporte por WhatsApp/Email y respuestas a solicitudes.</li>
              <li>Prevención de fraude y cumplimiento legal.</li>
              <li>Mejorar experiencia del sitio y campañas.</li>
              <li>Comunicaciones transaccionales y, si autorizas, promociones.</li>
            </ul>
          </div>
          <div class="dp-section">
            <h4>Base legal</h4>
            <p>Consentimiento, ejecución del contrato de compra, interés legítimo y cumplimiento legal.</p>
          </div>
          <div class="dp-section">
            <h4>Con quién compartimos</h4>
            <ul>
              <li>Operadores de pago (Bold, bancos, billeteras).</li>
              <li>Transportadoras para despacho y rastreo.</li>
              <li>Herramientas de analítica/marketing (no vendemos tus datos).</li>
              <li>Autoridades cuando la ley lo exija.</li>
            </ul>
          </div>
          <div class="dp-section">
            <h4>Conservación</h4>
            <p>Mantendremos los datos el tiempo necesario para las finalidades y obligaciones (garantías) y luego los eliminamos o anonimizamos.</p>
          </div>
          <div class="dp-section">
            <h4>Tus derechos</h4>
            <ul>
              <li>Acceso, actualización, rectificación y eliminación.</li>
              <li>Revocar consentimiento u oponerte a usos no esenciales.</li>
              <li>Portabilidad cuando aplique.</li>
            </ul>
            <p>Ejércelos por WhatsApp <a class="dp-wa" href="https://wa.me/573016593662" target="_blank" rel="noopener">+57 301 659 3662</a>.</p>
          </div>
          <div class="dp-section">
            <h4>Cookies</h4>
            <p>Usamos cookies propias y de terceros para sesión, carrito, personalización y métricas. Puedes gestionarlas desde tu navegador.</p>
          </div>
          <div class="dp-section">
            <h4>Actualizaciones</h4>
            <p>Podemos modificar esta política y publicaremos la fecha de actualización correspondiente.</p>
          </div>
        </div>
      </div>
    `;

    const styles = document.createElement('style');
    styles.textContent = `
      .data-policy-overlay{position:fixed;inset:0;background:radial-gradient(1200px 600px at 70% -10%, rgba(212,175,55,.10), transparent 60%), rgba(0,0,0,.78);backdrop-filter:blur(4px);z-index:3000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s ease;padding:18px;overflow:auto}
      .data-policy-overlay.active{opacity:1}
      .dp-content{width:min(920px,95vw);max-height:92vh;overflow:auto;color:#1c1c1c;border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.98)) padding-box,linear-gradient(135deg,rgba(212,175,55,.95),rgba(212,175,55,.35),rgba(0,0,0,.12)) border-box;border:2px solid transparent;box-shadow:0 18px 60px rgba(0,0,0,.22);transform:translateY(10px) scale(.985);transition:transform .28s cubic-bezier(.2,.8,.2,1)}
      .data-policy-overlay.active .dp-content{transform:translateY(0) scale(1)}
      .dp-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(0,0,0,.08);background:linear-gradient(180deg,#fff,#fafafa)}
      .dp-brand{font-family:'Orbitron',sans-serif;text-transform:uppercase;letter-spacing:2px}
      .dp-logo-main{display:block;font-weight:900;font-size:1.1rem;color:#000}
      .dp-logo-sub{display:block;font-size:.65rem;color:#d4af37;letter-spacing:1px;margin-top:-4px}
      .dp-close{border:0;background:transparent;cursor:pointer;font-size:30px;line-height:1;color:#777;padding:8px 10px;border-radius:10px}
      .dp-close:hover{color:#000;background:#f1f1f1}
      .dp-body{padding:18px 22px 22px}
      .dp-title{font-family:'Cinzel',serif;text-transform:uppercase;letter-spacing:.5px;font-size:1.35rem;margin:0 0 12px;text-align:center}
      .dp-section{border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:14px 16px;background:#fff;box-shadow:0 3px 14px rgba(0,0,0,.04)}
      .dp-section + .dp-section{margin-top:12px}
      .dp-section h4{margin:0 0 6px;font-size:1rem}
      .dp-section p,.dp-section li{color:#333;line-height:1.55}
      .dp-section ul{margin:6px 0 0 18px}
      .dp-wa{color:#000;font-weight:800;border-bottom:1px solid rgba(0,0,0,.25)}
      .dp-wa:hover{opacity:.85}
      @media (max-width:560px){
        .data-policy-overlay{padding:10px}
        .dp-content{width:100%;max-height:96vh;border-radius:14px}
        .dp-header{padding:12px 12px}
        .dp-body{padding:14px 12px 16px}
        .dp-title{font-size:1.15rem}
        .dp-close{font-size:32px;padding:10px 12px}
      }
    `;
    document.body.appendChild(styles);
    document.body.appendChild(overlay);

    const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 200); };
    overlay.querySelector('.dp-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });

    requestAnimationFrame(() => {
      overlay.classList.add('active');
      const c = overlay.querySelector('.dp-content'); if (c) c.focus();
    });
  }

  // Guía de Tallas
  function openSizeGuideModal() {
    document.querySelector('.size-guide-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'size-guide-overlay';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="sg-content" role="document" tabindex="-1">
        <div class="sg-header">
          <div class="sg-brand">
            <span class="sg-logo-main">DIMONTI</span>
            <span class="sg-logo-sub">STORE®</span>
          </div>
          <button class="sg-close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="sg-body">
          <h3 class="sg-title">Guía de Tallas</h3>
          <div class="sg-tabs" role="tablist">
            <button class="sg-tab active" role="tab" aria-selected="true" data-tab="mujer">Mujer</button>
            <button class="sg-tab" role="tab" aria-selected="false" data-tab="hombre">Hombre</button>
          </div>
          <div class="sg-panels">
            <section class="sg-panel active" id="panel-mujer" role="tabpanel">
              <div class="sg-table-wrap">
                <table class="sg-table">
                  <thead><tr><th>CO</th><th>US</th><th>EU</th><th>CM</th></tr></thead>
                  <tbody>
                    <tr><td>35</td><td>5.5</td><td>36</td><td>22.5</td></tr>
                    <tr><td>36</td><td>6</td><td>37</td><td>23</td></tr>
                    <tr><td>37</td><td>7</td><td>38</td><td>23.5</td></tr>
                    <tr><td>38</td><td>8</td><td>39</td><td>24</td></tr>
                    <tr><td>39</td><td>9</td><td>40</td><td>25</td></tr>
                    <tr><td>40</td><td>10</td><td>41</td><td>25.5</td></tr>
                  </tbody>
                </table>
              </div>
              <p class="sg-tip">Si estás entre dos tallas, elige la mayor para un ajuste cómodo.</p>
            </section>
            <section class="sg-panel" id="panel-hombre" role="tabpanel" hidden>
              <div class="sg-table-wrap">
                <table class="sg-table">
                  <thead><tr><th>CO</th><th>US</th><th>EU</th><th>CM</th></tr></thead>
                  <tbody>
                    <tr><td>38</td><td>6</td><td>39</td><td>24</td></tr>
                    <tr><td>39</td><td>7</td><td>40</td><td>25</td></tr>
                    <tr><td>40</td><td>8</td><td>41</td><td>26</td></tr>
                    <tr><td>41</td><td>8.5</td><td>42</td><td>26.5</td></tr>
                    <tr><td>42</td><td>9.5</td><td>43</td><td>27</td></tr>
                    <tr><td>43</td><td>10</td><td>44</td><td>27.5</td></tr>
                    <tr><td>44</td><td>11</td><td>45</td><td>28</td></tr>
                    <tr><td>45</td><td>12</td><td>46</td><td>29</td></tr>
                  </tbody>
                </table>
              </div>
              <p class="sg-tip">Las medidas en CM son aproximadas y pueden variar según la referencia.</p>
            </section>
          </div>
        </div>
      </div>
    `;

    const styles = document.createElement('style');
    styles.textContent = `
      .size-guide-overlay{position:fixed;inset:0;background:radial-gradient(1200px 600px at 70% -10%, rgba(212,175,55,.10), transparent 60%), rgba(0,0,0,.78);backdrop-filter:blur(4px);z-index:3000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s ease;padding:18px;overflow:auto}
      .size-guide-overlay.active{opacity:1}
      .sg-content{width:min(860px,95vw);max-height:92vh;overflow:auto;color:#1c1c1c;border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.98)) padding-box,linear-gradient(135deg,rgba(212,175,55,.95),rgba(212,175,55,.35),rgba(0,0,0,.12)) border-box;border:2px solid transparent;box-shadow:0 18px 60px rgba(0,0,0,.22);transform:translateY(10px) scale(.985);transition:transform .28s cubic-bezier(.2,.8,.2,1)}
      .size-guide-overlay.active .sg-content{transform:translateY(0) scale(1)}
      .sg-header{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(0,0,0,.08);background:linear-gradient(180deg,#fff,#fafafa)}
      .sg-brand{font-family:'Orbitron',sans-serif;text-transform:uppercase;letter-spacing:2px}
      .sg-logo-main{display:block;font-weight:900;font-size:1.1rem;color:#000}
      .sg-logo-sub{display:block;font-size:.65rem;color:#d4af37;letter-spacing:1px;margin-top:-4px}
      .sg-close{border:0;background:transparent;cursor:pointer;font-size:30px;line-height:1;color:#777;padding:8px 10px;border-radius:10px}
      .sg-close:hover{color:#000;background:#f1f1f1}
      .sg-body{padding:18px 22px 22px}
      .sg-title{font-family:'Cinzel',serif;text-transform:uppercase;letter-spacing:.5px;font-size:1.3rem;margin:0 0 12px;text-align:center}
      .sg-tabs{display:flex;gap:8px;justify-content:center;margin-bottom:12px}
      .sg-tab{border:1px solid rgba(0,0,0,.18);background:#fff;padding:10px 14px;border-radius:999px;cursor:pointer;font-weight:700}
      .sg-tab.active{background:#111;color:#fff;border-color:#111}
      .sg-table-wrap{overflow:auto;border:1px solid rgba(0,0,0,.08);border-radius:12px;background:#fff;box-shadow:0 3px 14px rgba(0,0,0,.04)}
      .sg-table{width:100%;border-collapse:collapse;text-align:center}
      .sg-table th,.sg-table td{padding:10px 8px;border-bottom:1px solid rgba(0,0,0,.08)}
      .sg-table thead th{font-weight:800}
      .sg-table tbody tr:last-child td{border-bottom:0}
      .sg-tip{margin-top:10px;color:#444;text-align:center}
      .sg-panel{display:block}
      .sg-panel[hidden]{display:none}
      @media (max-width:560px){
        .size-guide-overlay{padding:10px}
        .sg-content{width:100%;max-height:96vh;border-radius:14px}
        .sg-header{padding:12px 12px}
        .sg-body{padding:14px 12px 16px}
        .sg-title{font-size:1.15rem}
        .sg-close{font-size:32px;padding:10px 12px}
      }
    `;
    document.body.appendChild(styles);
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.sg-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.sg-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const key = btn.dataset.tab;
        const isWoman = key === 'mujer';
        overlay.querySelector('#panel-mujer').hidden = !isWoman;
        overlay.querySelector('#panel-hombre').hidden = isWoman;
        overlay.querySelector('#panel-mujer').classList.toggle('active', isWoman);
        overlay.querySelector('#panel-hombre').classList.toggle('active', !isWoman);
      });
    });

    const close = () => { overlay.classList.remove('active'); setTimeout(() => overlay.remove(), 200); };
    overlay.querySelector('.sg-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });

    requestAnimationFrame(() => {
      overlay.classList.add('active');
      const c = overlay.querySelector('.sg-content'); if (c) c.focus();
    });
  }

  /* ================= ENLACES & LIMPIEZAS ================= */
  function wireWhereIsMyOrderLinks() {
    const links = Array.from(document.querySelectorAll('a')).filter(a => {
      const t = (a.textContent || '').trim().toLowerCase();
      return t === '¿dónde está mi pedido?' || t === 'dónde está mi pedido?' || t === 'donde está mi pedido?' || t === 'donde esta mi pedido?';
    });
    links.forEach(a => { a.addEventListener('click', e => { e.preventDefault(); openWhereIsMyOrderModal(); }); });
  }
  function wirePurchasePolicyLinks() {
    const links = Array.from(document.querySelectorAll('a')).filter(a => {
      const t = (a.textContent || '').trim().toLowerCase();
      return t === 'política de compra' || t === 'politica de compra';
    });
    links.forEach(a => { a.addEventListener('click', e => { e.preventDefault(); openPurchasePolicyModal(); }); });
  }
  function wireSizeGuideLinks() {
    const links = Array.from(document.querySelectorAll('a')).filter(a => {
      const t = (a.textContent || '').trim().toLowerCase();
      return t === 'guía de tallas' || t === 'guia de tallas';
    });
    links.forEach(a => { a.addEventListener('click', e => { e.preventDefault(); openSizeGuideModal(); }); });
  }
  function wireDataPolicyLinks() {
    const links = Array.from(document.querySelectorAll('a')).filter(a => {
      const t = (a.textContent || '').trim().toLowerCase();
      return t === 'política de datos' || t === 'politica de datos';
    });
    links.forEach(a => { a.addEventListener('click', e => { e.preventDefault(); openDataPolicyModal(); }); });
  }
  function removePrivacyLink() {
    const candidates = Array.from(document.querySelectorAll('a')).filter(a => {
      const t = (a.textContent || '').trim().toLowerCase();
      return t === 'política de privacidad' || t === 'politica de privacidad';
    });
    candidates.forEach(a => { const li = a.closest('li') || a; if (li) li.remove(); });
  }

  wireWhereIsMyOrderLinks();
  wirePurchasePolicyLinks();
  wireSizeGuideLinks();
  wireDataPolicyLinks();
  removePrivacyLink();
});
