
// Importa los estilos visuales de la aplicación.
import './css/style.css';
import { supabase } from './js/supabase.js';

// Importa las funciones para consultar la información almacenada en Supabase.
import {
    obtenerCategorias,
    obtenerEstablecimientos
} from './js/establecimientos.js';

// Importa las funciones para administrar los mapas de SIGECO-SOG.
import {
    inicializarMapa,
    mostrarEstablecimientosEnMapa,
    localizarEstablecimientoEnMapa,
    mostrarMapaDetalles
} from './js/mapa.js';

// Guarda los establecimientos que se están mostrando en los resultados.
let resultadosActuales = [];

// Construye la estructura principal de la página.
document.querySelector('#app').innerHTML = `
    <header class="header">
        <div class="container header-content">
            <a href="#" class="brand">
                <span class="brand-icon">S</span>
                <span>
                    <strong>SIGECO-SOG</strong>
                    <small>Oferta local de Sogamoso</small>
                </span>
            </a>

            <nav class="navigation">
                <a href="#inicio">Inicio</a>
                <a href="#categorias">Categorías</a>
                <a href="#mapa">Mapa</a>
                <a href="#acerca">Acerca del proyecto</a>
            </nav>

            <!-- Acceso discreto al módulo de administración. -->
<a
    href="#"
    class="admin-access"
    id="admin-access"
    aria-label="Acceso administrativo"
    title="Acceso administrativo"
>
    <span class="admin-access-icon">♙</span>
</a>
        </div>
    </header>

    <main>
        <section class="hero" id="inicio">
            <div class="container hero-content">
                <span class="eyebrow">SOGAMOSO · BOYACÁ</span>

                <h1>Descubre la oferta comercial y productiva de nuestra ciudad</h1>

                <p>
                    Conoce, localiza y consulta los establecimientos,
                    emprendimientos y unidades productivas de Sogamoso.
                </p>

                <form class="search-box" id="search-form">
                    <input
                        type="search"
                        id="search-input"
                        placeholder="¿Qué establecimiento o servicio buscas?"
                        aria-label="Buscar establecimientos"
                    >
                    <button type="submit">Buscar</button>
                    <button type="button" id="clear-search">Limpiar</button>
                </form>

                <p class="search-hint">
                    Explora negocios, productos, servicios y ubicaciones.
                </p>

                <div id="search-results" class="search-results"></div>
            </div>
        </section>

        <section class="section container" id="categorias">
            <div class="section-heading">
                <div>
                    <span class="eyebrow">EXPLORA</span>
                    <h2>Encuentra lo que necesitas</h2>
                    <p>Consulta la oferta local organizada por categorías.</p>
                </div>
            </div>

            <div class="category-grid" id="category-grid">
                <p>Cargando categorías...</p>
            </div>
        </section>

        <section class="map-section" id="mapa">
            <div class="container">
                <div class="section-heading">
                    <div>
                        <span class="eyebrow">UBICACIÓN GEOGRÁFICA</span>
                        <h2>Explora Sogamoso en el mapa</h2>
                        <p>
                            Consulta la distribución geográfica de los
                            establecimientos registrados en el sistema.
                        </p>
                    </div>
                </div>

                <div class="map-placeholder" id="map"></div>
            </div>
        </section>

        <section class="about-section container" id="acerca">
            <span class="eyebrow">SOBRE EL PROYECTO</span>
            <h2>Conectando la información de la oferta local</h2>
            <p>
                SIGECO-SOG es una iniciativa orientada a organizar,
                caracterizar y facilitar la consulta de establecimientos
                comerciales, emprendimientos y unidades productivas
                del municipio de Sogamoso, Boyacá.
            </p>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <strong>SIGECO-SOG</strong>
            <p>Sistema de Información Georreferenciada de Sogamoso, Boyacá.</p>
            <small>Proyecto académico · 2026</small>
        </div>
    </footer>
`;

