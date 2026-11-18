/* =========================================================
   SIGECO-SOG
   ARCHIVO PRINCIPAL DE LA APLICACIÓN
   ========================================================= */

// Estilos principales.
import "./css/style.css";
import logoSigeco from "./icons/iconpagina.jpg";
// Conexión con Supabase.
import { supabase } from "./js/supabase.js";

// Funciones de establecimientos.
import {
  obtenerCategorias,
  obtenerEstablecimientos,
  obtenerUrlImagen,
} from "./js/establecimientos.js";

// Funciones de mapas.
import {
  inicializarMapa,
  mostrarEstablecimientosEnMapa,
  localizarEstablecimientoEnMapa,
  mostrarMapaDetalles,
} from "./js/mapa.js";

/* =========================================================
   VARIABLES GENERALES
   ========================================================= */

let resultadosActuales = [];
let establecimientosDisponibles = [];

/* =========================================================
   ESTRUCTURA PRINCIPAL DE LA PÁGINA
   ========================================================= */

document.querySelector("#app").innerHTML = `
    <header class="header">
        <div class="container header-content">

            <a href="#inicio" class="brand">
             <span class="brand-icon">
    <img src="${logoSigeco}" alt="SIGECO-SOG">
</span>

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

                <h1>
                    Descubre la oferta comercial y productiva de nuestra ciudad
                </h1>

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

                    <button type="button" id="clear-search">
                        Limpiar
                    </button>

                </form>

                <p class="search-hint">
                    Explora negocios, productos, servicios y ubicaciones.
                </p>

                <div
                    id="search-results"
                    class="search-results"
                    aria-live="polite"
                ></div>

            </div>
        </section>


        <section class="section container" id="categorias">

            <div class="section-heading">
                <div>
                    <span class="eyebrow">EXPLORA</span>

                    <h2>Encuentra lo que necesitas</h2>

                    <p>
                        Consulta la oferta local organizada por categorías.
                    </p>
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
  <div class="sigeco-about">

    <button
      type="button"
      class="sigeco-about-toggle"
      id="sigeco-about-toggle"
      aria-expanded="false"
      aria-controls="sigeco-about-content"
    >
      <span class="sigeco-about-toggle-icon" aria-hidden="true">✦</span>

      <span class="sigeco-about-toggle-text">
        <span class="sigeco-about-eyebrow">CONOCE NUESTRA INICIATIVA</span>
        <strong>Acerca de SIGECO-SOG</strong>
        <small>Descubre el origen, propósito y visión de nuestro proyecto.</small>
      </span>

      <span class="sigeco-about-chevron" aria-hidden="true">
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path d="m6 9 6 6 6-6"></path>
    </svg>
</span>
    </button>

    <div class="sigeco-about-content" id="sigeco-about-content" inert>
      <div class="sigeco-about-content-inner">

        <div class="sigeco-about-hero">
          <span class="sigeco-about-hero-label">
            SIGECO-SOG · SOGAMOSO, BOYACÁ
          </span>

          <h2>Información que conecta.<br>Territorio que inspira.</h2>

          <p>
            Una propuesta tecnológica que busca acercar los establecimientos,
            emprendimientos y unidades productivas de Sogamoso a los ciudadanos,
            facilitando el acceso a la información de la oferta local.
          </p>
        </div>

        <div class="sigeco-about-body">

          <div class="sigeco-about-intro">
            <span class="sigeco-about-kicker">NUESTRA ESENCIA</span>
            <h3>Conoce el proyecto detrás de la plataforma</h3>
            <p>
              SIGECO-SOG nace como una propuesta académica orientada a
              aprovechar la tecnología para organizar, caracterizar y
              consultar información sobre la actividad comercial y
              productiva del municipio de Sogamoso, Boyacá.
            </p>
          </div>

          <div class="sigeco-about-grid">

            <article class="sigeco-about-item">
              <span class="sigeco-about-number">01 / EL PROYECTO</span>
              <h3>¿Qué es SIGECO-SOG?</h3>
              <p>
                Es el Sistema de Información Georreferenciada para la
                Caracterización y Conexión de Emprendimientos de
                Sogamoso, Boyacá.
              </p>
              <p>
                Su propuesta consiste en reunir información de
                establecimientos, emprendimientos y unidades productivas
                en una plataforma digital que facilite su consulta
                y ubicación geográfica.
              </p>
            </article>

            <article class="sigeco-about-item">
              <span class="sigeco-about-number">02 / EL ORIGEN</span>
              <h3>¿Por qué surge?</h3>
              <p>
                Surge ante la necesidad de facilitar el acceso a
                información organizada sobre la oferta comercial
                y productiva de Sogamoso.
              </p>
              <p>
                La propuesta busca ofrecer una alternativa digital
                para que las personas puedan conocer negocios,
                productos y servicios disponibles en el municipio.
              </p>
            </article>

            <article class="sigeco-about-item">
              <span class="sigeco-about-number">03 / EL PROPÓSITO</span>
              <h3>¿Qué buscamos lograr?</h3>
              <p>
                Facilitar la caracterización, organización, ubicación
                y consulta de establecimientos y emprendimientos locales.
              </p>
              <p>
                También buscamos contribuir a su visibilidad y
                favorecer la conexión entre la oferta de los negocios
                y las necesidades de los ciudadanos.
              </p>
            </article>

            <article class="sigeco-about-item">
              <span class="sigeco-about-number">04 / LA TECNOLOGÍA</span>
              <h3>¿Cómo funciona?</h3>
              <p>
                La plataforma permite explorar categorías, buscar
                establecimientos por su nombre o por los productos
                y servicios que ofrecen, consultar información
                y visualizar ubicaciones en un mapa interactivo.
              </p>
              <p>
                De esta manera, la información puede consultarse
                desde un mismo entorno digital.
              </p>
            </article>

          </div>

          <div class="sigeco-about-academic">
            <span class="sigeco-about-academic-icon" aria-hidden="true">✧</span>

            <div>
              <span class="sigeco-about-kicker">ORIGEN ACADÉMICO</span>
              <h3>Una iniciativa que nace desde la formación</h3>
              <p>
                SIGECO-SOG es un proyecto desarrollado en el contexto
                académico de la Universidad Nacional Abierta y a
                Distancia (UNAD), orientado a aplicar conocimientos
                tecnológicos a una necesidad del entorno local.
              </p>
            </div>
          </div>

          <div class="sigeco-about-closing">
            <span>SIGECO-SOG · 2026</span>
            <h3>Conocer nuestro territorio también es una forma de conectarlo.</h3>
            <p>Sogamoso, Boyacá · Colombia</p>
          </div>

        </div>
      </div>
    </div>

  </div>
</section>


    </main>


    <footer class="footer">

        <div class="container">

            <strong>SIGECO-SOG</strong>

            <p>
                Sistema de Información Georreferenciada de Sogamoso, Boyacá.
            </p>

            <small>Proyecto académico · 2026</small>

        </div>

    </footer>


    <!-- VENTANA DE DETALLES -->

    <div
        class="details-modal"
        id="details-modal"
        aria-hidden="true"
    >

        <div
            class="details-overlay"
            id="details-overlay"
        ></div>

        <section
            class="details-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Información del establecimiento"
        >

            <div class="details-header">

                <button
                    type="button"
                    class="details-close"
                    id="close-details"
                    aria-label="Cerrar detalles"
                >
                    ×
                </button>

            </div>

            <div
                class="details-content"
                id="details-content"
            ></div>

        </section>

    </div>


    <!-- VENTANA DE ACCESO ADMINISTRATIVO -->

    <div
        class="admin-modal"
        id="admin-modal"
        aria-hidden="true"
    >

        <div
            class="admin-overlay"
            id="admin-overlay"
        ></div>

        <section
            class="admin-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Acceso administrativo"
        >

            <div class="admin-header">

                <div>
                    <span class="admin-label">SIGECO-SOG</span>

                    <h2>Acceso administrativo</h2>

                    <p>Ingresa tus credenciales para continuar.</p>
                </div>

                <button
                    type="button"
                    class="admin-close"
                    id="close-admin"
                    aria-label="Cerrar ventana"
                >
                    ×
                </button>

            </div>


            <form
                class="admin-login-form"
                id="admin-login-form"
            >

                <label for="admin-email">
                    Correo electrónico
                </label>

                <input
                    type="email"
                    id="admin-email"
                    placeholder="Correo electrónico"
                    autocomplete="username"
                    required
                >

                <label for="admin-password">
                    Contraseña
                </label>

                <input
                    type="password"
                    id="admin-password"
                    placeholder="Contraseña"
                    autocomplete="current-password"
                    required
                >

                <button type="submit">
                    Iniciar sesión
                </button>

                <p
                    id="admin-login-message"
                    aria-live="polite"
                ></p>

            </form>


            <div class="admin-footer">
                Acceso exclusivo para usuarios autorizados.
            </div>

        </section>

    </div>
`;

