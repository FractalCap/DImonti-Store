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
                cart.splice(itemIndex, 1);
            } else {
                cart[itemIndex].quantity = newQuantity;
            }
            localStorage.setItem('dimontiCart', JSON.stringify(cart));
            renderCart();
            window.updateCartIcon();
        }
    }
    
    // Delegación de eventos para manejar clics dentro del carrito
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
    // === INICIO: CÓDIGO ACTUALIZADO PARA EL MODAL DE PAGO MULTI-PASO ===
    // ===================================================================

    function createPaymentModal() {
        document.querySelector('.payment-modal-overlay')?.remove();
        
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'payment-modal-overlay';
        modalOverlay.innerHTML = `
            <div class="payment-modal-content">
                <button class="close-btn">&times;</button>
                
                <div class="modal-progress-bar">
                    <div class="progress-header">
                        <h4 id="current-step-title">Dirección</h4>
                    </div>
                    <div class="progress-line-container">
                        <div class="progress-line-active"></div>
                    </div>
                </div>
                <div class="modal-views-container">

                    <div class="modal-view active" id="view-1">
                        <div class="shipping-form">
                            <input type="text" id="recipient-name" placeholder="Nombre completo de quien recibe" autocomplete="name">
                            <input type="text" id="shipping-address" placeholder="Dirección completa (incluye ciudad y detalles)" autocomplete="street-address">
                        </div>
                        <div class="modal-actions">
                            <button id="continue-to-step-2" class="modal-btn primary" disabled>Continuar</button>
                        </div>
                    </div>
                    
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
                        </div>
                        <div class="modal-actions"><button id="continue-to-step-3" class="modal-btn primary" disabled>Continuar</button></div>
                    </div>

                    <div class="modal-view" id="view-3">
                        <div id="payment-instructions-content"></div>
                        <div class="modal-actions"><button id="continue-to-step-4" class="modal-btn primary">Continuar al Resumen</button></div>
                    </div>

                    <div class="modal-view" id="view-4">
                        <p style="font-size: 0.85rem; color: #555; margin-bottom: 15px; text-align: center;">Copia este mensaje para enviarlo por WhatsApp.</p>
                        <textarea id="whatsapp-message-textarea" readonly></textarea>
                        <div class="modal-actions"><button id="copy-order-btn" class="modal-btn primary">Copiar y Continuar</button></div>
                    </div>

                    <div class="modal-view" id="view-5">
                        <div class="modal-final-step">
                            <svg class="success-icon" style="color: #17a2b8;" xmlns="http://www.w3.org/2000/svg" height="60px" viewBox="0 0 512 512"><path fill="currentColor" d="M160 32c-35.3 0-64 28.7-64 64V320c0 35.3 28.7 64 64 64H352c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H160zM224 96a32 32 0 1 1 0 64 32 32 0 1 1 0-64zm64 32a16 16 0 1 1 32 0 16 16 0 1 1 -32 0zm-32 48a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm-80 80c0-26.5 21.5-48 48-48H320c26.5 0 48 21.5 48 48v32c0 26.5-21.5 48-48 48H176c-26.5 0-48-21.5-48-48V256z"/></svg>
                             <h4 style="margin-top: 1rem;">¡Importante!</h4>
                             <p>Asegúrate de tener a la mano el <strong>comprobante o captura de pantalla</strong> de tu pago. Lo necesitarás en el siguiente y último paso para confirmar tu pedido.</p>
                             <div class="modal-actions"><button id="continue-to-step-6" class="modal-btn primary">Entendido, continuar</button></div>
                        </div>
                    </div>
                    
                    <div class="modal-view" id="view-6">
                        <div class="modal-final-step">
                             <svg class="success-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>
                            <h4>¡Todo listo!</h4>
                            <p>Haz clic abajo para abrir WhatsApp. Pega el resumen de tu pedido y no olvides <strong>adjuntar el comprobante de pago</strong> para confirmar tu compra.</p>
                            <div class="modal-actions"><a href="#" id="open-whatsapp-btn" class="modal-btn whatsapp" target="_blank">Enviar a WhatsApp</a></div>
                        </div>
                    </div>

                </div>
            </div>`;
        document.body.appendChild(modalOverlay);

        const generalStyle = document.createElement('style');
        generalStyle.innerHTML = `
            /* --- General Modal Styles --- */
            .payment-modal-content { max-width: 580px; padding: 2.5rem; }
            
            /* --- Shipping Form --- */
            .shipping-form { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
            .shipping-form input {
                width: 100%;
                padding: 12px 15px;
                border: 1px solid #ccc;
                border-radius: 5px;
                font-size: 1rem;
            }
            .shipping-form input:focus { border-color: #333; outline: none; }

            /* --- Payment Method Labels --- */
            .payment-label-flex { display: flex; flex-direction: row; justify-content: start; align-items: center; gap: 15px; height: auto; padding: 1rem; }
            .payment-label-flex img { height: 28px; max-width: 110px; object-fit: contain; }
            .payment-icon-wrapper { display: flex; align-items: center; gap: 10px; }
            .payment-icon-wrapper img { height: 25px; }

            /* --- INICIO: ESTILOS DE BARRA DE PROGRESO REDISEÑADA --- */
            .modal-progress-bar {
                margin-bottom: 2.5rem;
                position: relative;
            }
            .progress-header {
                text-align: center;
                margin-bottom: 0.75rem;
                position: relative;
                height: 24px; /* Altura fija para evitar saltos de diseño */
            }
            #current-step-title {
                font-size: 1rem;
                font-weight: 600;
                color: #333;
                text-transform: uppercase;
                letter-spacing: 1px;
                position: absolute;
                width: 100%;
                left: 0;
                top: 0;
                opacity: 1;
                /* Transición para la animación de entrada/salida */
                transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
            }
            #current-step-title.exiting {
                opacity: 0;
                transform: translateY(-10px);
            }
            .progress-line-container {
                width: 100%;
                height: 4px;
                background-color: #e5e5e5;
                border-radius: 4px;
                position: relative;
                overflow: hidden;
            }
            .progress-line-active {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                background-color: #1a1a1a;
                border-radius: 4px;
                width: 0%;
                transition: width 0.5s cubic-bezier(0.65, 0, 0.35, 1);
            }
            /* --- FIN: ESTILOS DE BARRA DE PROGRESO REDISEÑADA --- */

            /* --- View Animation --- */
            @keyframes slideInFade {
                from { opacity: 0; transform: translateY(15px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .modal-view { display: none; }
            .modal-view.active { display: block; animation: slideInFade 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        `;
        modalOverlay.querySelector('.payment-modal-content').appendChild(generalStyle);

        setTimeout(() => modalOverlay.classList.add('active'), 10);
        
        const views = modalOverlay.querySelectorAll('.modal-view');
        const progressLine = modalOverlay.querySelector('.progress-line-active');
        
        // --- INICIO: LÓGICA PARA LA NUEVA BARRA DE PROGRESO ---
        const stepTitles = ["Dirección de Envío", "Método de Pago", "Realizar Pago", "Resumen del Pedido", "Adjuntar Comprobante", "Finalizar por WhatsApp"];
        const currentStepTitleEl = modalOverlay.querySelector('#current-step-title');

        const goToView = (viewNumber) => {
            // Actualizar la línea de progreso
            const progressPercentage = ((viewNumber - 1) / (stepTitles.length - 1)) * 100;
            progressLine.style.width = `${progressPercentage}%`;

            // Animar y cambiar el título del paso
            currentStepTitleEl.classList.add('exiting');
            setTimeout(() => {
                currentStepTitleEl.textContent = stepTitles[viewNumber - 1];
                currentStepTitleEl.classList.remove('exiting');
            }, 200);

            // Cambiar la vista principal
            views.forEach(v => v.classList.remove('active'));
            const activeView = modalOverlay.querySelector(`#view-${viewNumber}`);
            if(activeView) activeView.classList.add('active');
        };
        // --- FIN: LÓGICA PARA LA NUEVA BARRA DE PROGRESO ---


        // --- Variables para guardar los datos del cliente ---
        let recipientName = '';
        let shippingAddress = '';
        let selectedPaymentMethod = '';
        
        const copyToClipboard = (text, button) => {
            navigator.clipboard.writeText(text).then(() => {
                const originalText = button.textContent;
                button.textContent = '¡Copiado!';
                button.style.backgroundColor = '#28a745';
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.backgroundColor = '';
                }, 2000);
            });
        };

        // --- Lógica para PASO 1: Dirección ---
        const nameInput = modalOverlay.querySelector('#recipient-name');
        const addressInput = modalOverlay.querySelector('#shipping-address');
        const continueBtnStep1 = modalOverlay.querySelector('#continue-to-step-2');
        
        const validateStep1 = () => {
            continueBtnStep1.disabled = !(nameInput.value.trim() && addressInput.value.trim());
        };
        nameInput.addEventListener('input', validateStep1);
        addressInput.addEventListener('input', validateStep1);

        continueBtnStep1.addEventListener('click', () => {
            recipientName = nameInput.value.trim();
            shippingAddress = addressInput.value.trim();
            goToView(2);
        });

        // --- Lógica para PASO 2: Método de Pago ---
        const continueBtnStep2 = modalOverlay.querySelector('#continue-to-step-3');
        modalOverlay.querySelectorAll('input[name="payment_method"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                selectedPaymentMethod = e.target.value;
                continueBtnStep2.disabled = false;
            });
        });
        
        continueBtnStep2.addEventListener('click', () => {
            const instructionsContainer = modalOverlay.querySelector('#payment-instructions-content');
            const totalText = document.getElementById('cart-subtotal')?.textContent || 'N/A';
            let contentHTML = '';

            const totalBoxHTML = `<div class="total-to-pay-box"><span>Total a Pagar:</span><strong>${totalText}</strong></div>`;

            switch (selectedPaymentMethod) {
                case 'ADDI': // Lógica para ADDI
                    contentHTML = `<div class="payment-details-box">${totalBoxHTML}<p>¡Excelente elección! Para pagar con <strong>ADDI</strong>, necesitamos enviarte un link de pago seguro.</p><p>Por favor, continúa al siguiente paso, copia tu resumen de pedido y contáctanos por WhatsApp para recibir tu link de pago.</p></div>`;
                    break;
                case 'Nequi / Daviplata':
                    contentHTML = `<div class="payment-details-box">${totalBoxHTML}<p>Envía tu pago a la siguiente línea <strong>Nequi o Daviplata</strong>:</p><div class="payment-info-line"><strong id="nequi-number">300 500 1484</strong><button id="copy-nequi-btn" class="modal-btn-copy">Copiar</button></div><p class="payment-reminder">Recuerda tomar captura de pantalla del comprobante.</p></div>`;
                    break;
                case 'Transferencia Bancolombia':
                    contentHTML = `<div class="payment-details-box">${totalBoxHTML}<p>Realiza la transferencia a la siguiente <strong>Cuenta de Ahorros Bancolombia</strong>:</p><p class="payment-account-details"><strong>Titular:</strong> ALEJANDRA BOLAÑOZ MONTILLA<br><strong>N° Cuenta:</strong> <span id="bancolombia-number">567 079227 75</span></p><button id="copy-bancolombia-btn" class="modal-btn-copy full-width">Copiar Número de Cuenta</button><p class="payment-reminder">Recuerda tomar captura de pantalla del comprobante.</p></div>`;
                    break;
                case 'Tarjeta Crédito/Débito (Bold)':
                    contentHTML = `<div class="payment-details-box">${totalBoxHTML}<p>¡Perfecto! Para pagar con tarjeta, necesitamos enviarte un <strong>link de pago seguro de Bold</strong>.</p><p>Por favor, continúa al siguiente paso, copia tu resumen de pedido y contáctanos por WhatsApp para recibir tu link.</p></div>`;
                    break;
            }
            instructionsContainer.innerHTML = contentHTML;

            const style = document.createElement('style');
            style.innerHTML = `
                .payment-details-box { border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; text-align: center; }
                .payment-details-box p { margin-bottom: 1rem; color: #333; line-height: 1.5; }
                .payment-info-line { display: flex; align-items: center; justify-content: center; gap: 15px; background-color: #f9f9f9; padding: 10px; border-radius: 5px; margin-bottom: 1rem; }
                .payment-info-line strong { font-size: 1.2rem; color: #000; }
                .modal-btn-copy { background-color: #555; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; transition: background-color 0.3s; font-weight: 500; }
                .modal-btn-copy:hover { background-color: #333; }
                .modal-btn-copy.full-width { width: 100%; padding: 12px; margin-top: 10px; }
                .payment-account-details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; text-align: left;}
                .payment-reminder { font-size: 0.8rem; color: #888; margin-top: 1rem; margin-bottom: 0 !important; }
                .total-to-pay-box { background-color: #f0f8ff; border: 1px solid #b0e0e6; border-radius: 8px; padding: 15px; margin-bottom: 1.5rem; text-align: center; }
                .total-to-pay-box span { display: block; color: #555; font-size: 0.9rem; margin-bottom: 5px; }
                .total-to-pay-box strong { display: block; color: #000; font-size: 1.6rem; font-weight: 700; }
            `;
            instructionsContainer.appendChild(style);

            if (selectedPaymentMethod === 'Nequi / Daviplata') {
                modalOverlay.querySelector('#copy-nequi-btn').addEventListener('click', (e) => {
                    const number = modalOverlay.querySelector('#nequi-number').textContent;
                    copyToClipboard(number, e.target);
                });
            } else if (selectedPaymentMethod === 'Transferencia Bancolombia') {
                modalOverlay.querySelector('#copy-bancolombia-btn').addEventListener('click', (e) => {
                    const number = modalOverlay.querySelector('#bancolombia-number').textContent;
                    copyToClipboard(number, e.target);
                });
            }
            goToView(3);
        });

        // --- Lógica para PASO 3: Instrucciones de Pago ---
        modalOverlay.querySelector('#continue-to-step-4').addEventListener('click', () => {
            let cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
            let message = '¡Hola Dimonti Store! 👋\n\n';
            message += `*DATOS DE ENVÍO*\n`
            message += `*- Nombre:* ${recipientName}\n`;
            message += `*- Dirección:* ${shippingAddress}\n\n`;
            message += `*RESUMEN DE MI PEDIDO*\n`;
            
            cart.forEach(item => {
                message += `- *${item.quantity}x* ${item.name} (Color: ${item.color}, Talla: ${item.size})\n`;
            });
            const total = document.getElementById('cart-subtotal').textContent;
            message += `\n*Total del Pedido:* ${total}\n`;
            message += `*Método de Pago Elegido:* ${selectedPaymentMethod}`;
            modalOverlay.querySelector('#whatsapp-message-textarea').value = message;
            goToView(4);
        });
        
        // --- Lógica para PASO 4: Copiar Resumen ---
        modalOverlay.querySelector('#copy-order-btn').addEventListener('click', (e) => {
            const textToCopy = modalOverlay.querySelector('#whatsapp-message-textarea').value;
            copyToClipboard(textToCopy, e.target);
            setTimeout(() => goToView(5), 500);
        });

        // --- Lógica para PASO 5: Recordatorio Comprobante ---
        modalOverlay.querySelector('#continue-to-step-6').addEventListener('click', () => {
            goToView(6);
        });
        
        // --- Lógica para PASO 6: Enviar a WhatsApp ---
        const closeModal = () => {
            modalOverlay.classList.remove('active');
            setTimeout(() => modalOverlay.remove(), 300);
        };
        
        const whatsappNumber = '573016593662';
        const whatsappLink = `https://wa.me/${whatsappNumber}`;
        modalOverlay.querySelector('#open-whatsapp-btn').href = whatsappLink;

        modalOverlay.querySelector('#open-whatsapp-btn').addEventListener('click', () => {
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