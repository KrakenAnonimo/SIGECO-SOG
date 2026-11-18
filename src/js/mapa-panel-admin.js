
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ======================================================
// VARIABLES DEL MAPA ADMINISTRATIVO
// ======================================================

let mapaPanel = null;
let contenedorActual = null;
let capaEstablecimientos = null;

// Centro geográfico de Sogamoso, Boyacá.
const UBICACION_CENTRO = [5.7143, -72.9339];

// Nivel de acercamiento inicial.
const ZOOM_INICIAL = 14;

// ======================================================
// COLORES DE LAS CATEGORÍAS
// ======================================================

const COLORES_CATEGORIAS = {
  gastronomia: "#ea580c",
  comercio: "#2563eb",
  salud: "#dc2626",
  tecnologia: "#7c3aed",
  servicios: "#0891b2",
  construccion: "#d97706",
  hogar: "#a16207",
  educacion: "#4f46e5",
  cultura: "#db2777",
  turismo: "#0d9488",
  alojamiento: "#0284c7",
  transporte: "#475569",
  agricultura: "#16a34a",
  deportes: "#65a30d",
  parques: "#15803d",
  finanzas: "#9333ea",
  otros: "#64748b",
};

// ======================================================
// ÍCONOS PERSONALIZADOS DE LAS CATEGORÍAS
// ======================================================

const ICONOS_CATEGORIAS = {
  // Gastronomía y alimentos
  gastronomia: "🍽️",
  restaurante: "🍽️",
  cafeteria: "☕",
  panaderia: "🥖",
  bebidas: "🥤",
  bar: "🍻",
  heladeria: "🍦",
  reposteria: "🧁",

  // Comercio y ventas
  comercio: "🛍️",
  tiendas: "🛒",
  vestuario: "👕",
  calzado: "👟",
  accesorios: "👜",
  supermercados: "🛒",

  // Salud y bienestar
  salud: "🏥",
  farmacia: "💊",
  odontologia: "🦷",
  optica: "👓",
  belleza: "💇",
  bienestar: "🧘",

  // Tecnología y servicios
  tecnologia: "💻",
  electronica: "🔌",
  servicios: "🛠️",
  profesionales: "💼",
  mantenimiento: "🔧",
  fotografia: "📷",

  // Construcción y hogar
  construccion: "🏗️",
  ferreteria: "🔨",
  hogar: "🏠",
  decoracion: "🛋️",
  muebles: "🪑",
  inmobiliaria: "🏡",

  // Educación y cultura
  educacion: "📚",
  papeleria: "✏️",
  cultura: "🎭",
  arte: "🎨",
  musica: "🎵",
  entretenimiento: "🎬",

  // Turismo y alojamiento
  turismo: "🧭",
  alojamiento: "🏨",
  hoteleria: "🛎️",

  // Transporte y automotores
  transporte: "🚚",
  automotores: "🚗",
  motocicletas: "🏍️",
  bicicletas: "🚲",
  talleres: "🔩",

  // Agricultura y naturaleza
  agricultura: "🌱",
  ganaderia: "🐄",
  floristeria: "💐",
  jardineria: "🪴",
  mascotas: "🐾",
  veterinaria: "🐕",

  // Deportes y actividad física
  deportes: "⚽",
  entrenamiento: "🏋️",
  gimnasio: "💪",
  natacion: "🏊",
  piscinas: "🏊",
  ciclismo: "🚴",
  recreacion: "🎡",

  // Espacios públicos y naturales
  parques: "🌳",
  zonas_verdes: "🌿",
  plazas: "⛲",
  senderismo: "🥾",
  naturaleza: "🌲",

  // Finanzas y otros
  finanzas: "💰",
  seguros: "🛡️",
  eventos: "🎟️",
  otros: "🏪",
};

// ======================================================
// GRUPOS DE CATEGORÍAS
// ======================================================

const GRUPOS_CATEGORIAS = {
  gastronomia: [
    "gastronomia",
    "restaurante",
    "comida",
    "alimento",
    "cafeteria",
    "panaderia",
    "bebida",
    "bar",
    "heladeria",
    "reposteria",
  ],

  comercio: [
    "comercio",
    "tienda",
    "supermercado",
    "vestuario",
    "ropa",
    "moda",
    "calzado",
    "accesorio",
  ],

  salud: [
    "salud",
    "farmacia",
    "odontologia",
    "optica",
    "belleza",
    "bienestar",
  ],

  tecnologia: [
    "tecnologia",
    "electronica",
    "celular",
  ],

  servicios: [
    "servicio",
    "profesional",
    "mantenimiento",
    "fotografia",
  ],

  construccion: [
    "construccion",
    "ferreteria",
  ],

  hogar: [
    "hogar",
    "decoracion",
    "mueble",
    "inmobiliaria",
  ],

  educacion: [
    "educacion",
    "papeleria",
    "oficina",
  ],

  cultura: [
    "cultura",
    "arte",
    "musica",
    "entretenimiento",
  ],

  turismo: [
    "turismo",
    "recreacion",
    "evento",
  ],

  alojamiento: [
    "alojamiento",
    "hoteleria",
    "hotel",
    "hospedaje",
  ],

  transporte: [
    "transporte",
    "automotor",
    "motocicleta",
    "bicicleta",
    "taller",
  ],

  agricultura: [
    "agricultura",
    "ganaderia",
    "floristeria",
    "jardineria",
    "vivero",
    "mascota",
    "veterinaria",
  ],

  deportes: [
    "deporte",
    "entrenamiento",
    "gimnasio",
    "fitness",
    "natacion",
    "piscina",
    "ciclismo",
  ],

  parques: [
    "parque",
    "zona verde",
    "plaza",
    "senderismo",
    "naturaleza",
  ],

  finanzas: [
    "finanza",
    "seguro",
  ],

  otros: [
    "otro",
    "sin categoria",
  ],
};