/* =========================================================
   FUNCIONES GENERALES
   ========================================================= */

// Normaliza los textos para facilitar las búsquedas.
function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Protege los textos antes de insertarlos en HTML.
function escapeHTML(texto) {
  return String(texto ?? "").replace(
    /[&<>"']/g,
    (caracter) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[caracter],
  );
}

// Obtiene la URL pública de una imagen.
function obtenerImagenEstablecimiento(imagen) {
  if (!imagen?.ruta_archivo) {
    return null;
  }

  return obtenerUrlImagen(imagen.ruta_archivo);
}

// Obtiene la imagen representativa de un establecimiento.
function obtenerImagenRepresentativa(establecimiento) {
  const imagenes = establecimiento.imagenes_establecimiento || [];

  const imagen =
    imagenes.find((item) => item.tipo === "portada") ||
    imagenes.find((item) => item.tipo === "logo") ||
    imagenes.find((item) => item.tipo === "galeria");

  return imagen ? obtenerImagenEstablecimiento(imagen) : null;
}

// Formatea precios en pesos colombianos.
function formatearPrecio(precio) {
  if (precio === null || precio === undefined || precio === "") {
    return "Consultar precio";
  }

  const valor = Number(precio);

  if (!Number.isFinite(valor)) {
    return "Consultar precio";
  }

  return `$ ${valor.toLocaleString("es-CO")}`;
}

/* =========================================================
   ELEMENTOS DE LA INTERFAZ
   ========================================================= */

// Búsqueda.
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#search-input");
const resultsContainer = document.querySelector("#search-results");
const clearSearchButton = document.querySelector("#clear-search");

// Ventana de detalles.
const detailsModal = document.querySelector("#details-modal");
const detailsContent = document.querySelector("#details-content");
const closeDetailsButton = document.querySelector("#close-details");
const detailsOverlay = document.querySelector("#details-overlay");

// Ventana administrativa.
const adminAccessButton = document.querySelector("#admin-access");
const adminModal = document.querySelector("#admin-modal");
const adminOverlay = document.querySelector("#admin-overlay");
const closeAdminButton = document.querySelector("#close-admin");

// Formulario administrativo.
const adminLoginForm = document.querySelector("#admin-login-form");
const adminEmail = document.querySelector("#admin-email");
const adminPassword = document.querySelector("#admin-password");
const adminLoginMessage = document.querySelector("#admin-login-message");

/* =========================================================
   CONTROL DE VENTANAS
   ========================================================= */

// Abre la ventana de detalles.
function abrirDetalles() {
  detailsModal.classList.add("active");
  detailsModal.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";
}

// Cierra la ventana de detalles.
function cerrarDetalles() {
  // Retira el foco de los elementos internos antes de ocultar el modal.
  if (detailsModal.contains(document.activeElement)) {
    document.activeElement.blur();
  }

  detailsModal.classList.remove("active");

  detailsModal.setAttribute("aria-hidden", "true");

  document.body.style.overflow = "";
}

// Abre el acceso administrativo.
function abrirAdmin() {
  adminModal.classList.add("active");
  adminModal.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";

  adminEmail.focus();
}

// Cierra el acceso administrativo.
function cerrarAdmin() {
  adminModal.classList.remove("active");
  adminModal.setAttribute("aria-hidden", "true");

  document.body.style.overflow = "";
}

// Eventos de cierre y apertura.
adminAccessButton.addEventListener("click", (evento) => {
  evento.preventDefault();
  abrirAdmin();
});

closeAdminButton.addEventListener("click", cerrarAdmin);
adminOverlay.addEventListener("click", cerrarAdmin);

closeDetailsButton.addEventListener("click", cerrarDetalles);
detailsOverlay.addEventListener("click", cerrarDetalles);

// Permite cerrar las ventanas con Escape.
document.addEventListener("keydown", (evento) => {
  if (evento.key !== "Escape") {
    return;
  }

  if (detailsModal.classList.contains("active")) {
    cerrarDetalles();
  }

  if (adminModal.classList.contains("active")) {
    cerrarAdmin();
  }
});

/* =========================================================
   ACCESO ADMINISTRATIVO CON SUPABASE
   ========================================================= */

adminLoginForm.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const mostrarMensaje = (mensaje, tipo) => {
    adminLoginMessage.textContent = mensaje;
    adminLoginMessage.className = `admin-login-message ${tipo}`;
  };

  mostrarMensaje("Verificando acceso...", "loading");

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: adminEmail.value.trim(),
      password: adminPassword.value,
    });

    if (error || !data.user) {
      mostrarMensaje("Correo o contraseña incorrectos.", "warning");

      return;
    }

    // Consulta el rol asignado al usuario.
    const { data: rol, error: errorRol } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    const rolesPermitidos = ["principal_admin", "admin", "editor", "viewer"];

    // Verifica los permisos.
    if (errorRol || !rol || !rolesPermitidos.includes(rol.role)) {
      await supabase.auth.signOut();

      mostrarMensaje(
        "Acceso denegado. No tienes permisos administrativos.",
        "error",
      );

      return;
    }

    // Registrar el acceso administrativo autorizado.
    const { error: errorAuditoria } = await supabase.rpc(
      "registrar_evento_sesion",
      {
        p_evento: "INICIO_SESION",
      },
    );

    if (errorAuditoria) {
      console.error(
        "No fue posible registrar el inicio de sesión:",
        errorAuditoria,
      );

      mostrarMensaje(
        "No fue posible registrar el acceso. Inténtalo nuevamente.",
        "error",
      );

      await supabase.auth.signOut();
      return;
    }

    mostrarMensaje(
      "¡Acceso autorizado! Bienvenido al panel administrativo.",
      "success",
    );

    // Redirige al panel.
    setTimeout(() => {
      window.location.href = "/admin.html";
    }, 1200);
  } catch (error) {
    console.error("Error en el inicio de sesión:", error);

    mostrarMensaje(
      "No fue posible verificar el acceso. Inténtalo nuevamente.",
      "error",
    );
  }
});

