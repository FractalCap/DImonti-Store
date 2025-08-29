document.addEventListener('DOMContentLoaded', function() {
    const productLoader = document.getElementById('product-loader');
    const productContent = document.getElementById('product-content');

    if (productLoader) {
        productLoader.classList.remove('hidden');
    }
    
    const googleAppScriptURL = 'https://script.google.com/macros/s/AKfycbysClDl6CLykCAISlysMUPeigdnS1w5vPPchWTjb_hKplY_646JjXKYdR-55rGOdU_0/exec';
    
    const colorMap = {
        'negro clásico': '#000000', 'negro': '#000000', 'blanco puro': '#FFFFFF',
        'blanco': '#FFFFFF', 'plateado metálico': '#C0C0C0', 'plateado': '#C0C0C0',
        'dorado/blanco': '#FFD700', 'dorado': '#FFD700', 'azul eléctrico': '#007FFF',
        'azul': '#0000FF', 'rojo oscuro': '#8B0000', 'rojo': '#FF0000',
        'verde oscuro': '#006400', 'verde': '#006400', 'gris': '#808080',
        'rosado': '#FFC0CB', 'azul claro': '#ADD8E6', 'beige': '#F5F5DC',
        'cafe': '#a5652aff', 'verde claro': '#90EE90', 'morado oscuro': '#4B0082',
        'morado': '#800080', 'amarillo': '#FFFF00', 'naranja': '#FFA500',
        'amarillo neón': '#DFFF00'
    };

    function getColorCode(colorName) {
        if (!colorName) return '#CCCCCC';
        const normalizedName = String(colorName).toLowerCase().trim();
        return colorMap[normalizedName] || '#CCCCCC';
    }

    const params = new URLSearchParams(window.location.search);
    const groupId = params.get('group');

    if (!groupId) {
        if (productContent) {
            productContent.innerHTML = '<h1>Producto no encontrado.</h1>';
            productContent.classList.remove('content-hidden');
        }
        if (productLoader) productLoader.classList.add('hidden');
        return;
    }

    let productVariants = [];
    let currentVariant = {};

    async function CargarDetallesProducto() {
        try {
            const response = await fetch(googleAppScriptURL);
            if (!response.ok) throw new Error('Error de red al cargar los datos.');
            
            const todosLosProductos = await response.json();
            productVariants = todosLosProductos.filter(p => p.GroupID === groupId);

            if (productVariants.length > 0) {
                mostrarDetallesIniciales(productVariants);
                setupAddToCartButton();
            } else {
                if(productContent) productContent.innerHTML = `<h1>Producto no encontrado.</h1>`;
            }

        } catch (error) {
            console.error('Hubo un problema al cargar los detalles del producto:', error);
            if(productContent) productContent.innerHTML = `<h1>Hubo un error al cargar el producto.</h1>`;
        } finally {
            if (productContent) productContent.classList.remove('content-hidden');
            if (productLoader) productLoader.classList.add('hidden');
        }
    }

    function mostrarDetallesIniciales(variants) {
        document.getElementById('product-name').textContent = variants[0].ProductName;
        
        const colorPalette = document.getElementById('color-palette');
        colorPalette.innerHTML = '';

        variants.forEach((variant, index) => {
            const colorSwatch = document.createElement('div');
            colorSwatch.className = 'color-swatch';
            colorSwatch.style.backgroundColor = getColorCode(variant.ColorName);
            colorSwatch.title = variant.ColorName;
            colorSwatch.dataset.index = index;
            if (index === 0) colorSwatch.classList.add('active');
            colorPalette.appendChild(colorSwatch);
        });
        
        actualizarDetalles(variants[0]);
        setupColorSelectors();
        setupQuantitySelector();
    }
    
    function actualizarDetalles(variant) {
        currentVariant = variant;
        
        document.getElementById('sale-price').textContent = `$${Number(variant.SalePrice || 0).toLocaleString('es-CO')} COP`;
        document.getElementById('original-price').textContent = `$${Number(variant.Price || 0).toLocaleString('es-CO')} COP`;
        document.getElementById('main-product-image').src = variant.MainImage || '';

        const sizeSelector = document.getElementById('size-selector');
        sizeSelector.innerHTML = '';
        if (variant.SizesAvailable && String(variant.SizesAvailable).length > 0) {
            const sizes = String(variant.SizesAvailable).split(',').map(size => size.trim());
            sizes.forEach(size => {
                const sizeOption = document.createElement('button');
                sizeOption.className = 'size-option';
                sizeOption.textContent = size;
                sizeSelector.appendChild(sizeOption);
            });
        }
        setupSizeSelectors();
    }

    function setupColorSelectors() {
        const colors = document.querySelectorAll('.color-swatch');
        colors.forEach(color => {
            color.addEventListener('click', (event) => {
                colors.forEach(c => c.classList.remove('active'));
                event.target.classList.add('active');
                const variantIndex = parseInt(event.target.dataset.index);
                actualizarDetalles(productVariants[variantIndex]);
            });
        });
    }
    
    function setupSizeSelectors() {
        const sizes = document.querySelectorAll('.size-option');
        sizes.forEach(size => {
            size.addEventListener('click', (event) => {
                sizes.forEach(s => s.classList.remove('active'));
                event.target.classList.add('active');
            });
        });
    }

    function setupQuantitySelector() {
        const decreaseBtn = document.getElementById('decrease-qty');
        const increaseBtn = document.getElementById('increase-qty');
        const quantityInput = document.getElementById('quantity-input');

        decreaseBtn.addEventListener('click', () => {
            let currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) quantityInput.value = currentValue - 1;
        });

        increaseBtn.addEventListener('click', () => {
            let currentValue = parseInt(quantityInput.value);
            quantityInput.value = currentValue + 1;
        });
    }

    function setupAddToCartButton() {
        const addToCartBtn = document.querySelector('.add-to-cart-btn');
        const feedbackEl = document.getElementById('user-feedback');

        addToCartBtn.addEventListener('click', () => {
            const selectedSizeEl = document.querySelector('.size-option.active');
            const quantity = parseInt(document.getElementById('quantity-input').value);

            if (!selectedSizeEl) {
                showFeedback('Por favor, selecciona una talla.', 'error');
                return;
            }
            const selectedSize = selectedSizeEl.textContent;
            
            let cart = JSON.parse(localStorage.getItem('dimontiCart')) || [];
            const cartItemId = `${currentVariant.GroupID}-${currentVariant.ColorName}-${selectedSize}`;
            const existingItem = cart.find(item => item.id === cartItemId);

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.push({
                    id: cartItemId,
                    groupId: currentVariant.GroupID,
                    name: currentVariant.ProductName,
                    color: currentVariant.ColorName,
                    size: selectedSize,
                    price: Number(currentVariant.SalePrice),
                    image: currentVariant.MainImage,
                    quantity: quantity
                });
            }
            
            localStorage.setItem('dimontiCart', JSON.stringify(cart));
            
            // Actualizar icono y ABRIR el carrito desplegable
            window.updateCartIcon(); 
            window.openCart(); // <- ¡Llamada para abrir el carrito!
        });

        function showFeedback(message, type) {
            feedbackEl.textContent = message;
            feedbackEl.className = `user-feedback ${type}`;
            setTimeout(() => {
                feedbackEl.style.display = 'none';
                feedbackEl.className = 'user-feedback';
            }, 3000);
        }
    }

    CargarDetallesProducto();
});