// Prepara los textos para buscar sin importar tildes o mayúsculas.
function normalizarTexto(texto) {
    return (texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

// Protege los textos antes de mostrarlos dentro del HTML.
function escapeHTML(texto) {
    return String(texto).replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

// Obtiene los elementos del formulario de búsqueda.
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#search-input');
const resultsContainer = document.querySelector('#search-results');
const clearSearchButton = document.querySelector('#clear-search');

// Obtiene los elementos de la ventana flotante de detalles.
const detailsModal = document.querySelector('#details-modal');
const detailsContent = document.querySelector('#details-content');
const closeDetailsButton = document.querySelector('#close-details');
const detailsOverlay = document.querySelector('#details-overlay');
// Obtiene los elementos de la ventana de acceso administrativo.
const adminAccessButton = document.querySelector('#admin-access');
const adminModal = document.querySelector('#admin-modal');
const adminOverlay = document.querySelector('#admin-overlay');
const closeAdminButton = document.querySelector('#close-admin');
// Obtiene los elementos del formulario administrativo.
const adminLoginForm = document.querySelector('#admin-login-form');
const adminEmail = document.querySelector('#admin-email');
const adminPassword = document.querySelector('#admin-password');
const adminLoginMessage = document.querySelector('#admin-login-message');

// Gestiona el inicio de sesión del administrador.
adminLoginForm.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    // Función para mostrar notificaciones según el resultado.
    const mostrarMensaje = (mensaje, tipo) => {
        adminLoginMessage.textContent = mensaje;
        adminLoginMessage.className = `admin-login-message ${tipo}`;
    };

    mostrarMensaje('Verificando acceso...', 'loading');

    const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail.value.trim(),
        password: adminPassword.value
    });

    // Credenciales incorrectas.
    if (error) {
        mostrarMensaje('Correo o contraseña incorrectos.', 'warning');
        return;
    }

    // Comprueba el permiso administrativo.
    const { data: rol, error: errorRol } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

    // Usuario sin permisos.
    if (errorRol || !rol || rol.role !== 'admin') {
        await supabase.auth.signOut();
        mostrarMensaje('Acceso denegado. No tienes permisos administrativos.', 'error');
        return;
    }

    // Inicio de sesión correcto.
mostrarMensaje('¡Acceso autorizado! Bienvenido al panel administrativo.', 'success');

// Redirige al administrador al panel independiente.
setTimeout(() => {
    window.location.href = '/admin.html';
}, 1200);
});
// Abre la ventana al pulsar el icono administrativo.
adminAccessButton.addEventListener('click', (evento) => {
    evento.preventDefault();

    adminModal.classList.add('active');
    adminModal.setAttribute('aria-hidden', 'false');
});

// Cierra la ventana mediante el botón de cierre.
closeAdminButton.addEventListener('click', () => {
    adminModal.classList.remove('active');
    adminModal.setAttribute('aria-hidden', 'true');
});

// Cierra la ventana al pulsar sobre el fondo oscuro.
adminOverlay.addEventListener('click', () => {
    adminModal.classList.remove('active');
    adminModal.setAttribute('aria-hidden', 'true');
});

// Permite cerrar la ventana con la tecla Escape.
document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && adminModal.classList.contains('active')) {
        adminModal.classList.remove('active');
        adminModal.setAttribute('aria-hidden', 'true');
    }
});
// Administra los botones de las tarjetas de resultados.
document.addEventListener('click', (evento) => {

    // Comprueba si se pulsó el botón para localizar un establecimiento.
    const botonMapa = evento.target.closest('.locate-establishment');

    if (botonMapa) {
        const latitud = botonMapa.dataset.lat;
        const longitud = botonMapa.dataset.lng;

        // Centra el mapa principal en el establecimiento seleccionado.
        localizarEstablecimientoEnMapa(latitud, longitud);

        // Desplaza la página hasta la sección del mapa.
        setTimeout(() => {
            const seccionMapa = document.querySelector('#mapa');

            if (seccionMapa) {
                seccionMapa.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 150);

        return;
    }

    // Comprueba si se pulsó el botón para consultar los detalles.
    const botonDetalles = evento.target.closest('.details-establishment');

    if (botonDetalles) {
        const indice = Number(botonDetalles.dataset.index);
        const establecimiento = resultadosActuales[indice];

        // Comprueba que exista el establecimiento seleccionado.
        if (!establecimiento) {
            return;
        }

        // Construye la información que aparecerá en la ventana flotante.
        detailsContent.innerHTML = `
            <h3>${escapeHTML(establecimiento.nombre || 'Sin nombre')}</h3>

            <p><strong>Categoría:</strong>
                ${escapeHTML(establecimiento.categorias?.nombre || 'Sin categoría')}
            </p>

            <p><strong>Descripción:</strong>
                ${escapeHTML(establecimiento.descripcion || 'Sin descripción disponible')}
            </p>

            <p><strong>Dirección:</strong>
                ${escapeHTML(establecimiento.direccion || 'No registrada')}
            </p>

            <p><strong>Teléfono:</strong>
                ${escapeHTML(establecimiento.telefono || 'No registrado')}
            </p>

            <p><strong>Correo electrónico:</strong>
                ${escapeHTML(establecimiento.correo || 'No registrado')}
            </p>
        `;

        // Muestra la ventana flotante.
        detailsModal.classList.add('active');
        detailsModal.setAttribute('aria-hidden', 'false');

        // Muestra la ubicación en el segundo mapa.
        mostrarMapaDetalles(
            establecimiento.latitud,
            establecimiento.longitud
        );
    }
});

// Cierra la ventana flotante mediante el botón de cierre.
closeDetailsButton.addEventListener('click', () => {
    detailsModal.classList.remove('active');
    detailsModal.setAttribute('aria-hidden', 'true');
});

// Cierra la ventana al pulsar sobre el fondo oscuro.
detailsOverlay.addEventListener('click', () => {
    detailsModal.classList.remove('active');
    detailsModal.setAttribute('aria-hidden', 'true');
});

// Permite cerrar la ventana flotante con la tecla Escape.
document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && detailsModal.classList.contains('active')) {
        detailsModal.classList.remove('active');
        detailsModal.setAttribute('aria-hidden', 'true');
    }
});