/* =========================================================
   TARJETAS DE ESTABLECIMIENTOS
   ========================================================= */

function construirTarjetasEstablecimientos(establecimientos) {
  return establecimientos
    .map((establecimiento, index) => {
      const imagen = obtenerImagenRepresentativa(establecimiento);

      return `
            <article class="establishment-card">

                ${
                  imagen
                    ? `
                            <div class="establishment-card-image">

                                <img
                                    src="${escapeHTML(imagen)}"
                                    alt="Imagen de ${escapeHTML(establecimiento.nombre)}"
                                    loading="lazy"
                                >

                            </div>
                        `
                    : `
                            <div class="establishment-card-image establishment-no-image">
                                <span>Imagen no disponible</span>
                            </div>
                        `
                }


                <h3>
                    ${escapeHTML(establecimiento.nombre || "Sin nombre")}
                </h3>


                <p>
                    ${escapeHTML(
                      establecimiento.descripcion ||
                        "Sin descripción disponible.",
                    )}
                </p>


                <p>
                    <strong>Categoría:</strong>
                    ${escapeHTML(
                      establecimiento.categorias?.nombre || "Sin categoría",
                    )}
                </p>


                <p>
                    <strong>Dirección:</strong>
                    ${escapeHTML(establecimiento.direccion || "No registrada")}
                </p>


                <p>
                    <strong>Teléfono:</strong>
                    ${escapeHTML(establecimiento.telefono || "No registrado")}
                </p>


                <button
                    type="button"
                    class="locate-establishment"
                    data-lat="${escapeHTML(establecimiento.latitud)}"
                    data-lng="${escapeHTML(establecimiento.longitud)}"
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
        `;
    })
    .join("");
}


/* =========================================================
   GALERÍA DEL ESTABLECIMIENTO
   ========================================================= */

function construirGaleria(imagenes, nombreEstablecimiento, imagenPrincipal = null) {
  const fotografias = Array.isArray(imagenes) ? [...imagenes] : [];

  if (imagenPrincipal) {
    const yaExiste = fotografias.some(
      (imagen) => imagen.ruta_archivo === imagenPrincipal
    );

    if (!yaExiste) {
      fotografias.unshift({
        ruta_archivo: imagenPrincipal,
        texto_alternativo: `Imagen principal de ${nombreEstablecimiento}`,
      });
    }
  }

  const imagenesValidas = fotografias
    .map((imagen) => ({
      ...imagen,
      url: obtenerImagenEstablecimiento(imagen),
    }))
    .filter((imagen) => imagen.url);

  if (imagenesValidas.length === 0) {
    return `
      <div class="sigeco-slide active">
        <div class="sigeco-no-image">
          <span class="sigeco-no-image-icon">↻</span>
          <strong>Imagen no disponible</strong>
          <span>
            Este establecimiento todavía no ha proporcionado fotografías.
          </span>
        </div>
      </div>
    `;
  }

  return imagenesValidas
    .map(
      (imagen, indice) => `
        <div class="sigeco-slide ${indice === 0 ? "active" : ""}">
          <img
            src="${escapeHTML(imagen.url)}"
            alt="${escapeHTML(
              imagen.texto_alternativo ||
                `Imagen de ${nombreEstablecimiento}`
            )}"
            loading="${indice === 0 ? "eager" : "lazy"}"
          >
        </div>
      `
    )
    .join("");
}


/* =========================================================
   CATÁLOGO DE PRODUCTOS Y SERVICIOS
   ========================================================= */

function construirCatalogo(productos) {
  if (!productos || productos.length === 0) {
    return `
            <div class="sigeco-catalog-empty">

                <span>▦</span>

                <h4>
                    Próximamente encontrarás nuestro catálogo
                </h4>

                <p>
                    Este establecimiento todavía no ha registrado
                    productos o servicios.
                </p>

            </div>
        `;
  }

  return productos
    .map((producto) => {
      const imagen = producto.imagen_url;

      return `
            <article class="sigeco-product-card">

                ${
                  imagen
                    ? `
                            <img
                                src="${escapeHTML(imagen)}"
                                alt="${escapeHTML(producto.nombre || "Producto")}"
                                loading="lazy"
                            >
                        `
                    : `
                            <div class="sigeco-product-placeholder">
                                ▧
                            </div>
                        `
                }


                <div class="sigeco-product-info">

                    <h4>
                        ${escapeHTML(producto.nombre || "Sin nombre")}
                    </h4>

                    <p>
                        ${escapeHTML(
                          producto.descripcion || "Sin descripción disponible.",
                        )}
                    </p>

                    <strong>
                        ${escapeHTML(formatearPrecio(producto.precio))}
                    </strong>

                </div>

            </article>
        `;
    })
    .join("");
}

/* =========================================================
   HORARIO DE ATENCIÓN: DETALLE PÚBLICO
   ========================================================= */

