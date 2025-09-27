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

    // --- Función para renderizar el contenido del carrito ---
    function renderCart() {
        const cartBody = sideCart.querySelector('.side-cart-body');
        const cartFooter = sideCart.querySelector('.side-cart-footer');
        let cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];

        // Vaciar contenido actual
        cartBody.innerHTML = '';
        cartFooter.innerHTML = '';

        if (cart.length === 0) {
            cartBody.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío.</p>';
            cartFooter.innerHTML = '';
            return;
        }

        let subtotal = 0;

        cart.forEach(item => {
            const itemHTML = `
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
                </div>
            `;
            cartBody.innerHTML += itemHTML;
            subtotal += item.price * item.quantity;
        });

        const footerHTML = `
            <div class="summary-row">
                <span>Subtotal:</span>
                <span id="cart-subtotal">${formatCurrency(subtotal)}</span>
            </div>
            <button class="checkout-btn">Finalizar Pedido</button>
        `;
        cartFooter.innerHTML = footerHTML;
    }
    
    // --- Actualizar cantidad / eliminar ---
    function updateCartItem(itemId, newQuantity) {
        let cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
        const itemIndex = cart.findIndex(item => item.id === itemId);

        if (itemIndex > -1) {
            if (newQuantity <= 0) {
                cart.splice(itemIndex, 1);
            } else {
                cart[itemIndex].quantity = newQuantity;
            }
            localStorage.setItem('dimontiCart', JSON.stringify(cart));
            renderCart();
            window.updateCartIcon();
        }
    }
    
    // Delegación de eventos dentro del carrito
    sideCart.addEventListener('click', (event) => {
        const target = event.target;
        
        const buttonTarget = target.closest('button');
        if (buttonTarget) {
            const itemId = buttonTarget.dataset.id;
            if (itemId) {
                const currentItem = (JSON.parse(localStorage.getItem('dimontiCart')) || []).find(item => item.id === itemId);
                if (!currentItem) return;

                if (buttonTarget.classList.contains('increase-qty')) {
                    updateCartItem(itemId, currentItem.quantity + 1);
                } else if (buttonTarget.classList.contains('decrease-qty')) {
                    updateCartItem(itemId, currentItem.quantity - 1);
                } else if (buttonTarget.classList.contains('remove-item-btn')) {
                    updateCartItem(itemId, 0);
                }
            }
        }
        
        if (target.classList.contains('checkout-btn')) {
            let cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
            if (cart.length === 0) {
                alert('Tu carrito está vacío.');
                return;
            }
            createPaymentModal();
        }
    });

    // --- Contador del ícono del carrito ---
    window.updateCartIcon = function() {
        const cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = totalItems;
        });
    };

    // Al cargar la página
    window.updateCartIcon();

    // ===================================================================
    // === MODAL DE PAGO (3 PASOS) =======================================
    // ===================================================================

    // Utilidades para WhatsApp + Ticket
    function waLink(phoneE164, text) {
        return `https://wa.me/${encodeURIComponent(phoneE164)}?text=${encodeURIComponent(text)}`;
    }
    function genOrderId() {
        return 'DIM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,8).toUpperCase();
    }
    function collectBillingData(root = document) {
        const get = sel => (root.querySelector(sel)?.value || '').trim();
        return {
            nombre:     get('#billing_first_name') || get('#recipient-name') || get('[name="billing_first_name"]'),
            apellidos:  get('#billing_last_name')  || get('[name="billing_last_name"]'),
            pais:       get('#billing_country')    || get('[name="billing_country"]') || 'Colombia',
            direccion:  get('#billing_address_1')  || get('#shipping-address') || get('[name="billing_address_1"]'),
            direccion2: get('#billing_address_2')  || get('[name="billing_address_2"]'),
            ciudad:     get('#billing_city')       || get('[name="billing_city"]'),
            departamento:get('#billing_state')     || get('[name="billing_state"]'),
            postal:     get('#billing_postcode')   || get('[name="billing_postcode"]'),
            telefono:   get('#billing_phone')      || get('[name="billing_phone"]'),
            email:      get('#billing_email')      || get('[name="billing_email"]'),
            notas:      get('#order_comments')     || get('[name="order_comments"]')
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
        document.querySelector('.payment-modal-overlay')?.remove();
        
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'payment-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="payment-modal-content">
                <button class="close-btn">&times;</button>
                
                <div class="modal-progress-bar">
                    <div class="progress-header">
                        <h4 id="current-step-title">Datos y Resumen</h4>
                    </div>
                    <div class="progress-line-container">
                        <div class="progress-line-active"></div>
                    </div>
                </div>
                <div class="modal-views-container">

                    <!-- PASO 1: Formulario + Resumen en Vivo (dos columnas) -->
                    <div class="modal-view active" id="view-1">
                      <div class="two-col">
                        <div class="col form-col">
                          <div class="form-grid">
                            <input type="text" id="recipient-name" placeholder="Nombre *" autocomplete="given-name">
                            <input type="text" id="recipient-lastname" placeholder="Apellidos *" autocomplete="family-name">
                            <select id="billing-country">
                              <option value="Colombia" selected>Colombia</option>
                            </select>
                            <input type="text" id="shipping-address" placeholder="Dirección de la calle *" autocomplete="address-line1">
                            <input type="text" id="shipping-address-2" placeholder="Apartamento, habitación, etc. (opcional)" autocomplete="address-line2">
                            <input type="text" id="billing-city" placeholder="Población *" autocomplete="address-level2">
                            <input type="text" id="billing-state" placeholder="Departamento *" autocomplete="address-level1">
                            <input type="text" id="billing-postcode" placeholder="Código postal (opcional)" autocomplete="postal-code">
                            <input type="tel"  id="billing-phone" placeholder="Teléfono (opcional)" autocomplete="tel">
                            <input type="email" id="billing-email" placeholder="Correo electrónico *" autocomplete="email">
                            <textarea id="order-notes" placeholder="Notas del pedido (opcional)"></textarea>
                          </div>
                          <div class="modal-actions">
                              <button id="to-step-2" class="modal-btn primary" disabled>Continuar</button>
                          </div>
                        </div>

                        <div class="col summary-col">
                          <div class="summary-card">
                            <h5 class="summary-title">Tu pedido</h5>
                            <div id="live-billing-preview" class="billing-preview">
                              <!-- Se llena en vivo con los datos -->
                            </div>
                            <div class="summary-divider"></div>
                            <div id="cart-lines"></div>
                            <div class="summary-totals">
                              <div class="row"><span>Subtotal</span><span id="summary-subtotal">—</span></div>
                              <div class="row"><span>Envío</span><span id="summary-shipping">—</span></div>
                              <div class="row total"><span>Total</span><span id="summary-total">—</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- PASO 2: Método de pago + instrucciones -->
                    <div class="modal-view" id="view-2">
                        <div class="payment-options" style="grid-template-columns: 1fr;">
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

                        <div id="payment-instructions-content" style="margin-top: 15px;"></div>

                        <div class="modal-actions">
                          <button id="to-step-3" class="modal-btn primary" disabled>Ir a WhatsApp</button>
                        </div>
                    </div>

                    <!-- PASO 3: Vista de resumen final (oculta el textarea; botón hace copiar+abrir) -->
                    <div class="modal-view" id="view-3">
                        <p style="font-size: 0.9rem; color: #555; margin-bottom: 10px; text-align: center;">Al continuar se copiará tu pedido y se abrirá WhatsApp con el ticket listo para enviar.</p>
                        <textarea id="whatsapp-message-textarea" readonly style="display:none;"></textarea>
                        <div class="modal-actions">
                          <button id="copy-open-wa" class="modal-btn primary">Copiar y abrir WhatsApp</button>
                        </div>
                    </div>

                </div>
            </div>`;
        document.body.appendChild(modalOverlay);

        // --- Estilos internos del modal (solo para esta vista) ---
        const styles = document.createElement('style');
        styles.innerHTML = `
            .payment-modal-content { max-width: 980px; padding: 2rem; }
            .two-col { display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; }
            @media (max-width: 900px){ .two-col { grid-template-columns: 1fr; } }

            .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .form-grid input, .form-grid select, .form-grid textarea {
                width: 100%; padding: 12px 14px; border: 1px solid #ccc; border-radius: 6px; font-size: .95rem;
            }
            .form-grid textarea { grid-column: span 2; min-height: 80px; }
            #recipient-name, #recipient-lastname, #billing-country, #billing-city, #billing-state { }
            #shipping-address, #shipping-address-2, #billing-email { grid-column: span 2; }

            .summary-card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; background: #fff; }
            .summary-title { font-size: 1.1rem; margin: 0 0 10px; }
            .billing-preview { font-size: .9rem; color: #333; line-height: 1.4; }
            .billing-preview .line { display:flex; justify-content: space-between; gap:10px; }
            .summary-divider { height: 1px; background: #eee; margin: 12px 0; }
            #cart-lines .item { display:flex; justify-content: space-between; gap: 10px; font-size: .9rem; margin: 6px 0; }
            #cart-lines .meta { color: #666; font-size: .85rem; }
            .summary-totals { margin-top: 10px; }
            .summary-totals .row { display:flex; justify-content: space-between; padding: 6px 0; }
            .summary-totals .row.total { border-top: 1px solid #eee; font-weight: 700; }

            /* Progreso */
            .modal-progress-bar { margin-bottom: 1rem; position: relative; }
            .progress-header { text-align: center; margin-bottom: .5rem; position: relative; height: 24px; }
            #current-step-title { font-size: 1rem; font-weight: 600; color: #333; text-transform: uppercase; letter-spacing: 1px; position: absolute; width: 100%; left: 0; top: 0; opacity: 1; transition: opacity .2s, transform .2s; }
            #current-step-title.exiting { opacity: 0; transform: translateY(-10px); }
            .progress-line-container { width: 100%; height: 4px; background-color: #e5e5e5; border-radius: 4px; overflow: hidden; }
            .progress-line-active { height: 100%; background-color: #1a1a1a; border-radius: 4px; width: 0%; transition: width .5s cubic-bezier(.65,0,.35,1); }

            /* Labels de métodos */
            .payment-label-flex { display:flex; align-items:center; gap: 15px; padding: .9rem; }
            .payment-label-flex img { height: 26px; max-width: 110px; object-fit: contain; }
            .payment-icon-wrapper { display:flex; align-items:center; gap: 10px; }
            .payment-icon-wrapper img { height: 23px; }

            /* Instrucciones */
            .payment-details-box { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-top: 10px; }
            .payment-info-line { display:flex; align-items:center; justify-content:center; gap:10px; background:#f9f9f9; padding:10px; border-radius:5px; margin:10px 0; }
            .modal-btn-copy { background:#555; color:#fff; border:0; padding:6px 10px; border-radius:5px; cursor:pointer; }
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
            currentStepTitleEl.classList.add('exiting');
            setTimeout(() => {
                currentStepTitleEl.textContent = stepTitles[n - 1] || stepTitles[stepTitles.length - 1];
                currentStepTitleEl.classList.remove('exiting');
            }, 180);
            views.forEach(v => v.classList.remove('active'));
            modalOverlay.querySelector(`#view-${n}`)?.classList.add('active');
        };

        // ---------- Rellenar resumen de carrito ----------
        function renderCartSummaryPanel() {
            const cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
            const linesEl = modalOverlay.querySelector('#cart-lines');
            const subEl = modalOverlay.querySelector('#summary-subtotal');
            const shipEl = modalOverlay.querySelector('#summary-shipping');
            const totEl = modalOverlay.querySelector('#summary-total');

            if (!linesEl) return;

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
            // Si manejas envío fijo, cámbialo aquí. Lo dejo como $13.000 si quieres replicar tu screenshot:
            const envio = 13000;
            shipEl.textContent = `$${Number(envio).toLocaleString('es-CO')}`;
            totEl.textContent = formatCurrency(subtotal + envio);
        }

        // ---------- Vista previa de facturación en vivo ----------
        function updateBillingPreview() {
            const pv = modalOverlay.querySelector('#live-billing-preview');
            if (!pv) return;
            const data = collectBillingData(modalOverlay);
            pv.innerHTML = `
              <div class="line"><strong>Nombre:</strong><span>${(data.nombre || '')} ${(data.apellidos || '')}</span></div>
              <div class="line"><strong>País:</strong><span>${data.pais || ''}</span></div>
              <div class="line"><strong>Dirección:</strong><span>${data.direccion || ''} ${data.direccion2 ? ' - ' + data.direccion2 : ''}</span></div>
              <div class="line"><strong>Ciudad/Depto:</strong><span>${data.ciudad || ''} ${data.departamento ? ' / ' + data.departamento : ''}</span></div>
              <div class="line"><strong>Código Postal:</strong><span>${data.postal || ''}</span></div>
              <div class="line"><strong>Teléfono:</strong><span>${data.telefono || ''}</span></div>
              <div class="line"><strong>Email:</strong><span>${data.email || ''}</span></div>
              ${data.notas ? `<div class="line"><strong>Notas:</strong><span>${data.notas}</span></div>` : ''}
            `;
        }

        // Inicializar paneles
        renderCartSummaryPanel();
        updateBillingPreview();

        // ---------- Validación Paso 1 ----------
        const requiredIds = ['#recipient-name','#recipient-lastname','#shipping-address','#billing-city','#billing-state','#billing-email'];
        const btnToStep2 = modalOverlay.querySelector('#to-step-2');

        function validateStep1() {
            const ok = requiredIds.every(sel => (modalOverlay.querySelector(sel)?.value || '').trim().length > 1);
            btnToStep2.disabled = !ok;
        }
        modalOverlay.querySelectorAll('#view-1 input, #view-1 textarea, #view-1 select').forEach(el => {
            el.addEventListener('input', () => { updateBillingPreview(); validateStep1(); });
            el.addEventListener('change', () => { updateBillingPreview(); validateStep1(); });
        });
        validateStep1();

        btnToStep2.addEventListener('click', () => {
            goToView(2);
        });

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
                if (btn) btn.addEventListener('click', (e) => {
                    const text = modalOverlay.querySelector(sel)?.textContent || '';
                    navigator.clipboard.writeText(text).then(()=>{
                        const t = e.target;
                        const o = t.textContent;
                        t.textContent = 'Copiado';
                        setTimeout(()=>t.textContent=o,1200);
                    });
                });
            };
            copy('#nequi-number', '#copy-nequi-btn');
            copy('#bancolombia-number', '#copy-bancolombia-btn');
        }

        modalOverlay.querySelectorAll('input[name="payment_method"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                selectedPaymentMethod = e.target.value;
                btnToStep3.disabled = !selectedPaymentMethod;
                renderInstructions(selectedPaymentMethod);
            });
        });

        btnToStep3.addEventListener('click', () => {
            goToView(3);
        });

        // ---------- Paso 3: Copiar + WhatsApp ----------
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

            // Copiar
            navigator.clipboard.writeText(ticketText).then(()=> {
                // Abrir WhatsApp
                const url = waLink(DIMONTI_WA, ticketText);
                window.open(url, '_blank', 'noopener');

                // Limpiar carrito y cerrar
                localStorage.setItem('dimontiCart', JSON.stringify([]));
                renderCart();
                window.updateCartIcon();

                modalOverlay.classList.remove('active');
                setTimeout(() => modalOverlay.remove(), 300);
            });
        });

        // ---------- Navegación y cierre ----------
        const closeModal = () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => modalOverlay.remove(), 300);
        };
        modalOverlay.querySelector('.close-btn').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }
});
