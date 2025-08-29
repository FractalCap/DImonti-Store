document.addEventListener('DOMContentLoaded', function() {

    // --- Lógica para el carrusel de anuncios ---
    const announcementBar = document.querySelector('.announcement-bar');
    if (announcementBar) {
        const messages = [
            "APOYA LO NUESTRO: CALZADO NACIONAL DISPONIBLE 🇨🇴",
            "CALIDAD TOP: IMPORTADO 1.1 AAA LISTO PARA ENVÍO 📦",
            "CLÁSICOS QUE NO FALLAN: CONVERSE CALIDAD AAA",
            "GRAN ESTILO SIN ETIQUETAS: CALZADO IMPORTADO SIN MARCA"
        ];
        let currentMessageIndex = 0;
        const messageElement = announcementBar.querySelector('.announcement-bar__message');

        if (messageElement && messages.length > 0) {
            messageElement.textContent = messages[0];
        }
        
        setInterval(() => {
            currentMessageIndex = (currentMessageIndex + 1) % messages.length;
            messageElement.style.opacity = '0';
            setTimeout(() => {
                messageElement.textContent = messages[currentMessageIndex];
                messageElement.style.opacity = '1';
            }, 500);
        }, 5000);
    }

    // --- Lógica para la Tarjeta Lateral y Pop-up del Club ---
    const sidebarCard = document.querySelector('.club-sidebar-card');
    const popupOverlay = document.querySelector('.club-popup-overlay');
    const popupCloseBtn = document.querySelector('.club-popup-close');

    if (sidebarCard && popupOverlay && popupCloseBtn) {
        
        function openPopup() {
            popupOverlay.classList.add('active');
        }

        function closePopup() {
            popupOverlay.classList.remove('active');
        }

        sidebarCard.addEventListener('click', openPopup);
        popupCloseBtn.addEventListener('click', closePopup);

        popupOverlay.addEventListener('click', (event) => {
            if (event.target === popupOverlay) {
                closePopup();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && popupOverlay.classList.contains('active')) {
                closePopup();
            }
        });

        setTimeout(openPopup, 5000);
    }

    // --- Lógica para el efecto de scroll en el Header ---
    const header = document.querySelector('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('header-scrolled');
            } else {
                header.classList.remove('header-scrolled');
            }
        });
    }

    // --- Lógica para Animaciones en Scroll ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    }, {
        threshold: 0.25
    });

    const elementsToAnimate = document.querySelectorAll('.animate-on-scroll');
    elementsToAnimate.forEach(element => {
        observer.observe(element);
    });

    // --- LÓGICA PARA SLIDER DE TESTIMONIOS ---
    const slidesContainer = document.querySelector('.testimonial-slides');
    const slides = document.querySelectorAll('.testimonial-slide');
    const dotsContainer = document.querySelector('.testimonial-dots');

    if (slidesContainer && slides.length > 0 && dotsContainer) {
        let currentSlide = 0;
        let slideInterval;

        slides.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (index === 0) {
                dot.classList.add('active');
            }
            dot.addEventListener('click', () => {
                goToSlide(index);
                resetInterval();
            });
            dotsContainer.appendChild(dot);
        });
        
        const dots = document.querySelectorAll('.testimonial-dots .dot');

        function goToSlide(slideIndex) {
            slidesContainer.style.transform = `translateX(-${slideIndex * 100}%)`;
            dots.forEach(dot => dot.classList.remove('active'));
            dots[slideIndex].classList.add('active');
            currentSlide = slideIndex;
        }

        function nextSlide() {
            let next = currentSlide + 1;
            if (next >= slides.length) {
                next = 0;
            }
            goToSlide(next);
        }

        function startInterval() {
           slideInterval = setInterval(nextSlide, 7000);
        }

        function resetInterval() {
            clearInterval(slideInterval);
            startInterval();
        }

        startInterval();
    }
    
    // --- LÓGICA PARA LA BARRA DE BÚSQUEDA ---
    function setupSearch() {
        const searchInput = document.querySelector('.search-input');
        const shopSection = document.getElementById('shop-section');
        if (!searchInput || !shopSection) return;

        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase().trim();
            const productCards = document.querySelectorAll('.product-card-link');
            const categories = document.querySelectorAll('.shop-category');
            let firstMatch = null;

            productCards.forEach(card => {
                const productName = card.querySelector('.product-name').textContent.toLowerCase();
                if (productName.includes(searchTerm)) {
                    card.style.display = 'block';
                    if (!firstMatch) {
                        firstMatch = card;
                    }
                } else {
                    card.style.display = 'none';
                }
            });

            categories.forEach(category => {
                const visibleProducts = category.querySelectorAll('.product-card-link[style*="display: block"]');
                category.style.display = (visibleProducts.length > 0) ? 'block' : 'none';
            });

            if (firstMatch) {
                shopSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    setupSearch();

    // --- CÓDIGO PARA CARGA DE PRODUCTOS ---
    const googleAppScriptURL = 'https://script.google.com/macros/s/AKfycbysClDl6CLykCAISlysMUPeigdnS1w5vPPchWTjb_hKplY_646JjXKYdR-55rGOdU_0/exec';

    let productosCargados = false;

    async function CargarProductos() {
        if (productosCargados) return;
        productosCargados = true;

        try {
            const response = await fetch(googleAppScriptURL);
            if (!response.ok) {
                throw new Error('Error de red al cargar los datos.');
            }
            const productos = await response.json();
            
            const productosAgrupados = {};
            productos.forEach(producto => {
                const groupId = producto.GroupID;
                if (groupId && !productosAgrupados[groupId]) {
                    productosAgrupados[groupId] = producto;
                }
            });
            
            mostrarProductos(Object.values(productosAgrupados));

        } catch (error) {
            console.error('Hubo un problema al cargar los productos:', error);
            document.querySelectorAll('.product-grid').forEach(grid => {
                grid.innerHTML = '<p style="text-align: center; width: 100%;">No se pudieron cargar los productos.</p>';
            });
        }
    }

    function mostrarProductos(productos) {
        const gridNacional = document.querySelector('#calzado-nacional .product-grid');
        const gridImportadoAAA = document.querySelector('#importado-1-1-aaa .product-grid');
        const gridConverse = document.querySelector('#converse-aaa .product-grid');
        const gridSinMarca = document.querySelector('#importado-sin-marca .product-grid');

        gridNacional.innerHTML = '';
        gridImportadoAAA.innerHTML = '';
        gridConverse.innerHTML = '';
        gridSinMarca.innerHTML = '';

        productos.forEach(producto => {
            const nombreProducto = producto.ProductName || 'Nombre no disponible';
            const groupId = producto.GroupID;
            const precioVenta = producto.SalePrice || producto.Price || '0';
            const imagenPrincipal = producto.MainImage || 'placeholder.png';
            const categoriaProducto = (producto.Category || '').toUpperCase();

            const productoHTML = `
                <a href="product.html?group=${encodeURIComponent(groupId)}" class="product-card-link">
                    <div class="product-card animate-on-scroll">
                        <div class="product-image-container">
                            <div class="product-hover-overlay"><span>Ver Producto</span></div>
                            <img src="${imagenPrincipal}" alt="${nombreProducto}" loading="lazy">
                        </div>
                        <div class="product-info">
                            <h4 class="product-name">${nombreProducto}</h4>
                            <div class="product-price">
                                <span class="price">$${Number(precioVenta).toLocaleString('es-CO')} COP</span>
                            </div>
                        </div>
                    </div>
                </a>
            `;
            
            if (categoriaProducto.includes('NACI')) {
                gridNacional.innerHTML += productoHTML;
            } else if (categoriaProducto.includes('IMPORTADO 1.1 AAA')) {
                gridImportadoAAA.innerHTML += productoHTML;
            } else if (categoriaProducto.includes('CONVERSE AAA')) {
                gridConverse.innerHTML += productoHTML;
            } else if (categoriaProducto.includes('IMPORTADO SIN MARCA')) {
                gridSinMarca.innerHTML += productoHTML;
            }
        });

        const newProductCards = document.querySelectorAll('.product-card.animate-on-scroll');
        newProductCards.forEach(card => {
            observer.observe(card);
        });
    }

    const shopSection = document.getElementById('shop-section');
    if (shopSection) {
        const productLoadObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    CargarProductos();
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px 200px 0px' }); 

        productLoadObserver.observe(shopSection);
    }
    
    // --- CÓDIGO PARA EL FORMULARIO DEL CLUB (CON TU URL) ---
    function setupClubForm() {
        const clubForm = document.getElementById('club-signup-form');
        if (!clubForm) return;
        
        // URL de tu script de Google Apps, ya incorporada.
        const clubSignupURL = 'https://script.google.com/macros/s/AKfycbzC16Ovnouoh0a0f6oNUE43jYl54Y1qL38TP0tSMAk-4jgR3_zS_Tvvfgn24Ng2SEDh/exec'; 

        const feedbackEl = document.getElementById('club-form-feedback');
        const submitBtn = clubForm.querySelector('.form-submit-btn');

        clubForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (clubSignupURL === 'URL_DE_TU_NUEVO_SCRIPT_AQUÍ' || !clubSignupURL) {
                showFeedback('Error: La URL del formulario no está configurada.', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'ENVIANDO...';

            const formData = {
                name: document.getElementById('nombre').value,
                email: document.getElementById('email').value,
                whatsapp: document.getElementById('whatsapp').value,
                birthday: document.getElementById('cumpleanos').value
            };
            
            try {
                await fetch(clubSignupURL, {
                    method: 'POST',
                    mode: 'no-cors', 
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    redirect: 'follow',
                    body: JSON.stringify(formData)
                });
                
                showFeedback('¡Gracias por unirte al club!', 'success');
                clubForm.reset();
                setTimeout(() => {
                    const popupOverlay = document.querySelector('.club-popup-overlay');
                    if(popupOverlay) popupOverlay.classList.remove('active');
                }, 2000);

            } catch (error) {
                console.error('Error al enviar el formulario:', error);
                showFeedback('Hubo un error. Inténtalo de nuevo.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'SUSCRIBIRME';
            }
        });

        function showFeedback(message, type) {
            feedbackEl.textContent = message;
            feedbackEl.className = `user-feedback ${type}`;
            setTimeout(() => {
                 feedbackEl.className = 'user-feedback';
                 feedbackEl.textContent = '';
            }, 4000);
        }
    }

    setupClubForm();
});