const DIAS_ATENCION_PUBLICO = [
  ["lunes", "Lunes"],
  ["martes", "Martes"],
  ["miercoles", "Miércoles"],
  ["jueves", "Jueves"],
  ["viernes", "Viernes"],
  ["sabado", "Sábado"],
  ["domingo", "Domingo"],
];

function construirHorarioAtencion(horarios) {
  if (!horarios || typeof horarios !== "object") {
    return `
      <section class="sigeco-hours-section">
        <div class="sigeco-hours-heading">
          <div class="sigeco-hours-heading-icon">◷</div>
          <div>
            <span class="sigeco-hours-eyebrow">PLANIFICA TU VISITA</span>
            <h3>Horario de atención</h3>
            <p>Consulta la disponibilidad del establecimiento.</p>
          </div>
        </div>
        <div class="sigeco-hours-empty">
          Este establecimiento todavía no ha registrado sus horarios.
        </div>
      </section>
    `;
  }

  const ahora = new Date();

  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(ahora);

  const obtenerParte = (tipo) =>
    partes.find((parte) => parte.type === tipo)?.value || "";

  const diasIngles = {
    monday: "lunes",
    tuesday: "martes",
    wednesday: "miercoles",
    thursday: "jueves",
    friday: "viernes",
    saturday: "sabado",
    sunday: "domingo",
  };

  const diaActual = diasIngles[obtenerParte("weekday").toLowerCase()];
  const horaActual = `${obtenerParte("hour")}:${obtenerParte("minute")}`;

  const horarioHoy = horarios[diaActual];
  const turnosHoy = Array.isArray(horarioHoy?.turnos) ? horarioHoy.turnos : [];

  const abiertoAhora =
    horarioHoy?.abierto === true &&
    turnosHoy.some(
      (turno) =>
        turno.inicio &&
        turno.fin &&
        horaActual >= turno.inicio &&
        horaActual < turno.fin,
    );

  const formatearHora = (hora) => {
    if (!/^\d{2}:\d{2}$/.test(hora || "")) {
      return "—";
    }

    const [horas, minutos] = hora.split(":").map(Number);
    const periodo = horas >= 12 ? "p. m." : "a. m.";
    const hora12 = horas % 12 || 12;

    return `${String(hora12).padStart(2, "0")}:${String(minutos).padStart(2, "0")} ${periodo}`;
  };

  const filas = DIAS_ATENCION_PUBLICO.map(([clave, nombre]) => {
    const datos = horarios[clave];
    const turnos = Array.isArray(datos?.turnos) ? datos.turnos : [];
    const abierto = datos?.abierto === true && turnos.length > 0;
    const esHoy = clave === diaActual;

    const horasHTML = abierto
      ? turnos
          .map(
            (turno) => `
              <span class="sigeco-hours-time">
                ${escapeHTML(formatearHora(turno.inicio))}
                <span class="sigeco-hours-dash">—</span>
                ${escapeHTML(formatearHora(turno.fin))}
              </span>
            `,
          )
          .join("")
      : `<span class="sigeco-hours-closed">Cerrado</span>`;

    return `
      <div class="sigeco-hours-row ${esHoy ? "is-today" : ""}">
        <div class="sigeco-hours-day">
          <span class="sigeco-hours-day-dot"></span>
          <strong>${nombre}</strong>
          ${esHoy ? '<span class="sigeco-hours-today">HOY</span>' : ""}
        </div>

        <div class="sigeco-hours-times">
          ${horasHTML}
        </div>
      </div>
    `;
  }).join("");

  return `
    <section class="sigeco-hours-section">
      <div class="sigeco-hours-heading">
        <div class="sigeco-hours-heading-icon">
          <svg viewBox="0 0 24 24" width="26" height="26"
            fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 7v5l3.5 2"></path>
          </svg>
        </div>

        <div class="sigeco-hours-heading-text">
          <span class="sigeco-hours-eyebrow">PLANIFICA TU VISITA</span>
          <h3>Horario de atención</h3>
          <p>Conoce nuestros días y horarios de funcionamiento.</p>
        </div>

        <div class="sigeco-hours-status ${
          abiertoAhora ? "is-open" : "is-closed"
        }">
          <span class="sigeco-hours-status-dot"></span>
          ${abiertoAhora ? "Abierto ahora" : "Cerrado ahora"}
        </div>
      </div>

      <div class="sigeco-hours-body">
        <div class="sigeco-hours-list">
          ${filas}
        </div>

        <div class="sigeco-hours-footer">
          <span>◷</span>
          Horario local de Sogamoso, Colombia
        </div>
      </div>
    </section>
  `;
}

/* =========================================================
   PRESENTACIÓN COMPLETA DEL ESTABLECIMIENTO
   ========================================================= */