// ======================================================
// PROTECCIÓN DE TEXTOS HTML
// ======================================================

function escaparHTML(valor) {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (caracter) => {
      const caracteres = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };

      return caracteres[caracter];
    }
  );
}

// ======================================================
// NORMALIZACIÓN DE CATEGORÍAS
// ======================================================

function normalizarCategoria(nombre) {
  return String(nombre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]/g, " ")
    .trim();
}

// ======================================================
// OBTENER COLOR DE CATEGORÍA
// ======================================================

function obtenerColorCategoria(categoria) {
  const nombre = normalizarCategoria(categoria.nombre);

  for (const [grupo, palabras] of Object.entries(
    GRUPOS_CATEGORIAS
  )) {
    if (
      palabras.some((palabra) =>
        nombre.includes(palabra)
      )
    ) {
      return COLORES_CATEGORIAS[grupo];
    }
  }

  return COLORES_CATEGORIAS.otros;
}

// ======================================================
// OBTENER ÍCONO DE CATEGORÍA
// ======================================================

function obtenerIconoCategoria(nombreCategoria) {
  const nombre = normalizarCategoria(nombreCategoria);

  const categoriaEncontrada = Object.keys(
    ICONOS_CATEGORIAS
  ).find((clave) => {
    const claveNormalizada = normalizarCategoria(clave);

    return nombre.includes(claveNormalizada);
  });

  return categoriaEncontrada
    ? ICONOS_CATEGORIAS[categoriaEncontrada]
    : "🏪";
}

// ======================================================
// ESTILOS DE MARCADORES PERSONALIZADOS
// ======================================================

function inicializarEstilosMarcadoresAdmin() {
  if (
    document.getElementById(
      "sigeco-marcadores-admin-estilos"
    )
  ) {
    return;
  }

  const estilo = document.createElement("style");

  estilo.id = "sigeco-marcadores-admin-estilos";

  estilo.textContent = `
    /* Marcador Leaflet sin fondo predeterminado */

    .marcador-categoria-admin {
      background: transparent !important;
      border: none !important;
    }

    /* Contenedor del indicador de ubicación */

    .marcador-categoria-admin .marcador-ubicacion-admin {
      position: relative;
      width: 48px;
      height: 62px;
      filter: drop-shadow(
        0 4px 5px rgba(0, 0, 0, 0.23)
      );
      transition: transform 0.2s ease;
    }

    /* Forma de marcador de ubicación */

    .marcador-categoria-admin
    .marcador-ubicacion-admin::before {
      content: "";
      position: absolute;
      top: 0;
      left: 3px;
      width: 42px;
      height: 42px;
      background: var(--color-marcador);
      border: 3px solid #ffffff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-sizing: border-box;
    }

    /* Círculo blanco central */

    .marcador-categoria-admin
    .marcador-ubicacion-admin-centro {
      position: absolute;
      top: 7px;
      left: 10px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border-radius: 50%;
      z-index: 1;
      font-size: 18px;
      line-height: 1;
    }

    /* Animación al pasar el cursor */

    .marcador-categoria-admin:hover
    .marcador-ubicacion-admin {
      transform: translateY(-5px) scale(1.08);
    }
  `;

  document.head.appendChild(estilo);
}

// ======================================================
// CREAR ÍCONO DE UBICACIÓN PERSONALIZADO
// ======================================================

function crearMarcadorCategoriaAdmin(
  color,
  icono,
  activo = true
) {
  return L.divIcon({
    className: "marcador-categoria-admin",

    html: `
      <div
        class="marcador-ubicacion-admin"
        style="
          --color-marcador: ${color};
          opacity: ${activo ? 1 : 0.45};
        "
      >
        <span class="marcador-ubicacion-admin-centro">
          ${icono}
        </span>
      </div>
    `,

    iconSize: [48, 62],
    iconAnchor: [24, 60],
    popupAnchor: [0, -54],
  });
}

// ======================================================
// DIBUJAR ESTABLECIMIENTOS EN EL MAPA
// ======================================================

