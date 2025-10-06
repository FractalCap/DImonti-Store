document.addEventListener('DOMContentLoaded', function() {
    
    // === WhatsApp de Dimonti en formato E.164 (Colombia = 57) ===
    const DIMONTI_WA = '573016593662'; // cambia por el tuyo si aplica

    // --- Lógica para el Menú Móvil (Hamburguesa) ---
    const hamburgerBtn = document.querySelector('.hamburger');
    const mobileMenu = document.querySelector('.mobile-menu');
    const closeMenuBtn = document.querySelector('.close-menu');

    if (hamburgerBtn && mobileMenu && closeMenuBtn) {
        hamburgerBtn.addEventListener('click', () => {
            mobileMenu.classList.add('active');
        });
        closeMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
        });
    }

    // =============================================
    // --- LÓGICA DEL CARRITO DESPLEGABLE ---
    // =============================================
    
    const openCartTriggers = document.querySelectorAll('.js-open-cart');
    const closeCartTriggers = document.querySelectorAll('.js-close-cart');
    const cartOverlay = document.querySelector('.cart-overlay');
    const sideCart = document.querySelector('.side-cart');
    
    function formatCurrency(value) {
        return `$${Number(value).toLocaleString('es-CO')}`;
    }

    // --- Funciones para abrir y cerrar el carrito ---
    window.openCart = function() {
        renderCart(); // Renderizar el contenido antes de mostrar
        cartOverlay.classList.add('active');
        sideCart.classList.add('active');
    };

    window.closeCart = function() {
        cartOverlay.classList.remove('active');
        sideCart.classList.remove('active');
    };

    openCartTriggers.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.openCart();
    }));
    closeCartTriggers.forEach(btn => btn.addEventListener('click', window.closeCart));
    cartOverlay.addEventListener('click', window.closeCart);
    
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && sideCart.classList.contains('active')) {
            window.closeCart();
        }
    });

    // --- Render del carrito ---
    function renderCart() {
        const cartBody = sideCart.querySelector('.side-cart-body');
        const cartFooter = sideCart.querySelector('.side-cart-footer');
        let cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];

        cartBody.innerHTML = '';
        cartFooter.innerHTML = '';

        if (cart.length === 0) {
            cartBody.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío.</p>';
            return;
        }

        let subtotal = 0;
        cart.forEach(item => {
            cartBody.innerHTML += `
                <div class="cart-item" data-item-id="${item.id}">
                    <div class="cart-item-image">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="cart-item-details">
                        <p class="item-name">${item.name}</p>
                        <p class="item-meta">Color: ${item.color} / Talla: ${item.size}</p>
                        <p class="item-price">${formatCurrency(item.price)}</p>
                        <div class="quantity-selector">
                            <button class="quantity-btn decrease-qty" data-id="${item.id}">-</button>
                            <input type="number" value="${item.quantity}" min="1" readonly>
                            <button class="quantity-btn increase-qty" data-id="${item.id}">+</button>
                        </div>
                    </div>
                    <div class="cart-item-actions">
                        <button class="remove-item-btn" data-id="${item.id}" title="Eliminar">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>`;
            subtotal += item.price * item.quantity;
        });

        cartFooter.innerHTML = `
            <div class="summary-row">
                <span>Subtotal:</span>
                <span id="cart-subtotal">${formatCurrency(subtotal)}</span>
            </div>
            <button class="checkout-btn">Finalizar Pedido</button>`;
    }
    
    // --- Actualizar cantidad / eliminar ---
    function updateCartItem(itemId, newQuantity) {
        let cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
        const idx = cart.findIndex(item => item.id === itemId);
        if (idx > -1) {
            if (newQuantity <= 0) cart.splice(idx, 1);
            else cart[idx].quantity = newQuantity;
            localStorage.setItem('dimontiCart', JSON.stringify(cart));
            renderCart();
            window.updateCartIcon();
        }
    }
    
    // Delegación de eventos dentro del carrito
    sideCart.addEventListener('click', (event) => {
        const target = event.target;
        const btn = target.closest('button');

        if (btn && btn.dataset.id) {
            const id = btn.dataset.id;
            const cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
            const item = cart.find(x => x.id === id);
            if (!item) return;

            if (btn.classList.contains('increase-qty')) updateCartItem(id, item.quantity + 1);
            else if (btn.classList.contains('decrease-qty')) updateCartItem(id, item.quantity - 1);
            else if (btn.classList.contains('remove-item-btn')) updateCartItem(id, 0);
        }
        
        if (target.classList.contains('checkout-btn')) {
            const cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
            if (!cart.length) { alert('Tu carrito está vacío.'); return; }
            createPaymentModal();
        }
    });

    // --- Contador del ícono del carrito ---
    window.updateCartIcon = function() {
        const cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = totalItems);
    };
    window.updateCartIcon();

    // ===================================================================
    // === CHECKOUT DE PANTALLA COMPLETA (3 PASOS) =======================
    // ===================================================================

    // Utilidades
    function waLink(phoneE164, text) {
        return `https://wa.me/${encodeURIComponent(phoneE164)}?text=${encodeURIComponent(text)}`;
    }
    function genOrderId() {
        return 'DIM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,8).toUpperCase();
    }
    function collectBillingData(root = document) {
        const get = sel => (root.querySelector(sel)?.value || '').trim();
        return {
            nombre:     get('#recipient-name')      || get('#billing_first_name') || get('[name="billing_first_name"]'),
            apellidos:  get('#recipient-lastname')  || get('#billing_last_name')  || get('[name="billing_last_name"]'),
            pais:       get('#billing-country')     || get('#billing_country')    || get('[name="billing_country"]') || 'Colombia',
            cc:         get('#billing-id'), // NUEVO: CC/Pasaporte (OBLIGATORIO)
            direccion:  get('#shipping-address')    || get('#billing_address_1')  || get('[name="billing_address_1"]'),
            direccion2: get('#shipping-address-2')  || get('#billing_address_2')  || get('[name="billing_address_2"]'),
            ciudad:     get('#billing-city')        || get('#billing_city')       || get('[name="billing_city"]'),
            departamento:get('#billing-state')      || get('#billing_state')      || get('[name="billing_state"]'),
            postal:     get('#billing-postcode')    || get('#billing_postcode')   || get('[name="billing_postcode"]'),
            telefono:   get('#billing-phone')       || get('#billing_phone')      || get('[name="billing_phone"]'),
            email:      get('#billing-email')       || get('#billing_email')      || get('[name="billing_email"]'),
            notas:      get('#order-notes')         || get('#order_comments')     || get('[name="order_comments"]')
        };
    }
    function buildTicket({orderId, cart, totales, metodo, facturacion}) {
        const L = [];
        L.push('¡Hola Dimonti Store! 👋');
        L.push('');
        L.push(`*ORDER ID:* ${orderId}`);
        L.push('');
        L.push('*DATOS DE FACTURACIÓN*');
        if (facturacion.nombre)       L.push(`- *Nombre:* ${facturacion.nombre}`);
        if (facturacion.apellidos)    L.push(`- *Apellidos:* ${facturacion.apellidos}`);
        if (facturacion.cc)           L.push(`- *CC/Pasaporte:* ${facturacion.cc}`);
        if (facturacion.pais)         L.push(`- *País/Región:* ${facturacion.pais}`);
        if (facturacion.direccion)    L.push(`- *Dirección:* ${facturacion.direccion}`);
        if (facturacion.direccion2)   L.push(`- *Apto/Det:* ${facturacion.direccion2}`);
        if (facturacion.ciudad)       L.push(`- *Ciudad:* ${facturacion.ciudad}`);
        if (facturacion.departamento) L.push(`- *Depto:* ${facturacion.departamento}`);
        if (facturacion.postal)       L.push(`- *C.P.:* ${facturacion.postal}`);
        if (facturacion.telefono)     L.push(`- *Tel.:* ${facturacion.telefono}`);
        if (facturacion.email)        L.push(`- *Email:* ${facturacion.email}`);
        if (facturacion.notas) { L.push(''); L.push(`*Notas del pedido:* ${facturacion.notas}`); }

        L.push('');
        L.push('*RESUMEN DE PEDIDO*');
        cart.forEach(it => {
            L.push(`- *${it.quantity}x* ${it.name} (Color: ${it.color}, Talla: ${it.size})`);
        });
        if (totales.subtotal) L.push(`\n*Subtotal:* ${totales.subtotal}`);
        if (totales.envio)    L.push(`*Envío:* ${totales.envio}`);
        if (totales.total)    L.push(`*Total:* ${totales.total}`);

        L.push('');
        L.push(`*Método de Pago:* ${metodo}`);
        return L.join('\n');
    }

    function createPaymentModal() {
        // Quitar cualquier instancia previa
        document.querySelector('.payment-modal-overlay')?.remove();
        
        // Overlay de pantalla completa
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'payment-modal-overlay payment-fullscreen';
        modalOverlay.setAttribute('role', 'dialog');
        modalOverlay.setAttribute('aria-modal', 'true');

        modalOverlay.innerHTML = `
            <div class="payment-modal-content">
                <div class="pmc-header">
                    <button class="close-btn" aria-label="Cerrar">&times;</button>
                    <div class="modal-progress-bar">
                        <div class="progress-header">
                            <h4 id="current-step-title">Datos y Resumen</h4>
                        </div>
                        <div class="progress-line-container">
                            <div class="progress-line-active"></div>
                        </div>
                    </div>
                </div>

                <div class="modal-views-container">
                    <!-- PASO 1: Formulario + Resumen (layout responsivo) -->
                    <section class="modal-view active" id="view-1">
                      <div class="two-col">
                        <div class="col form-col">
                          <div class="form-grid">
                            <input type="text" id="recipient-name" placeholder="Nombre *" autocomplete="given-name" required>
                            <input type="text" id="recipient-lastname" placeholder="Apellidos *" autocomplete="family-name" required>
                            <select id="billing-country" required>
                              <option value="Colombia" selected>Colombia</option>
                            </select>
                            <!-- NUEVO: CC/Pasaporte obligatorio -->
                            <input type="text" id="billing-id" placeholder="CC / Pasaporte *" autocomplete="off" required>

                            <input type="text" id="shipping-address" placeholder="Dirección de la calle *" autocomplete="address-line1" required>
                            <input type="text" id="shipping-address-2" placeholder="Apartamento, habitación, etc. (opcional)" autocomplete="address-line2">
                            <!-- CAMBIO: Población -> Ciudad -->
                            <input type="text" id="billing-city" placeholder="Ciudad *" autocomplete="address-level2" required>
                            <input type="text" id="billing-state" placeholder="Departamento *" autocomplete="address-level1" required>
                            <input type="text" id="billing-postcode" placeholder="Código postal (opcional)" autocomplete="postal-code">
                            <input type="tel"  id="billing-phone" placeholder="Teléfono (opcional)" autocomplete="tel">
                            <input type="email" id="billing-email" placeholder="Correo electrónico *" autocomplete="email" required>
                            <textarea id="order-notes" placeholder="Notas del pedido (opcional)"></textarea>
                          </div>
                          <div class="modal-actions">
                              <button id="to-step-2" class="modal-btn primary" disabled>Continuar</button>
                          </div>
                        </div>

                        <aside class="col summary-col">
                          <div class="summary-card">
                            <h5 class="summary-title">Tu pedido</h5>
                            <div id="live-billing-preview" class="billing-preview"></div>
                            <div class="summary-divider"></div>
                            <div id="cart-lines"></div>
                            <div class="summary-totals">
                              <div class="row br"><span>Subtotal</span><span id="summary-subtotal">—</span></div>
                              <div class="row br"><span>Envío</span><span id="summary-shipping">—</span></div>
                              <div class="row total"><span>Total</span><span id="summary-total">—</span></div>
                            </div>
                          </div>
                        </aside>
                      </div>
                    </section>
                    
                    <!-- PASO 2: Método de pago + instrucciones -->
                    <section class="modal-view" id="view-2">
                        <div class="payment-options">
                            <div class="payment-option">
                                <input type="radio" id="pay-addi" name="payment_method" value="ADDI">
                                <label for="pay-addi" class="payment-label-flex">
                                    <img src="addi_logo_480x480.png" alt="Addi">
                                    <span>Paga a cuotas con ADDI</span>
                                </label>
                            </div>
                            <div class="payment-option">
                                <input type="radio" id="pay-nequi-davi" name="payment_method" value="Nequi / Daviplata">
                                <label for="pay-nequi-davi" class="payment-label-flex">
                                    <div class="payment-icon-wrapper">
                                        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSv733vhzl4XlJCl13S1VvTQ6gfwbpw_eZV_g&s" alt="Nequi">
                                        <img src="https://images.seeklogo.com/logo-png/45/3/daviplata-logo-png_seeklogo-457809.png" alt="Daviplata">
                                    </div>
                                    <span>Nequi / Daviplata</span>
                                </label>
                            </div>
                            <div class="payment-option">
                                <input type="radio" id="pay-bancolombia" name="payment_method" value="Transferencia Bancolombia">
                                <label for="pay-bancolombia" class="payment-label-flex">
                                    <img src="https://images.seeklogo.com/logo-png/42/1/bancolombia-logo-png_seeklogo-428092.png" alt="Bancolombia">
                                    <span>Transferencia Bancolombia</span>
                                </label>
                            </div>
                            <div class="payment-option">
                                <input type="radio" id="pay-bold" name="payment_method" value="Tarjeta Crédito/Débito (Bold)">
                                <label for="pay-bold" class="payment-label-flex">
                                    <img src="https://images.seeklogo.com/logo-png/47/2/bold-logo-png_seeklogo-479645.png" alt="Bold">
                                    <span>Tarjeta Crédito/Débito (via Bold)</span>
                                </label>
                            </div>
                            <!-- Contra Entrega -->
                            <div class="payment-option">
                                <input type="radio" id="pay-cod" name="payment_method" value="Contra Entrega">
                                <label for="pay-cod" class="payment-label-flex">
                                    <span>Contra Entrega</span>
                                </label>
                            </div>
                        </div>

                        <div id="payment-instructions-content" class="instructions"></div>

                        <div class="modal-actions">
                          <button id="to-step-3" class="modal-btn primary" disabled>Ir a WhatsApp</button>
                        </div>
                    </section>

                    <!-- PASO 3: Copiar + abrir WhatsApp -->
                    <section class="modal-view" id="view-3">
                        <p class="wa-note">Al continuar se copiará tu pedido y se abrirá WhatsApp con el ticket listo para enviar.</p>
                        <textarea id="whatsapp-message-textarea" readonly style="display:none;"></textarea>
                        <div class="modal-actions">
                          <button id="copy-open-wa" class="modal-btn primary">Copiar y abrir WhatsApp</button>
                        </div>
                    </section>
                </div>
            </div>`;
        document.body.appendChild(modalOverlay);

        // --- Estilos internos (pantalla completa + responsive, líneas reforzadas) ---
        const styles = document.createElement('style');
        styles.innerHTML = `
            .payment-fullscreen{
                position: fixed; inset: 0; background:#fff; z-index: 9999;
                display:flex; flex-direction:column; overflow:auto;
            }
            .payment-modal-content{
                width: 100%; min-height: 100%;
                display:flex; flex-direction:column;
            }
            .pmc-header{ position: sticky; top:0; background:#fff; z-index:1; padding: 14px 16px 12px; border-bottom:1px solid rgba(0,0,0,.12); }
            .close-btn{
                position: absolute; right: 16px; top: 10px; font-size: 28px; line-height: 1;
                background: transparent; border: 0; cursor: pointer; color:#333;
            }

            /* Contenedor central: centrado y con ancho máximo en escritorio */
            .modal-views-container{ width:100%; max-width: 1200px; margin: 0 auto; padding: 18px; flex:1; }

            /* Progreso */
            .progress-header{ text-align:center; margin-bottom:.6rem; position:relative; height:24px; }
            #current-step-title{ font-size:1rem; font-weight:600; color:#333; text-transform:uppercase; letter-spacing:1px; }
            .progress-line-container{ width:100%; height:4px; background:rgba(0,0,0,.08); border-radius:4px; overflow:hidden; }
            .progress-line-active{ height:100%; background:#1a1a1a; border-radius:4px; width:0%; transition: width .4s ease; }

            /* Vistas */
            .modal-view{ display:none; }
            .modal-view.active{ display:block; }
            .modal-actions{ display:flex; justify-content:flex-end; gap:10px; margin-top:14px; }
            .modal-btn{ appearance:none; border:0; border-radius:10px; padding:12px 16px; cursor:pointer; font-weight:700; }
            .modal-btn.primary{ background:#111; color:#fff; }
            .modal-btn.primary:disabled{ opacity:.4; cursor:not-allowed; }

            /* Paso 1 layout - PC / Tablet / Mobile */
            .two-col{
                display:grid;
                grid-template-columns: minmax(0,1fr) 400px; /* PC por defecto */
                gap: 26px;
                align-items: start;
            }
            /* tablet landscape/laptop angosto */
            @media (min-width: 1025px) and (max-width: 1199px){
                .two-col{ grid-template-columns: minmax(0,1fr) 360px; gap:22px; }
            }
            /* tablet y móvil */
            @media (max-width: 1024px){
                .two-col{ grid-template-columns: 1fr; gap:18px; }
            }

            .form-grid{ display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .form-grid input, .form-grid select, .form-grid textarea{
                width:100%; padding:12px 14px; border:1px solid rgba(0,0,0,.18); border-radius:8px; font-size:.95rem;
                background:#fff;
            }
            .form-grid textarea{ grid-column: span 2; min-height: 96px; }
            #shipping-address, #shipping-address-2, #billing-email{ grid-column: span 2; }
            @media (max-width: 640px){
                .form-grid{ grid-template-columns: 1fr; gap: 10px; }
                #shipping-address, #shipping-address-2, #billing-email{ grid-column: span 1; }
                .modal-actions{ justify-content:stretch; }
                .modal-btn{ width:100%; padding:14px 16px; }
            }

            /* RESUMEN: líneas reforzadas y legibles */
            .summary-col{ position: sticky; top: 92px; height: fit-content; align-self: start; }
            .summary-card{
                border:1px solid rgba(0,0,0,.12); border-radius:12px; padding:16px; background:#fff;
                box-shadow: 0 1px 2px rgba(0,0,0,.03);
            }
            .summary-title{ font-size:1.1rem; margin:0 0 10px; }
            .billing-preview{
                font-size:.92rem; color:#333; line-height:1.45; display:grid; gap:8px;
                border:1px solid rgba(0,0,0,.08); border-radius:8px; padding:10px 12px; background:#fafafa;
            }
            .billing-preview .line{ display:flex; justify-content:space-between; gap:10px; border-bottom:1px solid rgba(0,0,0,.08); padding:4px 0; }
            .billing-preview .line:last-child{ border-bottom:0; }

            .summary-divider{ height:1px; background:linear-gradient(to right, rgba(0,0,0,.10), rgba(0,0,0,.02)); margin:12px 0; }

            #cart-lines .item{
                display:flex; justify-content:space-between; gap:10px; font-size:.92rem; padding:8px 0;
                border-bottom:1px solid rgba(0,0,0,.10);
            }
            #cart-lines .item:last-child{ border-bottom:0; }
            #cart-lines .meta{ color:#555; font-size:.85rem; }

            .summary-totals{ margin-top: 10px; border-top:2px solid rgba(0,0,0,.12); }
            .summary-totals .row{
                display:flex; justify-content:space-between; padding:10px 0;
                border-bottom:1px dashed rgba(0,0,0,.14);
            }
            .summary-totals .row.br{ border-bottom:1px dashed rgba(0,0,0,.14); }
            .summary-totals .row.total{
                border-bottom:0; font-weight:800; font-size:1.02rem;
            }

            /* Paso 2 */
            .payment-options{ display:grid; grid-template-columns: 1fr; gap:10px; }
            .payment-option{
                border:1px solid rgba(0,0,0,.12); border-radius:10px; padding:8px 12px;
                display:flex; align-items:center; gap:10px; background:#fff;
            }
            .payment-label-flex{ display:flex; align-items:center; gap:12px; padding:.4rem 0; width:100%; }
            .payment-label-flex img{ height:26px; max-width:110px; object-fit:contain; }
            .payment-icon-wrapper{ display:flex; align-items:center; gap:10px; }
            .payment-icon-wrapper img{ height:22px; }
            .instructions{ margin-top:12px; }
            .payment-details-box{
                border:1px solid rgba(0,0,0,.12); border-radius:10px; padding:14px; background:#fff;
            }
            .payment-info-line{
                display:flex; align-items:center; justify-content:center; gap:10px;
                background:#f5f7f9; padding:10px; border-radius:8px; margin:10px 0;
                border:1px solid rgba(0,0,0,.08);
            }
            .modal-btn-copy{ background:#555; color:#fff; border:0; padding:6px 10px; border-radius:6px; cursor:pointer; }

            /* Paso 3 */
            .wa-note{ font-size:.95rem; color:#555; text-align:center; margin:10px 0 14px; }

            /* Ajustes extra para pantallas retina: aseguran que las líneas se noten */
            @supports (-webkit-touch-callout: none) {
              .summary-divider { background: rgba(0,0,0,.12); }
              .billing-preview .line, #cart-lines .item { border-color: rgba(0,0,0,.16); }
            }
        `;
        modalOverlay.querySelector('.payment-modal-content').appendChild(styles);

        setTimeout(() => modalOverlay.classList.add('active'), 10);
        
        // ---------- Progreso ----------
        const views = modalOverlay.querySelectorAll('.modal-view');
        const progressLine = modalOverlay.querySelector('.progress-line-active');
        const stepTitles = ["Datos y Resumen", "Método de Pago", "WhatsApp"];
        const currentStepTitleEl = modalOverlay.querySelector('#current-step-title');

        const goToView = (n) => {
            const pct = ((n - 1) / (stepTitles.length - 1)) * 100;
            progressLine.style.width = `${pct}%`;
            currentStepTitleEl.textContent = stepTitles[n - 1] || stepTitles[stepTitles.length - 1];
            views.forEach(v => v.classList.remove('active'));
            modalOverlay.querySelector(`#view-${n}`)?.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        // ---------- Resumen de carrito ----------
        function renderCartSummaryPanel() {
            const cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
            const linesEl = modalOverlay.querySelector('#cart-lines');
            const subEl = modalOverlay.querySelector('#summary-subtotal');
            const shipEl = modalOverlay.querySelector('#summary-shipping');
            const totEl = modalOverlay.querySelector('#summary-total');

            linesEl.innerHTML = '';
            let subtotal = 0;
            cart.forEach(it => {
                subtotal += it.price * it.quantity;
                linesEl.innerHTML += `
                  <div class="item">
                    <div>
                      <div>${it.quantity}× ${it.name}</div>
                      <div class="meta">Color: ${it.color} • Talla: ${it.size}</div>
                    </div>
                    <div>${formatCurrency(it.price * it.quantity)}</div>
                  </div>`;
            });

            subEl.textContent = formatCurrency(subtotal);
            const envio = 13000; // ajusta si usas otro valor o lo tomas del DOM
            shipEl.textContent = `$${Number(envio).toLocaleString('es-CO')}`;
            totEl.textContent = formatCurrency(subtotal + envio);
        }

        // ---------- Vista previa de facturación ----------
        function updateBillingPreview() {
            const pv = modalOverlay.querySelector('#live-billing-preview');
            const d = collectBillingData(modalOverlay);
            pv.innerHTML = `
              <div class="line"><strong>Nombre:</strong><span>${(d.nombre||'')} ${(d.apellidos||'')}</span></div>
              <div class="line"><strong>CC/Pasaporte:</strong><span>${d.cc||''}</span></div>
              <div class="line"><strong>País:</strong><span>${d.pais||''}</span></div>
              <div class="line"><strong>Dirección:</strong><span>${d.direccion||''}${d.direccion2?(' - '+d.direccion2):''}</span></div>
              <div class="line"><strong>Ciudad/Depto:</strong><span>${d.ciudad||''}${d.departamento?(' / '+d.departamento):''}</span></div>
              <div class="line"><strong>Código Postal:</strong><span>${d.postal||''}</span></div>
              <div class="line"><strong>Teléfono:</strong><span>${d.telefono||''}</span></div>
              <div class="line"><strong>Email:</strong><span>${d.email||''}</span></div>
              ${d.notas ? `<div class="line"><strong>Notas:</strong><span>${d.notas}</span></div>` : ''}`;
        }

        // Inicializar paneles
        renderCartSummaryPanel();
        updateBillingPreview();

        // ---------- Validación Paso 1 ----------
        // Campos obligatorios, incluyendo CC/Pasaporte
        const requiredIds = [
            '#recipient-name',
            '#recipient-lastname',
            '#billing-id',
            '#shipping-address',
            '#billing-city',
            '#billing-state',
            '#billing-email'
        ];
        const btnToStep2 = modalOverlay.querySelector('#to-step-2');
        function validateStep1() {
            const ok = requiredIds.every(sel => (modalOverlay.querySelector(sel)?.value || '').trim().length > 0);
            btnToStep2.disabled = !ok;
        }
        modalOverlay.querySelectorAll('#view-1 input, #view-1 textarea, #view-1 select').forEach(el => {
            el.addEventListener('input', () => { updateBillingPreview(); validateStep1(); });
            el.addEventListener('change', () => { updateBillingPreview(); validateStep1(); });
        });
        validateStep1();
        btnToStep2.addEventListener('click', () => goToView(2));

        // ---------- Paso 2: Método de pago + instrucciones ----------
        let selectedPaymentMethod = '';
        const btnToStep3 = modalOverlay.querySelector('#to-step-3');
        const instructionsContainer = modalOverlay.querySelector('#payment-instructions-content');

        function renderInstructions(method) {
            const totalText = modalOverlay.querySelector('#summary-total')?.textContent || 'N/A';
            const box = (inner) => `<div class="payment-details-box">${inner}</div>`;
            const totalBox = `<div class="payment-info-line"><strong>Total:</strong> <span>${totalText}</span></div>`;
            let html = '';
            switch (method) {
                case 'ADDI':
                    html = box(`${totalBox}<p>Para pagar con <strong>ADDI</strong>, te enviaremos un link seguro por WhatsApp.</p>`);
                    break;
                case 'Nequi / Daviplata':
                    html = box(`${totalBox}
                        <p>Envía el pago a:</p>
                        <div class="payment-info-line"><strong id="nequi-number">300 500 1484</strong>
                        <button id="copy-nequi-btn" class="modal-btn-copy">Copiar</button></div>
                        <p style="font-size:.85rem;color:#777">Guarda el comprobante para adjuntarlo por WhatsApp.</p>`);
                    break;
                case 'Transferencia Bancolombia':
                    html = box(`${totalBox}
                        <p>Cuenta de Ahorros <strong>Bancolombia</strong>:</p>
                        <div class="payment-info-line" style="flex-direction:column;align-items:flex-start;">
                          <div><strong>Titular:</strong> ALEJANDRA BOLAÑOZ MONTILLA</div>
                          <div><strong>N° Cuenta:</strong> <span id="bancolombia-number">567 079227 75</span></div>
                        </div>
                        <button id="copy-bancolombia-btn" class="modal-btn-copy">Copiar Número de Cuenta</button>
                        <p style="font-size:.85rem;color:#777">Guarda el comprobante para adjuntarlo por WhatsApp.</p>`);
                    break;
                case 'Tarjeta Crédito/Débito (Bold)':
                    html = box(`${totalBox}<p>Te enviaremos un <strong>link de pago Bold</strong> por WhatsApp.</p>`);
                    break;
                case 'Contra Entrega':
                    html = box(`${totalBox}<p><strong>Contra Entrega:</strong> Pagas en efectivo al recibir.</p>`);
                    break;
            }
            instructionsContainer.innerHTML = html;

            const copy = (sel, btnSel) => {
                const btn = modalOverlay.querySelector(btnSel);
                if (!btn) return;
                btn.addEventListener('click', (e) => {
                    const text = modalOverlay.querySelector(sel)?.textContent || '';
                    navigator.clipboard.writeText(text).then(()=>{
                        const t = e.target, o = t.textContent;
                        t.textContent = 'Copiado';
                        setTimeout(()=> t.textContent = o, 1200);
                    });
                });
            };
            copy('#nequi-number', '#copy-nequi-btn');
            copy('#bancolombia-number', '#copy-bancolombia-btn');
        }

        modalOverlay.querySelectorAll('input[name="payment_method"]').forEach(r => {
            r.addEventListener('change', (e) => {
                selectedPaymentMethod = e.target.value;
                btnToStep3.disabled = !selectedPaymentMethod;
                renderInstructions(selectedPaymentMethod);
            });
        });
        btnToStep3.addEventListener('click', () => goToView(3));

        // ---------- Paso 3: Copiar + abrir WhatsApp ----------
        function buildCurrentTicket() {
            const cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
            const subtotalText = modalOverlay.querySelector('#summary-subtotal')?.textContent || '';
            const envioText = modalOverlay.querySelector('#summary-shipping')?.textContent || '';
            const totalText = modalOverlay.querySelector('#summary-total')?.textContent || '';
            const billing = collectBillingData(modalOverlay);
            const orderId = genOrderId();
            return buildTicket({
                orderId,
                cart,
                totales: { subtotal: subtotalText, envio: envioText, total: totalText },
                metodo: selectedPaymentMethod || 'No especificado',
                facturacion: billing
            });
        }

        modalOverlay.querySelector('#copy-open-wa').addEventListener('click', () => {
            const ticketText = buildCurrentTicket();
            const ta = modalOverlay.querySelector('#whatsapp-message-textarea');
            if (ta) ta.value = ticketText;

            navigator.clipboard.writeText(ticketText).then(()=> {
                const url = waLink(DIMONTI_WA, ticketText);
                window.open(url, '_blank', 'noopener');

                localStorage.setItem('dimontiCart', JSON.stringify([]));
                renderCart();
                window.updateCartIcon();

                modalOverlay.classList.remove('active');
                setTimeout(() => modalOverlay.remove(), 200);
            });
        });

        // ---------- Cierre ----------
        const closeModal = () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => modalOverlay.remove(), 200);
        };
        modalOverlay.querySelector('.close-btn').addEventListener('click', closeModal);
    }
});