function mostrarDetallesEstablecimiento(establecimiento) {
  if (!establecimiento) {
    return;
  }

  const escapar = escapeHTML;

  // Organiza las imágenes.
  const imagenes = (establecimiento.imagenes_establecimiento || [])
    .slice()
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));

  // Selecciona las imágenes de portada y galería.
  const portada = imagenes.filter((imagen) => imagen.tipo === "portada");

  const galeria = imagenes.filter((imagen) => imagen.tipo === "galeria");

  const logos = imagenes.filter((imagen) => imagen.tipo === "logo");

  const imagenesCarrusel = [
    ...portada,
    ...galeria,
    ...(!portada.length && !galeria.length ? logos : []),
  ];

  // Productos activos.
  const productos = (establecimiento.productos || []).filter(
    (producto) => producto.estado === "activo",
  );

  // Información general.
  const categoria = establecimiento.categorias?.nombre || "Sin categoría";

  const direccion = establecimiento.direccion || "No registrada";

  const telefono = establecimiento.telefono || "No registrado";

  const correo = establecimiento.correo || "No registrado";

  
  // Construye la galería.
  const imagenesHTML = construirGaleria(
    imagenesCarrusel,
    establecimiento.nombre,
    establecimiento.imagen_path,
  );


  // Indicadores del carrusel.
  const indicadores =
    imagenesCarrusel.length > 1
      ? imagenesCarrusel
          .map(
            (_, indice) => `
            <button
                type="button"
                class="sigeco-indicator ${indice === 0 ? "active" : ""}"
                data-slide="${indice}"
                aria-label="Ver imagen ${indice + 1}"
            ></button>
        `,
          )
          .join("")
      : "";

  // Imágenes de vista previa del catálogo.
  const vistaPreviaProductos =
    productos.length > 0
      ? productos
          .slice(0, 3)
          .map((producto) => {
            return `
                <div class="sigeco-preview-product">

                    ${
                      producto.imagen_url
                        ? `
                                <img
                                    src="${escapar(producto.imagen_url)}"
                                    alt="${escapar(producto.nombre || "Producto")}"
                                    loading="lazy"
                                >
                            `
                        : `
                                <div class="sigeco-product-placeholder">
                                    ▧
                                </div>
                            `
                    }

                </div>
            `;
          })
          .join("")
      : `
            <div class="sigeco-preview-empty">
                <span>▦</span>
                <strong>Catálogo en preparación</strong>
            </div>
        `;

  // Catálogo completo.
  const catalogoCompleto = construirCatalogo(productos);

  // Construcción de la ficha.
  detailsContent.innerHTML = `

        <div class="sigeco-detail-page">


            <!-- ENCABEZADO DEL ESTABLECIMIENTO -->

            <section class="sigeco-detail-heading">

                <div class="sigeco-heading-landscape">
                    <div class="sigeco-heading-mountains"></div>
                    <div class="sigeco-heading-town"></div>
                </div>


                <div class="sigeco-brand-pill">
                    <span>●</span>
                    SIGECO-SOG
                </div>


                <h2>
                    ${escapar(establecimiento.nombre || "Establecimiento")}
                </h2>


                <p class="sigeco-establishment-description">
                    ${escapar(
                      establecimiento.descripcion ||
                        "Conoce este establecimiento y los servicios que ofrece.",
                    )}
                </p>


                <div class="sigeco-category-divider">

                    <span></span>

                    <div>
                        ✦ &nbsp; ${escapar(categoria)}
                    </div>

                    <span></span>

                </div>

            </section>



            <!-- GALERÍA DE IMÁGENES -->

            <section class="sigeco-main-carousel">

                <div class="sigeco-carousel-track">
                    ${imagenesHTML}
                </div>


                ${
                  imagenesCarrusel.length > 1
                    ? `
                            <button
                                type="button"
                                class="sigeco-carousel-arrow prev"
                                aria-label="Imagen anterior"
                            >
                                ‹
                            </button>

                            <button
                                type="button"
                                class="sigeco-carousel-arrow next"
                                aria-label="Imagen siguiente"
                            >
                                ›
                            </button>

                            <div class="sigeco-carousel-indicators">
                                ${indicadores}
                            </div>
                        `
                    : ""
                }

            </section>



            <!-- INFORMACIÓN DEL ESTABLECIMIENTO -->

            <section class="sigeco-information-section">

                <div class="sigeco-section-heading">

                    <h3>
                        <span class="sigeco-heading-icon">i</span>
                        Información del establecimiento
                    </h3>

                    <span class="sigeco-heading-note">
                        Calidad y confianza en un solo lugar　✓
                    </span>

                </div>


                <div class="sigeco-information-grid">


                    <article class="sigeco-information-card">

                        <div class="sigeco-information-icon">❖</div>

                        <div>
                            <strong>Categoría</strong>
                            <p>${escapar(categoria)}</p>
                        </div>

                    </article>


                    <article class="sigeco-information-card">

                        <div class="sigeco-information-icon">⌖</div>

                        <div>
                            <strong>Dirección</strong>
                            <p>${escapar(direccion)}</p>
                        </div>

                    </article>


                    <article class="sigeco-information-card">

                        <div class="sigeco-information-icon">☎</div>

                        <div>
                            <strong>Teléfono</strong>
                            <p>${escapar(telefono)}</p>
                        </div>

                    </article>


                    <article class="sigeco-information-card">

                        <div class="sigeco-information-icon">✉</div>

                        <div>
                            <strong>Correo electrónico</strong>
                            <p>${escapar(correo)}</p>
                        </div>

                    </article>


                </div>

            </section>



            <!-- HORARIO DE ATENCIÓN -->

            ${construirHorarioAtencion(establecimiento.horario_atencion)}


            <!-- CATÁLOGO DE PRODUCTOS Y SERVICIOS -->

            <section class="sigeco-catalog-section">

                <div class="sigeco-section-heading sigeco-catalog-heading">

                    <h3>
                        <span class="sigeco-heading-icon">⬡</span>
                        Productos y servicios
                    </h3>

                    <button
                        type="button"
                        class="sigeco-text-link"
                        id="sigeco-go-catalog"
                    >
                        Explora toda nuestra oferta
                        <span>➜</span>
                    </button>

                </div>


                <div class="sigeco-catalog-preview">

                    <div class="sigeco-preview-images">
                        ${vistaPreviaProductos}
                    </div>


                    <div class="sigeco-preview-description">

                        <h3>Vista previa del catálogo</h3>

                        <p>
                            Conoce nuestros productos y servicios disponibles.
                        </p>

                    </div>


                    <button
                        type="button"
                        class="sigeco-catalog-button"
                        id="sigeco-open-catalog"
                    >
                        <span>▦</span>
                        Ver catálogo completo -›
                    </button>

                </div>


                <div
                    class="sigeco-full-catalog"
                    id="sigeco-full-catalog"
                    hidden
                >

                    <div class="sigeco-full-catalog-heading">

                        <h3>
                            Catálogo de productos y servicios
                        </h3>

                        <p>
                            Consulta la oferta disponible de este establecimiento.
                        </p>

                    </div>


                    <div class="sigeco-products-grid">
                        ${catalogoCompleto}
                    </div>

                </div>

            </section>



            <!-- UBICACIÓN DEL ESTABLECIMIENTO -->

            <section class="details-map-section">

                <h3>
                    <span class="sigeco-heading-icon">⌖</span>
                    Ubicación del establecimiento
                </h3>

                <div id="details-map"></div>

            </section>


        </div>

    `;

  // Abre la ventana después de construir el contenido.
  abrirDetalles();

  /* -----------------------------------------------------
       CONTROL DEL CARRUSEL
       ----------------------------------------------------- */

  const slides = [...detailsContent.querySelectorAll(".sigeco-slide")];

  const dots = [...detailsContent.querySelectorAll(".sigeco-indicator")];

  let indiceActual = 0;

  function mostrarSlide(indice) {
    if (!slides.length) {
      return;
    }

    indiceActual = (indice + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === indiceActual);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === indiceActual);
    });
  }

  const botonAnterior = detailsContent.querySelector(
    ".sigeco-carousel-arrow.prev",
  );

  const botonSiguiente = detailsContent.querySelector(
    ".sigeco-carousel-arrow.next",
  );

  botonAnterior?.addEventListener("click", () => {
    mostrarSlide(indiceActual - 1);
  });

  botonSiguiente?.addEventListener("click", () => {
    mostrarSlide(indiceActual + 1);
  });

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      mostrarSlide(Number(dot.dataset.slide));
    });
  });

  /* -----------------------------------------------------
       CARGA DE IMÁGENES
       ----------------------------------------------------- */

  detailsContent.querySelectorAll("img").forEach((imagen) => {
    imagen.addEventListener("error", () => {
      if (imagen.closest(".sigeco-slide")) {
        imagen.parentElement.innerHTML = `
                    <div class="sigeco-no-image">
                        <span class="sigeco-no-image-icon">↻</span>
                        <strong>Imagen no disponible</strong>
                        <span>No fue posible cargar esta fotografía.</span>
                    </div>
                `;

        return;
      }

      if (imagen.closest(".sigeco-product-card")) {
        const reemplazo = document.createElement("div");

        reemplazo.className = "sigeco-product-placeholder";
        reemplazo.textContent = "▧";

        imagen.replaceWith(reemplazo);

        return;
      }

      if (imagen.closest(".sigeco-preview-product")) {
        const reemplazo = document.createElement("div");

        reemplazo.className = "sigeco-product-placeholder";
        reemplazo.textContent = "▧";

        imagen.replaceWith(reemplazo);
      }
    });
  });

  /* -----------------------------------------------------
       APERTURA DEL CATÁLOGO COMPLETO
       ----------------------------------------------------- */

  const catalogo = detailsContent.querySelector("#sigeco-full-catalog");

  function abrirCatalogo() {
    if (!catalogo) {
      return;
    }

    catalogo.hidden = false;

    catalogo.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  detailsContent
    .querySelector("#sigeco-open-catalog")
    ?.addEventListener("click", abrirCatalogo);

  detailsContent
    .querySelector("#sigeco-go-catalog")
    ?.addEventListener("click", abrirCatalogo);

  /* -----------------------------------------------------
       MAPA DEL ESTABLECIMIENTO
       ----------------------------------------------------- */

  const latitud = Number(establecimiento.latitud);
  const longitud = Number(establecimiento.longitud);

  if (
    Number.isFinite(latitud) &&
    Number.isFinite(longitud) &&
    latitud !== 0 &&
    longitud !== 0
  ) {
    // Se espera a que el modal esté visible para inicializar el mapa.
    requestAnimationFrame(() => {
      try {
        mostrarMapaDetalles(latitud, longitud);
      } catch (error) {
        console.error(
          "No fue posible mostrar el mapa del establecimiento:",
          error,
        );
      }
    });
  } else {
    const mapaDetalles = detailsContent.querySelector("#details-map");

    if (mapaDetalles) {
      mapaDetalles.innerHTML = `
                <div class="map-message">
                    <strong>Ubicación no disponible</strong>
                    <p>
                        Este establecimiento todavía no tiene
                        coordenadas geográficas registradas.
                    </p>
                </div>
            `;
    }
  }
}

