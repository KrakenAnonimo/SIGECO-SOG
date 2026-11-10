
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Estado del selector geográfico.
let mapaUbicacion = null;
let marcadorUbicacion = null;

// Configuración inicial.
const UBICACION_INICIAL = [5.7143, -72.9339];
const NIVEL_ZOOM_INICIAL = 15;
const NIVEL_ZOOM_BUSQUEDA = 18;

// Inicializa el mapa administrativo.
export function inicializarMapaUbicacion() {
    const contenedor = document.querySelector('#mapa-nuevo-establecimiento');

    if (!contenedor) return;

    // Recupera el mapa existente.
    if (mapaUbicacion) {
        setTimeout(() => {
            mapaUbicacion.invalidateSize(true);
        }, 300);

        return;
    }

    // Crea el mapa.
    mapaUbicacion = L.map(contenedor).setView(
        UBICACION_INICIAL,
        NIVEL_ZOOM_INICIAL
    );

    // Configura el mapa base de OpenStreetMap.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(mapaUbicacion);

   // Al hacer clic, guarda las coordenadas y busca la dirección.
mapaUbicacion.on('click', async (evento) => {
    actualizarUbicacion(evento.latlng);
    await obtenerDireccionPorCoordenadas(evento.latlng);
});

    // Establece la ubicación inicial.
    actualizarUbicacion({
        lat: UBICACION_INICIAL[0],
        lng: UBICACION_INICIAL[1]
    });
}