function dibujarEstablecimientos(establecimientos) {
  if (!mapaPanel || !capaEstablecimientos) {
    return;
  }

  // Eliminar marcadores anteriores.
  capaEstablecimientos.clearLayers();

  // Categorías para la leyenda.
  const categorias = new Map();

  // Recorrer establecimientos.
  (establecimientos || []).forEach(
    (establecimiento) => {
      const latitud = Number(
        establecimiento.latitud
      );

      const longitud = Number(
        establecimiento.longitud
      );

      // Validar coordenadas.
      if (
        !Number.isFinite(latitud) ||
        !Number.isFinite(longitud) ||
        Math.abs(latitud) > 90 ||
        Math.abs(longitud) > 180
      ) {
        return;
      }

      // Obtener información de categoría.
      const categoria =
        establecimiento.categorias || {};

      const nombreCategoria =
        categoria.nombre || "Sin categoría";

      // Obtener color personalizado.
      const color = obtenerColorCategoria({
        id:
          establecimiento.categoria_id ||
          nombreCategoria,

        nombre: nombreCategoria,
      });

      // Agregar categoría a la leyenda.
      categorias.set(nombreCategoria, color);

      // Estado del establecimiento.
      const activo =
        establecimiento.estado === "activo";

      // Obtener ícono personalizado.
      const icono = obtenerIconoCategoria(
        nombreCategoria
      );

      // Crear marcador de ubicación.
      const marcador = L.marker(
        [latitud, longitud],
        {
          icon: crearMarcadorCategoriaAdmin(
            color,
            icono,
            activo
          ),

          title:
            establecimiento.nombre ||
            "Establecimiento",
        }
      );

      // Información de la ventana emergente.
      const contenidoPopup = `
        <div class="mapa-admin-popup">

          <strong>
            ${escaparHTML(
              establecimiento.nombre || "Sin nombre"
            )}
          </strong>

          <p>
            <span class="mapa-popup-etiqueta">
              Categoría:
            </span>

            ${escaparHTML(nombreCategoria)}
          </p>

          <p>
            <span class="mapa-popup-etiqueta">
              Dirección:
            </span>

            ${escaparHTML(
              establecimiento.direccion ||
              "No registrada"
            )}
          </p>

          <p>
            <span class="mapa-popup-etiqueta">
              Estado:
            </span>

            ${escaparHTML(
              activo ? "Activo" : "Inactivo"
            )}
          </p>

        </div>
      `;

      // Vincular ventana informativa.
      marcador.bindPopup(contenidoPopup);

      // Agregar al mapa.
      marcador.addTo(capaEstablecimientos);
    }
  );

  // ====================================================
  // LEYENDA DE CATEGORÍAS
  // ====================================================

  const leyenda = document.getElementById(
    "mapa-panel-leyenda"
  );

  if (leyenda) {
    if (categorias.size === 0) {
      leyenda.innerHTML =
        "<span>No hay categorías para mostrar.</span>";
    } else {
      leyenda.innerHTML = Array.from(
        categorias.entries()
      )
        .sort((a, b) =>
          a[0].localeCompare(b[0])
        )
        .map(
          ([nombre, color]) => `
            <span class="mapa-leyenda-item">

              <i style="background-color:${color}">
                ${obtenerIconoCategoria(nombre)}
              </i>

              ${escaparHTML(nombre)}

            </span>
          `
        )
        .join("");
    }
  }

  // Mantener el mapa centrado en Sogamoso.
  mapaPanel.setView(
    UBICACION_CENTRO,
    ZOOM_INICIAL
  );

  // Actualizar dimensiones.
  requestAnimationFrame(() => {
    mapaPanel?.invalidateSize(true);
  });
}

// ======================================================
// INICIALIZAR O ACTUALIZAR MAPA ADMINISTRATIVO
// ======================================================

export function mostrarMapaPanelAdmin(
  establecimientos
) {
  const contenedor = document.getElementById(
    "mapa-panel-admin"
  );

  if (!contenedor) {
    return;
  }

  // Si cambió el contenedor, destruir el mapa anterior.
  if (
    mapaPanel &&
    contenedorActual !== contenedor
  ) {
    mapaPanel.remove();

    mapaPanel = null;
    contenedorActual = null;
    capaEstablecimientos = null;
  }

  // Activar estilos personalizados.
  inicializarEstilosMarcadoresAdmin();

  // Crear mapa si todavía no existe.
  if (!mapaPanel) {
    mapaPanel = L.map(contenedor, {
      scrollWheelZoom: true,
    }).setView(
      UBICACION_CENTRO,
      ZOOM_INICIAL
    );

    contenedorActual = contenedor;

    // Agregar OpenStreetMap.
    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',

        maxZoom: 19,
      }
    ).addTo(mapaPanel);

    // Crear capa de establecimientos.
    capaEstablecimientos = L.layerGroup().addTo(
      mapaPanel
    );
  }

  // Mostrar marcadores personalizados.
  dibujarEstablecimientos(establecimientos);

  // Corregir dimensiones después de mostrar el mapa.
  setTimeout(() => {
    mapaPanel?.invalidateSize(true);
  }, 300);
}