/* =========================================================
   EVENTOS DE LAS TARJETAS
   ========================================================= */

document.addEventListener("click", (evento) => {
  // Localizar un establecimiento.
  const botonMapa = evento.target.closest(".locate-establishment");

  if (botonMapa) {
    const latitud = Number(botonMapa.dataset.lat);
    const longitud = Number(botonMapa.dataset.lng);

    if (
      !Number.isFinite(latitud) ||
      !Number.isFinite(longitud) ||
      latitud === 0 ||
      longitud === 0
    ) {
      alert("Este establecimiento no tiene una ubicación registrada.");

      return;
    }

    localizarEstablecimientoEnMapa(latitud, longitud);

    setTimeout(() => {
      const seccionMapa = document.querySelector("#mapa");

      seccionMapa?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 150);

    return;
  }

  // Consultar detalles.
  const botonDetalles = evento.target.closest(".details-establishment");

  if (botonDetalles) {
    const indice = Number(botonDetalles.dataset.index);

    const establecimiento = resultadosActuales[indice];

    if (!establecimiento) {
      return;
    }

    mostrarDetallesEstablecimiento(establecimiento);
  }
});

/* =========================================================
   BÚSQUEDA DE ESTABLECIMIENTOS Y PRODUCTOS
   ========================================================= */

searchForm.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const busqueda = normalizarTexto(searchInput.value);

  if (!busqueda) {
    resultadosActuales = [];

    resultsContainer.innerHTML = `
            <p>Escribe algo para realizar la búsqueda.</p>
        `;

    mostrarEstablecimientosEnMapa([]);

    return;
  }

  resultsContainer.innerHTML = `
        <p>Buscando establecimientos...</p>
    `;

  try {
    const establecimientos = await obtenerEstablecimientos();

    resultadosActuales = establecimientos.filter((establecimiento) => {
      const nombre = normalizarTexto(establecimiento.nombre);

      const descripcion = normalizarTexto(establecimiento.descripcion);

      const categoria = normalizarTexto(establecimiento.categorias?.nombre);

      const coincideEstablecimiento =
        nombre.includes(busqueda) ||
        descripcion.includes(busqueda) ||
        categoria.includes(busqueda);

      const coincideCatalogo = (establecimiento.productos || []).some(
        (producto) => {
          return (
            normalizarTexto(producto.nombre).includes(busqueda) ||
            normalizarTexto(producto.descripcion).includes(busqueda)
          );
        },
      );

      return coincideEstablecimiento || coincideCatalogo;
    });

    mostrarEstablecimientosEnMapa(resultadosActuales);

    if (resultadosActuales.length === 0) {
      resultsContainer.innerHTML = `
                <p>
                    No encontramos establecimientos relacionados
                    con tu búsqueda.
                </p>
            `;

      return;
    }

    resultsContainer.innerHTML =
      construirTarjetasEstablecimientos(resultadosActuales);
  } catch (error) {
    console.error("Error al realizar la búsqueda:", error);

    resultsContainer.innerHTML = `
            <p>
                No fue posible realizar la búsqueda.
                Inténtalo nuevamente.
            </p>
        `;
  }
});

/* =========================================================
   LIMPIAR BÚSQUEDA
   ========================================================= */

clearSearchButton.addEventListener("click", async () => {
  searchInput.value = "";

  resultsContainer.innerHTML = "";

  resultadosActuales = [];

  try {
    const establecimientos = await obtenerEstablecimientos();

    mostrarEstablecimientosEnMapa(establecimientos);
  } catch (error) {
    console.error("Error al recuperar los establecimientos:", error);
  }
});

/* =========================================================
   CARRUSEL ANIMADO DE CATEGORÍAS — SIGECO-SOG
   ========================================================= */

let detenerCarruselCategorias = null;