// Actualiza el marcador y las coordenadas.
function actualizarUbicacion(posicion) {
    const campoLatitud = document.querySelector('#nueva-latitud');
    const campoLongitud = document.querySelector('#nueva-longitud');
    const indicador = document.querySelector('#coordenadas-seleccionadas');

    if (!mapaUbicacion || !campoLatitud || !campoLongitud) {
        return;
    }

    const latitud = Number(posicion.lat);
    const longitud = Number(posicion.lng);

    if (
        !Number.isFinite(latitud) ||
        !Number.isFinite(longitud) ||
        Math.abs(latitud) > 90 ||
        Math.abs(longitud) > 180
    ) {
        return;
    }

    // Crea o actualiza el marcador.
    if (!marcadorUbicacion) {
        marcadorUbicacion = L.marker([latitud, longitud], {
            draggable: true,
            riseOnHover: true,
            title: 'Ubicación del establecimiento',
            alt: 'Marcador de ubicación seleccionada'
        }).addTo(mapaUbicacion);

        // Identifica el punto seleccionado.
        marcadorUbicacion.bindPopup(
            '<strong>Ubicación del establecimiento</strong>'
        );

        // Actualiza las coordenadas al arrastrar el marcador.
        marcadorUbicacion.on('dragend', () => {
            actualizarUbicacion(marcadorUbicacion.getLatLng());
        });
    } else {
        marcadorUbicacion.setLatLng([latitud, longitud]);
    }

    // Guarda las coordenadas seleccionadas.
    campoLatitud.value = latitud;
    campoLongitud.value = longitud;

    // Actualiza el indicador de ubicación.
    if (indicador) {
        indicador.textContent =
            `Ubicación seleccionada: ${latitud.toFixed(6)}, ${longitud.toFixed(6)}`;
    }
}
// Obtiene la dirección correspondiente a las coordenadas seleccionadas.
async function obtenerDireccionPorCoordenadas(posicion) {
    const campoDireccion = document.querySelector('#nueva-direccion');
    const indicador = document.querySelector('#coordenadas-seleccionadas');

    if (!campoDireccion || !indicador) return;

    indicador.textContent = 'Consultando la dirección de la ubicación seleccionada...';

    try {
        const parametros = new URLSearchParams({
            format: 'jsonv2',
            lat: posicion.lat,
            lon: posicion.lng,
            zoom: '18',
            addressdetails: '1'
        });

        const respuesta = await fetch(
            `https://nominatim.openstreetmap.org/reverse?${parametros}`
        );

        if (!respuesta.ok) {
            throw new Error('No fue posible consultar la dirección.');
        }

        const resultado = await respuesta.json();

        if (resultado && resultado.display_name) {
            campoDireccion.value = resultado.display_name;
            indicador.textContent =
                `Dirección encontrada: ${resultado.display_name}`;
        } else {
            indicador.textContent =
                'No se encontró una dirección exacta. Las coordenadas sí quedaron guardadas.';
        }

    } catch (error) {
        console.error('Error al obtener la dirección:', error);

        indicador.textContent =
            'No se pudo obtener la dirección. Puedes escribirla manualmente.';
    }
}
// Busca una dirección en Sogamoso.
export async function buscarDireccion() {
    const campoDireccion = document.querySelector('#nueva-direccion');
    const botonBuscar = document.querySelector('#btn-buscar-ubicacion');
    const indicador = document.querySelector('#coordenadas-seleccionadas');

    if (!campoDireccion || !botonBuscar || !indicador) return;

    const direccion = campoDireccion.value.trim();

    if (!direccion) {
        indicador.textContent = 'Escribe una dirección para realizar la búsqueda.';
        campoDireccion.focus();
        return;
    }

    // Evita solicitudes simultáneas.
    botonBuscar.disabled = true;
    botonBuscar.textContent = 'Buscando...';

    try {
        const consulta = `${direccion}, Sogamoso, Boyacá, Colombia`;

        const parametros = new URLSearchParams({
            format: 'jsonv2',
            limit: '1',
            countrycodes: 'co',
            q: consulta
        });

        const respuesta = await fetch(
            `https://nominatim.openstreetmap.org/search?${parametros}`
        );

        if (!respuesta.ok) {
            throw new Error('Error al consultar el servicio de ubicación.');
        }

        const resultados = await respuesta.json();

        if (!resultados.length) {
            indicador.textContent =
                'No se encontró la dirección. Intenta con otra referencia o selecciona el punto manualmente.';
            return;
        }

        const resultado = resultados[0];

        const posicion = {
            lat: Number(resultado.lat),
            lng: Number(resultado.lon)
        };

        if (
            !Number.isFinite(posicion.lat) ||
            !Number.isFinite(posicion.lng)
        ) {
            throw new Error('Las coordenadas recibidas no son válidas.');
        }

        // Actualiza el marcador y centra el mapa.
        actualizarUbicacion(posicion);

        mapaUbicacion.setView(
            [posicion.lat, posicion.lng],
            NIVEL_ZOOM_BUSQUEDA
        );

        // Identifica visualmente la ubicación encontrada.
        marcadorUbicacion.openPopup();

        indicador.textContent =
            `Ubicación encontrada: ${resultado.display_name}`;

    } catch (error) {
        console.error('Error al buscar la dirección:', error);

        indicador.textContent =
            'No fue posible realizar la búsqueda. Inténtalo nuevamente.';

    } finally {
        botonBuscar.disabled = false;
        botonBuscar.textContent = 'Buscar ubicación';
    }
}// Carga en el mapa la ubicación de un establecimiento existente.
export function establecerUbicacion(latitud, longitud) {
    const lat = Number(latitud);
    const lng = Number(longitud);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180
    ) {
        return;
    }

    // Actualiza el marcador y los campos de coordenadas.
    actualizarUbicacion({ lat, lng });

    // Centra el mapa en la ubicación del establecimiento.
    if (mapaUbicacion) {
        mapaUbicacion.setView([lat, lng], NIVEL_ZOOM_BUSQUEDA);

        setTimeout(() => {
            mapaUbicacion.invalidateSize(true);
        }, 300);
    }
}
// Restablece el mapa para registrar un establecimiento nuevo.
export function restablecerUbicacion() {
    actualizarUbicacion({
        lat: UBICACION_INICIAL[0],
        lng: UBICACION_INICIAL[1]
    });

    if (mapaUbicacion) {
        mapaUbicacion.setView(
            UBICACION_INICIAL,
            NIVEL_ZOOM_INICIAL
        );

        setTimeout(() => {
            mapaUbicacion.invalidateSize(true);
        }, 300);
    }
}