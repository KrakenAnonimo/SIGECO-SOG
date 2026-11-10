
// Importa Leaflet para crear y controlar el mapa interactivo.
import L from 'leaflet';

// Guarda la referencia del mapa para poder utilizarlo en otras funciones.
let mapa = null;

// Guarda los marcadores que se muestran en el mapa.
let marcadores = [];

// Crea el mapa centrado inicialmente en Sogamoso.
export function inicializarMapa(contenedor = 'map') {

    // Evita crear el mapa más de una vez.
    if (mapa) {
        return mapa;
    }

    // Crea el mapa dentro del elemento HTML indicado.
    mapa = L.map(contenedor).setView([5.7143, -72.9339], 14);

    // Agrega el mapa base de OpenStreetMap.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(mapa);

    return mapa;
}

// Muestra los establecimientos registrados mediante marcadores.
export function mostrarEstablecimientosEnMapa(establecimientos) {

    // Comprueba que el mapa haya sido inicializado.
    if (!mapa) {
        console.error('El mapa todavía no ha sido inicializado.');
        return;
    }

    // Elimina los marcadores anteriores antes de mostrar los nuevos.
    marcadores.forEach(marcador => mapa.removeLayer(marcador));
    marcadores = [];

    // Recorre los establecimientos recibidos desde Supabase.
    establecimientos.forEach(establecimiento => {

        // Comprueba que el establecimiento tenga coordenadas válidas.
        const latitud = Number(establecimiento.latitud);
        const longitud = Number(establecimiento.longitud);

        if (
            !Number.isFinite(latitud) ||
            !Number.isFinite(longitud) ||
            latitud < -90 ||
            latitud > 90 ||
            longitud < -180 ||
            longitud > 180
        ) {
            return;
        }

        // Crea un marcador en la ubicación del establecimiento.
        const marcador = L.marker([latitud, longitud]).addTo(mapa);

        // Muestra el nombre, la dirección y la categoría al seleccionar el marcador.
        marcador.bindPopup(`
            <strong>${escapeHTML(establecimiento.nombre || 'Sin nombre')}</strong>
            <br>
            ${escapeHTML(establecimiento.direccion || 'Sin dirección')}
            <br>
            ${escapeHTML(establecimiento.categorias?.nombre || 'Sin categoría')}
        `);

        // Guarda el marcador para poder actualizarlo posteriormente.
        marcadores.push(marcador);
    });
}
// Centra el mapa en el establecimiento seleccionado y abre su información.
export function localizarEstablecimientoEnMapa(latitud, longitud) {

    // Comprueba que el mapa esté disponible.
    if (!mapa) {
        console.error('El mapa todavía no ha sido inicializado.');
        return;
    }

    // Convierte las coordenadas a números.
    const lat = Number(latitud);
    const lng = Number(longitud);

    // Comprueba que las coordenadas sean válidas.
    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
    ) {
        return;
    }

    // Centra el mapa y acerca la vista a la ubicación seleccionada.
    mapa.setView([lat, lng], 16);

    // Busca el marcador correspondiente al establecimiento.
    const marcadorEncontrado = marcadores.find((marcador) => {
        const posicion = marcador.getLatLng();

        return posicion.lat === lat && posicion.lng === lng;
    });

    // Abre la ventana de información del establecimiento.
    if (marcadorEncontrado) {
        marcadorEncontrado.openPopup();
    }
}
// Protege los textos mostrados en las ventanas del mapa.
function escapeHTML(texto) {
    return String(texto).replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}
// Guarda el mapa independiente que aparecerá en la ventana de detalles.
let mapaDetalles = null;

// Guarda el marcador del establecimiento seleccionado.
let marcadorDetalle = null;

// Muestra la ubicación del establecimiento dentro de la ventana flotante.
export function mostrarMapaDetalles(latitud, longitud) {

    // Convierte las coordenadas a números.
    const lat = Number(latitud);
    const lng = Number(longitud);

    // Comprueba que las coordenadas sean válidas.
    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
    ) {
        return;
    }

    // Crea el segundo mapa únicamente la primera vez que se utiliza.
    if (!mapaDetalles) {

        // Inicializa el mapa dentro del contenedor de detalles.
        mapaDetalles = L.map('details-map').setView([lat, lng], 16);

        // Agrega el mapa base de OpenStreetMap.
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(mapaDetalles);

    } else {

        // Actualiza el tamaño del mapa cuando vuelve a mostrarse.
        mapaDetalles.invalidateSize();

        // Centra el mapa en el establecimiento seleccionado.
        mapaDetalles.setView([lat, lng], 16);
    }

    // Crea el marcador si todavía no existe.
    if (!marcadorDetalle) {
        marcadorDetalle = L.marker([lat, lng]).addTo(mapaDetalles);
    } else {

        // Mueve el marcador a la nueva ubicación.
        marcadorDetalle.setLatLng([lat, lng]);
    }
}