async function cargarCategorias() {
  const contenedor = document.querySelector("#category-grid");

  if (!contenedor) return;

  // Detener cualquier carrusel anterior.
  if (detenerCarruselCategorias) {
    detenerCarruselCategorias();
    detenerCarruselCategorias = null;
  }

  contenedor.innerHTML = "<p>Cargando categorías...</p>";

  try {
    const categorias = await obtenerCategorias();

    if (!categorias || categorias.length === 0) {
      contenedor.innerHTML = "<p>No se encontraron categorías registradas.</p>";
      return;
    }

    // Íconos específicos de cada categoría.
    const iconosCategorias = {
      agricultura: "🌾",
      alojamiento: "🏨",
      automotores: "🚗",
      cafeteria: "☕",
      comercio: "🛍️",
      construccion: "🏗️",
      cultura: "🎭",
      deportes: "⚽",
      educacion: "📚",
      emprendimientos: "🌱",
      "espacios publicos y naturales": "🌳",
      eventos: "🎟️",
      finanzas: "💰",
      gastronomia: "🍽️",
      hogar: "🏡",
      otros: "🏪",
      recreacion: "🎡",
      restaurante: "🍴",
      salud: "💊",
      servicios: "🛠️",
      tecnologia: "💻",
      transporte: "🚚",
      turismo: "🧭",
    };

    const coloresCategorias = {
      agricultura: "#4e9367",
      alojamiento: "#3986b5",
      automotores: "#65788c",
      cafeteria: "#ad7954",
      comercio: "#447fca",
      construccion: "#c18a3d",
      cultura: "#a76bc0",
      deportes: "#6c9a48",
      educacion: "#6778c7",
      emprendimientos: "#3c9973",
      "espacios publicos y naturales": "#419879",
      eventos: "#c26c94",
      finanzas: "#8671bd",
      gastronomia: "#d48a55",
      hogar: "#aa8a64",
      otros: "#698d91",
      recreacion: "#b37ac4",
      restaurante: "#cb8051",
      salud: "#c96b75",
      servicios: "#438c99",
      tecnologia: "#8278c9",
      transporte: "#63879e",
      turismo: "#3d9d91",
    };

    const total = categorias.length;
    let indiceActivo = 0;
    let intervalo = null;
    let pausa = false;
    let inicioTouch = null;

    // Construir estructura del carrusel.
    contenedor.innerHTML = `
      <div class="sigeco-category-carousel">

        <div class="sigeco-carousel-heading">
          <span class="sigeco-carousel-eyebrow">
            DESCUBRE SOGAMOSO
          </span>

          <p>
            Explora los sectores de nuestra ciudad.
            Selecciona una categoría para conocer
            sus establecimientos.
          </p>
        </div>

        <div
          class="sigeco-carousel-viewport"
          aria-label="Carrusel de categorías"
        >
          <div class="sigeco-carousel-track"></div>
        </div>

        <div class="sigeco-carousel-controls">
          <button
            type="button"
            class="sigeco-carousel-arrow"
            data-direction="-1"
            aria-label="Categoría anterior"
          >‹</button>

          <div class="sigeco-carousel-counter">
            <span class="sigeco-carousel-current">01</span>
            <span class="sigeco-carousel-separator">/</span>
            <span>${String(total).padStart(2, "0")}</span>
          </div>

          <button
            type="button"
            class="sigeco-carousel-arrow"
            data-direction="1"
            aria-label="Categoría siguiente"
          >›</button>
        </div>

        <div class="sigeco-carousel-progress">
          <span class="sigeco-carousel-progress-bar"></span>
        </div>

        <p class="sigeco-carousel-hint">
          Desliza para explorar · Selecciona para descubrir
        </p>

      </div>
    `;

    const viewport = contenedor.querySelector(".sigeco-carousel-viewport");

    const track = contenedor.querySelector(".sigeco-carousel-track");

    const contador = contenedor.querySelector(".sigeco-carousel-current");

    const progreso = contenedor.querySelector(".sigeco-carousel-progress-bar");

    // Crear tarjetas reales desde Supabase.
    const tarjetas = categorias.map((categoria, indice) => {
      const clave = normalizarTexto(categoria.nombre);

      const icono = iconosCategorias[clave] || "🏪";
      const color = coloresCategorias[clave] || "#438b7b";

      const tarjeta = document.createElement("button");

      tarjeta.type = "button";
      tarjeta.className = "category-card sigeco-carousel-card";
      tarjeta.dataset.category = categoria.nombre;
      tarjeta.dataset.index = String(indice);

      tarjeta.style.setProperty("--category-accent", color);

      tarjeta.innerHTML = `
        <span class="sigeco-card-decoration"></span>

        <span class="sigeco-card-top">
          <span class="sigeco-card-label">
            SIGECO · CATEGORÍAS
          </span>
          <span class="sigeco-card-arrow">↗</span>
        </span>

        <span class="category-icon">
          ${icono}
        </span>

        <strong>${escapeHTML(categoria.nombre)}</strong>

        <small>
          ${escapeHTML(
            categoria.descripcion ||
              "Descubre los establecimientos de esta categoría.",
          )}
        </small>

        <span class="sigeco-card-footer">
          EXPLORAR CATEGORÍA
          <span>→</span>
        </span>
      `;

      track.appendChild(tarjeta);

      return tarjeta;
    });

    // Determinar la posición relativa más corta.
    function obtenerDistancia(indice) {
      let distancia = indice - indiceActivo;

      if (distancia > total / 2) {
        distancia -= total;
      }

      if (distancia < -total / 2) {
        distancia += total;
      }

      return distancia;
    }

    // Aplicar posiciones y perspectiva 3D.
    function actualizarCarrusel() {
      tarjetas.forEach((tarjeta, indice) => {
        const distancia = obtenerDistancia(indice);
        const absoluta = Math.abs(distancia);

        tarjeta.classList.toggle("is-active", distancia === 0);

        tarjeta.classList.toggle("is-neighbor", absoluta === 1);

        tarjeta.classList.toggle("is-hidden", absoluta > 2);

        tarjeta.style.setProperty("--card-position", String(distancia));

        tarjeta.style.setProperty("--card-depth", String(-absoluta * 100));

        tarjeta.style.setProperty("--card-rotation", `${distancia * -13}deg`);

        tarjeta.style.opacity =
          absoluta > 2
            ? "0"
            : absoluta === 2
              ? "0.38"
              : absoluta === 1
                ? "0.72"
                : "1";

        tarjeta.style.pointerEvents = absoluta > 2 ? "none" : "auto";

        tarjeta.tabIndex = distancia === 0 ? 0 : -1;

        if (distancia !== 0 && tarjeta.contains(document.activeElement)) {
          tarjeta.blur();
        }

        tarjeta.setAttribute("aria-hidden", distancia === 0 ? "false" : "true");
      });

      contador.textContent = String(indiceActivo + 1).padStart(2, "0");

      progreso.style.width = `${((indiceActivo + 1) / total) * 100}%`;
    }

    function moverCarrusel(direccion) {
      indiceActivo = (indiceActivo + direccion + total) % total;

      actualizarCarrusel();
    }

    function iniciarAutomatico() {
      detenerAutomatico();

      if (
        total <= 1 ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      intervalo = window.setInterval(() => {
        if (!pausa && !document.hidden) {
          moverCarrusel(1);
        }
      }, 4000);
    }

    function detenerAutomatico() {
      if (intervalo !== null) {
        clearInterval(intervalo);
        intervalo = null;
      }
    }

    // Flechas de navegación.
    contenedor.querySelectorAll(".sigeco-carousel-arrow").forEach((boton) => {
      boton.addEventListener("click", () => {
        moverCarrusel(Number(boton.dataset.direction));
        iniciarAutomatico();
      });
    });

    // Pausar mientras se interactúa.
    viewport.addEventListener("mouseenter", () => {
      pausa = true;
    });

    viewport.addEventListener("mouseleave", () => {
      pausa = false;
    });

    viewport.addEventListener("focusin", () => {
      pausa = true;
    });

    viewport.addEventListener("focusout", (evento) => {
      if (!viewport.contains(evento.relatedTarget)) {
        pausa = false;
      }
    });

    // Deslizamiento táctil.
    viewport.addEventListener(
      "touchstart",
      (evento) => {
        inicioTouch = evento.touches[0].clientX;
        pausa = true;
      },
      { passive: true },
    );

    viewport.addEventListener(
      "touchend",
      (evento) => {
        if (inicioTouch === null) return;

        const diferencia = evento.changedTouches[0].clientX - inicioTouch;

        if (Math.abs(diferencia) > 45) {
          moverCarrusel(diferencia < 0 ? 1 : -1);
        }

        inicioTouch = null;
        pausa = false;
        iniciarAutomatico();
      },
      { passive: true },
    );

    // Navegación por teclado.
    viewport.addEventListener("keydown", (evento) => {
      if (evento.key === "ArrowRight") {
        evento.preventDefault();
        moverCarrusel(1);
      }

      if (evento.key === "ArrowLeft") {
        evento.preventDefault();
        moverCarrusel(-1);
      }
    });

    // Mantener el filtro original de establecimientos.
    tarjetas.forEach((tarjeta, indice) => {
      tarjeta.addEventListener("click", async () => {
        // Primero centrar una tarjeta lateral.
        if (indice !== indiceActivo) {
          indiceActivo = indice;
          actualizarCarrusel();
          return;
        }

        const categoriaSeleccionada = tarjeta.dataset.category;

        resultsContainer.innerHTML = `
          <p>
            Buscando establecimientos de
            ${escapeHTML(categoriaSeleccionada)}...
          </p>
        `;

        try {
          const establecimientos = await obtenerEstablecimientos();

          resultadosActuales = establecimientos.filter(
            (establecimiento) =>
              normalizarTexto(establecimiento.categorias?.nombre) ===
              normalizarTexto(categoriaSeleccionada),
          );

          mostrarEstablecimientosEnMapa(resultadosActuales);

          if (resultadosActuales.length === 0) {
            resultsContainer.innerHTML = `
              <p>
                No hay establecimientos registrados
                en ${escapeHTML(categoriaSeleccionada)}.
              </p>
            `;
            return;
          }

          resultsContainer.innerHTML =
            construirTarjetasEstablecimientos(resultadosActuales);
        } catch (error) {
          console.error("Error al filtrar la categoría:", error);

          resultsContainer.innerHTML = `
            <p>
              No fue posible consultar esta categoría.
            </p>
          `;
        }
      });
    });

    actualizarCarrusel();
    iniciarAutomatico();

    // Permitir reinicializar sin acumular intervalos.
    detenerCarruselCategorias = detenerAutomatico;
  } catch (error) {
    console.error("Error al cargar las categorías:", error);

    contenedor.innerHTML = "<p>No fue posible cargar las categorías.</p>";
  }
}

/* =========================================================
   CARGAR MAPA PRINCIPAL
   ========================================================= */

async function cargarMapa() {
  try {
    inicializarMapa("map");

    const establecimientos = await obtenerEstablecimientos();

    establecimientosDisponibles = establecimientos || [];

    mostrarEstablecimientosEnMapa(establecimientosDisponibles);
  } catch (error) {
    console.error("Error al cargar el mapa:", error);

    const contenedorMapa = document.querySelector("#map");

    if (contenedorMapa) {
      contenedorMapa.innerHTML = `
                <div class="map-message">
                    <strong>No fue posible cargar el mapa</strong>
                    <p>Intenta actualizar la página.</p>
                </div>
            `;
    }
  }
}

/* =========================================================
   ACERCA DEL PROYECTO — SECCIÓN DESPLEGABLE
   ========================================================= */

function inicializarAcercaDelProyecto() {
  const seccion = document.querySelector("#acerca");
  const boton = document.querySelector("#sigeco-about-toggle");
  const contenido = document.querySelector("#sigeco-about-content");
  const enlaceMenu = document.querySelector('.navigation a[href="#acerca"]');

  if (!seccion || !boton || !contenido) return;

  const movimientoReducido = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  function establecerEstado(abierto) {
    boton.setAttribute("aria-expanded", String(abierto));
    seccion.classList.toggle("is-open", abierto);
    contenido.inert = !abierto;
  }

  function desplazarASeccion() {
    seccion.scrollIntoView({
      behavior: movimientoReducido.matches ? "instant" : "smooth",
      block: "start",
    });
  }

  function abrirDesdeMenu() {
    establecerEstado(true);

    requestAnimationFrame(() => {
      desplazarASeccion();
    });
  }

  boton.addEventListener("click", () => {
    const abierto = boton.getAttribute("aria-expanded") === "true";
    establecerEstado(!abierto);
  });

  enlaceMenu?.addEventListener("click", (evento) => {
    evento.preventDefault();
    abrirDesdeMenu();

    if (window.location.hash !== "#acerca") {
      history.replaceState(null, "", "#acerca");
    }
  });

  // También funciona si se abre directamente la URL con #acerca.
  if (window.location.hash === "#acerca") {
    abrirDesdeMenu();
  }

  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#acerca") {
      abrirDesdeMenu();
    }
  });
}

inicializarAcercaDelProyecto();

/* =========================================================
   INICIO DE LA APLICACIÓN
   ========================================================= */

async function iniciarAplicacion() {
  await Promise.all([cargarCategorias(), cargarMapa()]);
}

// Ejecuta la aplicación.
iniciarAplicacion();
