
import L from "leaflet";
import { supabase } from "./supabase.js";

// ======================================================
// VARIABLES DE LOS MAPAS
// ======================================================

let mapa = null;
let marcadores = [];

let mapaDetalles = null;
let marcadorDetalle = null;

let establecimientosActuales = [];

const CENTRO_SOGAMOSO = [5.7143, -72.9339];

const BUCKET_IMAGENES = "sigeco-imagenes";

// ======================================================
// UTILIDADES
// ======================================================

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
      })[caracter]
  );
}

function normalizarCategoria(nombre) {
  return String(nombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();
}

function coordenadasValidas(latitud, longitud) {
  return (
    Number.isFinite(latitud) &&
    Number.isFinite(longitud) &&
    latitud >= -90 &&
    latitud <= 90 &&
    longitud >= -180 &&
    longitud <= 180 &&
    !(latitud === 0 && longitud === 0)
  );
}

// ======================================================
// COLORES PERSONALIZADOS DE LAS CATEGORÍAS
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
// ÍCONOS ESPECÍFICOS DE LAS CATEGORÍAS
// ======================================================

const ICONOS_CATEGORIAS = {
  // Gastronomía
  gastronomia: "🍽️",
  restaurante: "🍽️",
  cafeteria: "☕",
  panaderia: "🥖",
  bebidas: "🥤",
  bar: "🍻",
  heladeria: "🍦",
  reposteria: "🧁",

  // Comercio
  comercio: "🛍️",
  tiendas: "🛒",
  vestuario: "👕",
  calzado: "👟",
  accesorios: "👜",
  supermercados: "🛒",

  // Salud
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

  // Transporte
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

  // Deportes
  deportes: "⚽",
  entrenamiento: "🏋️",
  gimnasio: "💪",
  natacion: "🏊",
  piscinas: "🏊",
  ciclismo: "🚴",
  recreacion: "🎡",

  // Espacios naturales
  parques: "🌳",
  zonas_verdes: "🌿",
  plazas: "⛲",
  senderismo: "🥾",
  naturaleza: "🌲",

  // Finanzas y otros
  finanzas: "💰",
  seguros: "🛡️",
  eventos: "🎟️",
  emprendimientos: "🌱",
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
// OBTENER CONFIGURACIÓN DE CATEGORÍA
// ======================================================

function obtenerConfiguracionCategoria(nombreCategoria) {
  const nombre = normalizarCategoria(nombreCategoria);

  // Buscar primero un ícono específico.
  const claveIcono = Object.keys(
    ICONOS_CATEGORIAS
  )
    .filter((clave) => clave !== "otros")
    .find((clave) => {
      return nombre.includes(
        normalizarCategoria(clave)
      );
    });

  const icono = claveIcono
    ? ICONOS_CATEGORIAS[claveIcono]
    : ICONOS_CATEGORIAS.otros;

  // Buscar el grupo al que pertenece la categoría.
  let grupo = "otros";

  for (const [nombreGrupo, palabras] of Object.entries(
    GRUPOS_CATEGORIAS
  )) {
    if (
      palabras.some((palabra) =>
        nombre.includes(palabra)
      )
    ) {
      grupo = nombreGrupo;
      break;
    }
  }

  return {
    icono,
    color:
      COLORES_CATEGORIAS[grupo] ||
      COLORES_CATEGORIAS.otros,
  };
}

// ======================================================
// CREAR MARCADOR PERSONALIZADO
// ======================================================

function crearIconoUbicacion(nombreCategoria) {
  const configuracion =
    obtenerConfiguracionCategoria(nombreCategoria);

  return L.divIcon({
    className: "sigeco-marker-container",

    html: `
      <div
        class="sigeco-location-marker"
        style="--sigeco-marker-color: ${configuracion.color};"
      >
        <div class="sigeco-location-marker-circle">
          <span class="sigeco-location-marker-icon">
            ${configuracion.icono}
          </span>
        </div>
      </div>
    `,

    iconSize: [48, 62],
    iconAnchor: [24, 60],
    popupAnchor: [0, -54],
  });
}

// ======================================================
// ESTILOS DE LOS MARCADORES
// ======================================================

function inicializarEstilosMarcadores() {
  if (
    document.getElementById(
      "sigeco-marker-styles"
    )
  ) {
    return;
  }

  const estilos = document.createElement("style");

  estilos.id = "sigeco-marker-styles";

  estilos.textContent = `
    .sigeco-marker-container {
      background: transparent !important;
      border: none !important;
    }

    .sigeco-location-marker {
      position: relative;
      width: 48px;
      height: 62px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      filter: drop-shadow(
        0 4px 5px rgba(0, 0, 0, 0.23)
      );
      transition: transform 0.2s ease;
    }

    .sigeco-location-marker::before {
      content: "";
      position: absolute;
      top: 0;
      left: 3px;
      width: 42px;
      height: 42px;
      background: var(--sigeco-marker-color);
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-sizing: border-box;
    }

    .sigeco-location-marker-circle {
      position: absolute;
      top: 7px;
      left: 10px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }

    .sigeco-location-marker-icon {
      font-size: 18px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sigeco-marker-container:hover
    .sigeco-location-marker {
      transform: translateY(-5px) scale(1.08);
    }

    .sigeco-map-popup {
      min-width: 190px;
      max-width: 260px;
      font-family: inherit;
    }

    .sigeco-map-popup h3 {
      font-size: 15px;
      font-weight: 800;
      margin: 0 0 9px;
      color: #123d3b;
    }

    .sigeco-map-popup-category {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 20px;
      background: #e7f5ee;
      color: #176b43;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .sigeco-map-popup p {
      margin: 5px 0;
      font-size: 12px;
      color: #52636a;
      line-height: 1.5;
    }

    .sigeco-map-popup-logo {
      display: block;
      width: 100%;
      max-height: 130px;
      object-fit: contain;
      border-radius: 10px;
      margin-bottom: 10px;
      background: #f7faf8;
    }
  `;

  document.head.appendChild(estilos);
}

// ======================================================
// INICIALIZAR MAPA PRINCIPAL
// ======================================================

export function inicializarMapa(contenedor = "map") {
  if (mapa) {
    return mapa;
  }

  inicializarEstilosMarcadores();

  mapa = L.map(contenedor).setView(
    CENTRO_SOGAMOSO,
    14
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap",
    }
  ).addTo(mapa);

  return mapa;
}

// ======================================================
// OBTENER LOGO DEL ESTABLECIMIENTO
// ======================================================

function obtenerLogoEstablecimiento(establecimiento) {
  const ruta = establecimiento.imagen_path;

  if (ruta) {
    // Compatibilidad con URL completa.
    if (/^https?:\/\//i.test(ruta)) {
      return ruta;
    }

    // Obtener URL pública desde Supabase Storage.
    const { data } = supabase.storage
      .from(BUCKET_IMAGENES)
      .getPublicUrl(ruta);

    return data?.publicUrl || null;
  }

  const imagenes = Array.isArray(
    establecimiento.imagenes_establecimiento
  )
    ? establecimiento.imagenes_establecimiento
    : [];

  const logo = imagenes.find(
    (imagen) => imagen.tipo === "logo"
  );

  if (logo?.ruta_archivo) {
    if (/^https?:\/\//i.test(logo.ruta_archivo)) {
      return logo.ruta_archivo;
    }

    const { data } = supabase.storage
      .from(BUCKET_IMAGENES)
      .getPublicUrl(logo.ruta_archivo);

    return data?.publicUrl || null;
  }

  return null;
}

// ======================================================
// INFORMACIÓN DE CADA MARCADOR
// ======================================================

function construirPopupEstablecimiento(establecimiento) {
  const nombre = escapeHTML(
    establecimiento.nombre || "Sin nombre"
  );

  const direccion = escapeHTML(
    establecimiento.direccion || "Sin dirección"
  );

  const categoria = escapeHTML(
    establecimiento.categorias?.nombre ||
    "Sin categoría"
  );

  const logo = obtenerLogoEstablecimiento(
    establecimiento
  );

  return `
    <div class="sigeco-map-popup">

      ${
        logo
          ? `
            <img
              class="sigeco-map-popup-logo"
              src="${escapeHTML(logo)}"
              alt="Logo de ${nombre}"
            >
          `
          : ""
      }

      <h3>${nombre}</h3>

      <span class="sigeco-map-popup-category">
        ${categoria}
      </span>

      <p>
        <strong>Dirección:</strong>
        ${direccion}
      </p>

    </div>
  `;
}

// ======================================================
// MOSTRAR ESTABLECIMIENTOS EN EL MAPA
// ======================================================

export function mostrarEstablecimientosEnMapa(
  establecimientos
) {
  if (!mapa) {
    console.error(
      "El mapa todavía no ha sido inicializado."
    );
    return;
  }

  inicializarEstilosMarcadores();

  // Eliminar marcadores anteriores.
  marcadores.forEach((marcador) => {
    mapa.removeLayer(marcador);
  });

  marcadores = [];

  establecimientosActuales = Array.isArray(
    establecimientos
  )
    ? establecimientos
    : [];

  establecimientosActuales.forEach(
    (establecimiento) => {
      const latitud = Number(
        establecimiento.latitud
      );

      const longitud = Number(
        establecimiento.longitud
      );

      if (!coordenadasValidas(latitud, longitud)) {
        return;
      }

      const categoria =
        establecimiento.categorias?.nombre ||
        "Sin categoría";

      // Obtener el ícono específico de la categoría.
      const iconoPersonalizado =
        crearIconoUbicacion(categoria);

      // Crear marcador.
      const marcador = L.marker(
        [latitud, longitud],
        {
          icon: iconoPersonalizado,

          title:
            establecimiento.nombre ||
            "Establecimiento",
        }
      ).addTo(mapa);

      // Mostrar información del establecimiento.
      marcador.bindPopup(
        construirPopupEstablecimiento(
          establecimiento
        )
      );

      marcadores.push(marcador);
    }
  );
}

// ======================================================
// LOCALIZAR ESTABLECIMIENTO
// ======================================================

export function localizarEstablecimientoEnMapa(
  latitud,
  longitud
) {
  if (!mapa) {
    console.error(
      "El mapa todavía no ha sido inicializado."
    );
    return;
  }

  const lat = Number(latitud);
  const lng = Number(longitud);

  if (!coordenadasValidas(lat, lng)) {
    return;
  }

  mapa.setView([lat, lng], 16);

  const marcadorEncontrado = marcadores.find(
    (marcador) => {
      const posicion = marcador.getLatLng();

      return (
        Math.abs(posicion.lat - lat) < 0.000001 &&
        Math.abs(posicion.lng - lng) < 0.000001
      );
    }
  );

  if (marcadorEncontrado) {
    marcadorEncontrado.openPopup();
  }
}

// ======================================================
// MAPA DE DETALLES DEL ESTABLECIMIENTO
// ======================================================

export function mostrarMapaDetalles(
  latitud,
  longitud
) {
  const lat = Number(latitud);
  const lng = Number(longitud);

  if (!coordenadasValidas(lat, lng)) {
    return;
  }

  const contenedor = document.getElementById(
    "details-map"
  );

  if (!contenedor) {
    console.error(
      "No se encontró el contenedor del mapa de detalles."
    );
    return;
  }

  inicializarEstilosMarcadores();

  // Destruir mapa anterior.
  if (mapaDetalles) {
    mapaDetalles.remove();

    mapaDetalles = null;
    marcadorDetalle = null;
  }

  // Crear mapa de detalles.
  mapaDetalles = L.map(contenedor).setView(
    [lat, lng],
    16
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap",
    }
  ).addTo(mapaDetalles);

  // Encontrar el establecimiento correspondiente.
  const establecimiento =
    establecimientosActuales.find((item) => {
      return (
        Math.abs(Number(item.latitud) - lat) <
          0.000001 &&
        Math.abs(Number(item.longitud) - lng) <
          0.000001
      );
    });

  const categoria =
    establecimiento?.categorias?.nombre ||
    "Sin categoría";

  // Mostrar marcador con el ícono específico.
  marcadorDetalle = L.marker(
    [lat, lng],
    {
      icon: crearIconoUbicacion(categoria),
    }
  ).addTo(mapaDetalles);

  // Mostrar información si está disponible.
  if (establecimiento) {
    marcadorDetalle.bindPopup(
      construirPopupEstablecimiento(
        establecimiento
      )
    );
  }

  // Corregir dimensiones al abrir el mapa.
  requestAnimationFrame(() => {
    mapaDetalles?.invalidateSize();
  });
}