// Realiza la búsqueda de establecimientos.
searchForm.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const busqueda = normalizarTexto(searchInput.value);

    // Comprueba que se haya escrito algo.
    if (!busqueda) {
        resultadosActuales = [];
        resultsContainer.innerHTML = '<p>Escribe algo para realizar la búsqueda.</p>';
        mostrarEstablecimientosEnMapa([]);
        return;
    }

    resultsContainer.innerHTML = '<p>Buscando establecimientos...</p>';

    // Consulta los establecimientos activos.
    const establecimientos = await obtenerEstablecimientos();

    // Compara el texto con el nombre, la descripción y la categoría.
    resultadosActuales = establecimientos.filter((establecimiento) => {
        const nombre = normalizarTexto(establecimiento.nombre);
        const descripcion = normalizarTexto(establecimiento.descripcion);
        const categoria = normalizarTexto(establecimiento.categorias?.nombre);

        return nombre.includes(busqueda) ||
            descripcion.includes(busqueda) ||
            categoria.includes(busqueda);
    });

    // Actualiza los marcadores del mapa con los resultados encontrados.
    mostrarEstablecimientosEnMapa(resultadosActuales);

    // Informa si no existen coincidencias.
    if (resultadosActuales.length === 0) {
        resultsContainer.innerHTML = '<p>No encontramos establecimientos relacionados con tu búsqueda.</p>';
        return;
    }

    // Construye las tarjetas de resultados.
    resultsContainer.innerHTML = resultadosActuales.map((establecimiento, index) => `
        <article class="establishment-card">
            <h3>${escapeHTML(establecimiento.nombre || 'Sin nombre')}</h3>

            <p>${escapeHTML(establecimiento.descripcion || 'Sin descripción disponible.')}</p>

            <p><strong>Categoría:</strong>
                ${escapeHTML(establecimiento.categorias?.nombre || 'Sin categoría')}
            </p>

            <p><strong>Dirección:</strong>
                ${escapeHTML(establecimiento.direccion || 'No registrada')}
            </p>

            <p><strong>Teléfono:</strong>
                ${escapeHTML(establecimiento.telefono || 'No registrado')}
            </p>

            <button
                type="button"
                class="locate-establishment"
                data-lat="${establecimiento.latitud}"
                data-lng="${establecimiento.longitud}"
            >
                Ver en el mapa
            </button>

            <button
                type="button"
                class="details-establishment"
                data-index="${index}"
            >
                Ver detalles
            </button>
        </article>
    `).join('');
});

// Limpia la búsqueda y recupera todos los establecimientos en el mapa.
clearSearchButton.addEventListener('click', async () => {

    // Limpia el campo y los resultados.
    searchInput.value = '';
    resultsContainer.innerHTML = '';
    resultadosActuales = [];

    // Consulta nuevamente todos los establecimientos activos.
    const establecimientos = await obtenerEstablecimientos();

    // Recupera todos los marcadores del mapa.
    mostrarEstablecimientosEnMapa(establecimientos);
});

