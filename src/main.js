
import './css/style.css';

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

            <a href="#mapa" class="header-button">Explorar oferta local</a>
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
                </form>

                <p class="search-hint">
                    Explora negocios, productos, servicios y ubicaciones.
                </p>
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

            <div class="category-grid">
                <button class="category-card" data-category="Comercio">
                    <span>01</span>
                    <strong>Comercio</strong>
                    <small>Establecimientos comerciales</small>
                </button>

                <button class="category-card" data-category="Gastronomía">
                    <span>02</span>
                    <strong>Gastronomía</strong>
                    <small>Restaurantes y alimentos</small>
                </button>

                <button class="category-card" data-category="Servicios">
                    <span>03</span>
                    <strong>Servicios</strong>
                    <small>Servicios profesionales y técnicos</small>
                </button>

                <button class="category-card" data-category="Emprendimientos">
                    <span>04</span>
                    <strong>Emprendimientos</strong>
                    <small>Iniciativas productivas locales</small>
                </button>
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

                <div class="map-placeholder" id="map">
                    <div class="map-message">
                        <strong>Mapa interactivo SIGECO-SOG</strong>
                        <p>El componente geográfico se integrará en la siguiente etapa.</p>
                    </div>
                </div>
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

const searchForm = document.querySelector('#search-form');

searchForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const searchValue = document.querySelector('#search-input').value.trim();

    if (!searchValue) {
        alert('Escribe el nombre de un establecimiento, producto o servicio.');
        return;
    }

    alert('La búsqueda se conectará con los establecimientos registrados en la siguiente etapa.');
});

document.querySelectorAll('.category-card').forEach((card) => {
    card.addEventListener('click', () => {
        const category = card.dataset.category;
        alert(`La consulta de la categoría ${category} se habilitará al integrar la base de datos.`);
    });
});
