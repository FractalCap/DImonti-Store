document.addEventListener('DOMContentLoaded', function() {
    
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
        return `$${Number(value).toLocaleString('es-CO')} COP`;
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
            // Limpiar el footer si no hay items
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
    
    // --- Función para actualizar cantidad o eliminar ---
    function updateCartItem(itemId, newQuantity) {
        let cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
        const itemIndex = cart.findIndex(item => item.id === itemId);

        if (itemIndex > -1) {
            if (newQuantity <= 0) {
                cart.splice(itemIndex, 1); // Eliminar
            } else {
                cart[itemIndex].quantity = newQuantity; // Actualizar cantidad
            }
            localStorage.setItem('dimontiCart', JSON.stringify(cart));
            renderCart(); // Re-renderizar el carrito
            window.updateCartIcon(); // Actualizar el contador
        }
    }
    
    // Usar delegación de eventos para manejar clics dentro del carrito
    sideCart.addEventListener('click', (event) => {
        const target = event.target;
        
        // --- LÓGICA EXISTENTE PARA CANTIDAD Y ELIMINAR ---
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
                    updateCartItem(itemId, 0); // Cantidad 0 para eliminar
                }
            }
        }
        
        // --- NUEVA LÓGICA PARA EL BOTÓN DE FINALIZAR PEDIDO ---
        if (target.classList.contains('checkout-btn')) {
            let cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
            if (cart.length === 0) {
                alert('Tu carrito está vacío.');
                return;
            }
            createPaymentModal(); // Llamada a la nueva función del modal
        }
    });

    // --- Función para actualizar el contador del ícono del carrito ---
    window.updateCartIcon = function() {
        const cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = totalItems;
        });
    };

    // Actualizar el icono al cargar la página
    window.updateCartIcon();

    // ===================================================================
    // === INICIO: CÓDIGO PARA EL MODAL DE PAGO MULTI-PASO =============
    // ===================================================================

    function createPaymentModal() {
        // Eliminar cualquier modal que ya exista
        document.querySelector('.payment-modal-overlay')?.remove();
        
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'payment-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="payment-modal-content">
                <button class="close-btn">&times;</button>
                <div class="modal-progress-bar">
                    <div class="progress-steps-container">
                        <div class="progress-step active" data-step="1">Pago</div>
                        <div class="progress-step" data-step="2">Confirmar</div>
                        <div class="progress-step" data-step="3">Enviar</div>
                    </div>
                    <div class="progress-line-container"><div class="progress-line-active"></div></div>
                </div>
                <div class="modal-views-container">
                    <div class="modal-view active" id="view-1">
                        <h4>1. Elige tu método de pago</h4>
                        <div class="payment-options">
                            <div class="payment-option"><input type="radio" id="pay-nequi" name="payment_method" value="Nequi"><label for="pay-nequi"><img src="https://seeklogo.com/images/N/nequi-logo-5437E35250-seeklogo.com.png" alt="Nequi"><span>Nequi</span></label></div>
                            <div class="payment-option"><input type="radio" id="pay-daviplata" name="payment_method" value="Daviplata"><label for="pay-daviplata"><img src="https://www.logo.wine/a/logo/DaviPlata/DaviPlata-Logo.wine.svg" alt="Daviplata"><span>Daviplata</span></label></div>
                            <div class="payment-option"><input type="radio" id="pay-credit" name="payment_method" value="Tarjeta de Crédito (Bold)"><label for="pay-credit"><img src="https://bold.co/assets/images/logo-bold-604d5a957a.svg" alt="Bold"><span>Crédito</span></label></div>
                            <div class="payment-option"><input type="radio" id="pay-debit" name="payment_method" value="Tarjeta de Débito (Bold)"><label for="pay-debit"><img src="https://bold.co/assets/images/logo-bold-604d5a957a.svg" alt="Bold"><span>Débito</span></label></div>
                        </div>
                        <div class="modal-actions"><button id="continue-to-step-2" class="modal-btn primary" disabled>Continuar</button></div>
                    </div>
                    <div class="modal-view" id="view-2">
                        <h4>2. Copia el resumen de tu pedido</h4>
                        <textarea id="whatsapp-message-textarea" readonly></textarea>
                        <div class="modal-actions"><button id="copy-order-btn" class="modal-btn primary">Copiar y Continuar</button></div>
                    </div>
                    <div class="modal-view" id="view-3">
                        <div class="modal-final-step">
                            <svg class="success-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>
                            <h4>¡Pedido Copiado!</h4>
                            <p>Estás a un solo paso. Haz clic abajo para enviarnos tu pedido por WhatsApp.</p>
                            <div class="modal-actions"><a href="#" id="open-whatsapp-btn" class="modal-btn whatsapp" target="_blank">Enviar Pedido por WhatsApp</a></div>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modalOverlay);
        setTimeout(() => modalOverlay.classList.add('active'), 10);
        
        const views = modalOverlay.querySelectorAll('.modal-view');
        const progressLine = modalOverlay.querySelector('.progress-line-active');
        const progressSteps = modalOverlay.querySelectorAll('.progress-step');
        
        const goToView = (viewNumber) => {
            views.forEach(v => v.classList.remove('active'));
            modalOverlay.querySelector(`#view-${viewNumber}`).classList.add('active');
            progressSteps.forEach(step => step.classList.toggle('active', parseInt(step.dataset.step) <= viewNumber));
            progressLine.style.width = `${((viewNumber - 1) / (progressSteps.length - 1)) * 100}%`;
        };
        
        const continueBtn = modalOverlay.querySelector('#continue-to-step-2');
        let selectedPaymentMethod = '';
        
        modalOverlay.querySelectorAll('input[name="payment_method"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                selectedPaymentMethod = e.target.value;
                continueBtn.disabled = false;
            });
        });
        
        continueBtn.addEventListener('click', () => {
            let cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
            let message = '¡Hola Dimonti Store! 👋\n\nQuisiera hacer el siguiente pedido:\n\n';
            cart.forEach(item => {
                message += `- *${item.quantity}x* ${item.name} (Color: ${item.color}, Talla: ${item.size})\n`;
                // ===== CAMBIO REALIZADO AQUÍ =====
                message += `  Imagen: ${item.image}\n\n`; 
                // =================================
            });
            const total = document.getElementById('cart-subtotal').textContent;
            message += `*Total del Pedido:* ${total}\n`;
            message += `*Método de Pago:* ${selectedPaymentMethod}\n\n¡Quedo atento/a para coordinar!`;
            modalOverlay.querySelector('#whatsapp-message-textarea').value = message;
            goToView(2);
        });
        
        modalOverlay.querySelector('#copy-order-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(modalOverlay.querySelector('#whatsapp-message-textarea').value)
                .then(() => goToView(3));
        });
        
        const closeModal = () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => modalOverlay.remove(), 300);
        };
        
        // --- NÚMERO DE WHATSAPP ACTUALIZADO ---
        const whatsappNumber = '573016593662';
        
        const whatsappLink = `https://wa.me/${whatsappNumber}`;
        modalOverlay.querySelector('#open-whatsapp-btn').href = whatsappLink;

        modalOverlay.querySelector('#open-whatsapp-btn').addEventListener('click', () => {
            // Vaciar el carrito después de enviar
            localStorage.setItem('dimontiCart', JSON.stringify([]));
            renderCart();
            window.updateCartIcon();
            closeModal();
        });
        
        modalOverlay.querySelector('.close-btn').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }
});