// Consulta las categorías y construye sus tarjetas.
async function cargarCategorias() {
    const contenedor = document.querySelector('#category-grid');

    contenedor.innerHTML = '<p>Cargando categorías...</p>';

    // Obtiene las categorías almacenadas en Supabase.
    const categorias = await obtenerCategorias();

    // Informa si no se pudieron cargar las categorías.
    if (categorias.length === 0) {
        contenedor.innerHTML = '<p>No se pudieron cargar las categorías.</p>';
        return;
    }

    // Asigna un icono a cada categoría.
    const iconosCategorias = {
        'Comercio': '🛍️',
        'Gastronomía': '🍽️',
        'Servicios': '🛠️',
        'Emprendimientos': '🌱'
    };

    // Construye las tarjetas de categorías.
    contenedor.innerHTML = categorias.map((categoria) => `
        <button
            type="button"
            class="category-card"
            data-category="${escapeHTML(categoria.nombre)}"
        >
            <span class="category-icon">
                ${iconosCategorias[categoria.nombre] || '📍'}
            </span>
            <strong>${escapeHTML(categoria.nombre)}</strong>
            <small>${escapeHTML(categoria.descripcion || 'Consulta esta categoría')}</small>
        </button>
    `).join('');

    // Activa el filtro al seleccionar una categoría.
    document.querySelectorAll('.category-card').forEach((card) => {
        card.addEventListener('click', async () => {

            const categoriaSeleccionada = card.dataset.category;

            resultsContainer.innerHTML = `
                <p>Buscando establecimientos de ${escapeHTML(categoriaSeleccionada)}...</p>
            `;

            // Consulta los establecimientos activos.
            const establecimientos = await obtenerEstablecimientos();

            // Filtra los establecimientos de la categoría seleccionada.
            resultadosActuales = establecimientos.filter((establecimiento) => {
                return establecimiento.categorias?.nombre === categoriaSeleccionada;
            });

            // Actualiza los marcadores del mapa.
            mostrarEstablecimientosEnMapa(resultadosActuales);

            // Informa si la categoría todavía no tiene establecimientos.
            if (resultadosActuales.length === 0) {
                resultsContainer.innerHTML = `
                    <p>No hay establecimientos registrados en ${escapeHTML(categoriaSeleccionada)}.</p>
                `;
                return;
            }

            // Construye las tarjetas de resultados de la categoría.
            resultsContainer.innerHTML = resultadosActuales.map((establecimiento, index) => `
                <article class="establishment-card">
                    <h3>${escapeHTML(establecimiento.nombre || 'Sin nombre')}</h3>

                    <p>${escapeHTML(establecimiento.descripcion || 'Sin descripción disponible.')}</p>

                    <p><strong>Categoría:</strong>
                        ${escapeHTML(establecimiento.categorias?.nombre || 'Sin categoría')}
                    </p>

                    <p><strong>Dirección:</strong>
                        ${escapeHTML(establecimiento.direccion || 'No registrada')}
                    </p>

                    <p><strong>Teléfono:</strong>
                        ${escapeHTML(establecimiento.telefono || 'No registrado')}
                    </p>

                    <button
                        type="button"
                        class="locate-establishment"
                        data-lat="${establecimiento.latitud}"
                        data-lng="${establecimiento.longitud}"
                    >
                        Ver en el mapa
                    </button>

                    <button
                        type="button"
                        class="details-establishment"
                        data-index="${index}"
                    >
                        Ver detalles
                    </button>
                </article>
            `).join('');
        });
    });
}

// Inicializa el mapa principal y muestra los establecimientos registrados.
async function cargarMapa() {

    // Crea el mapa dentro del contenedor identificado como "map".
    inicializarMapa('map');

    // Consulta los establecimientos activos.
    const establecimientos = await obtenerEstablecimientos();

    // Muestra los establecimientos mediante sus coordenadas.
    mostrarEstablecimientosEnMapa(establecimientos);
}

// Carga las categorías al iniciar la aplicación.
cargarCategorias();

// Carga el mapa al iniciar la aplicación.
cargarMapa();
