
import { supabase } from './supabase.js';

// Importa las funciones del mapa selector de ubicación.
import {
    inicializarMapaUbicacion,
    buscarDireccion,
    establecerUbicacion,
    restablecerUbicacion
} from './ubicacion-admin.js';

// Contenedor principal del panel administrativo.
const adminApp = document.querySelector('#admin-app');
// Guarda el ID del establecimiento que se está editando.
let establecimientoEnEdicion = null;

// ======================================================
// FUNCIONES GENERALES
// ======================================================

// Evita que los datos ingresados por usuarios se interpreten como HTML.
function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (caracter) => {
        const caracteres = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return caracteres[caracter];
    });
}

// Muestra mensajes en la consola y en pantalla cuando corresponde.
function mostrarError(mensaje, error) {
    console.error(mensaje, error);
    alert(mensaje);
}

// ======================================================
// VERIFICACIÓN DE ACCESO
// ======================================================

async function verificarAcceso() {
    if (!adminApp) {
        console.error('No se encontró el contenedor #admin-app.');
        return;
    }

    try {
        const { data: sesionData, error: sesionError } =
            await supabase.auth.getSession();

        if (sesionError || !sesionData.session) {
            window.location.replace('/');
            return;
        }

        const usuario = sesionData.session.user;

        // Comprueba que el usuario tenga el rol de administrador.
        const { data: rol, error: rolError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', usuario.id)
            .single();

        if (rolError || !rol || rol.role !== 'admin') {
            await supabase.auth.signOut();
            window.location.replace('/');
            return;
        }

        mostrarPanel(usuario);

    } catch (error) {
        console.error('Error al verificar el acceso:', error);
        window.location.replace('/');
    }
}

// ======================================================
// ESTADÍSTICAS DEL PANEL
// ======================================================

async function cargarEstadisticas() {
    const tarjetaEstablecimientos =
        document.querySelector('#total-establecimientos');

    const tarjetaCategorias =
        document.querySelector('#total-categorias');

    const tarjetaUsuarios =
        document.querySelector('#total-usuarios');

    if (!tarjetaEstablecimientos || !tarjetaCategorias || !tarjetaUsuarios) {
        return;
    }

    tarjetaEstablecimientos.textContent = '...';
    tarjetaCategorias.textContent = '...';
    tarjetaUsuarios.textContent = '...';

    const [
        resultadoEstablecimientos,
        resultadoCategorias,
        resultadoUsuarios
    ] = await Promise.all([

        // Cuenta los establecimientos activos.
        supabase
            .from('establecimientos')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'activo'),

        // Cuenta las categorías registradas.
        supabase
            .from('categorias')
            .select('*', { count: 'exact', head: true }),

        // Cuenta los usuarios administrativos visibles.
        supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
    ]);

    if (resultadoEstablecimientos.error) {
        console.error(
            'Error al contar establecimientos:',
            resultadoEstablecimientos.error
        );
    }

    if (resultadoCategorias.error) {
        console.error(
            'Error al contar categorías:',
            resultadoCategorias.error
        );
    }

    if (resultadoUsuarios.error) {
        console.error(
            'Error al contar usuarios:',
            resultadoUsuarios.error
        );
    }

    tarjetaEstablecimientos.textContent =
        resultadoEstablecimientos.error
            ? 'Error'
            : resultadoEstablecimientos.count ?? 0;

    tarjetaCategorias.textContent =
        resultadoCategorias.error
            ? 'Error'
            : resultadoCategorias.count ?? 0;

    tarjetaUsuarios.textContent =
        resultadoUsuarios.error
            ? 'Error'
            : resultadoUsuarios.count ?? 0;
}

// ======================================================
// CATEGORÍAS
// ======================================================

async function cargarCategorias() {
    const selector = document.querySelector('#nueva-categoria');

    if (!selector) return;

    selector.innerHTML =
        '<option value="">Cargando categorías...</option>';

    const { data, error } = await supabase
        .from('categorias')
        .select('id, nombre')
        .order('nombre', { ascending: true });

    if (error) {
        console.error('Error al cargar categorías:', error);

        selector.innerHTML =
            '<option value="">Error al cargar categorías</option>';

        return;
    }

    selector.innerHTML =
        '<option value="">Seleccionar categoría</option>';

    (data || []).forEach((categoria) => {
        const opcion = document.createElement('option');

        opcion.value = categoria.id;
        opcion.textContent = categoria.nombre;

        selector.appendChild(opcion);
    });
}

// ======================================================
// REGISTRO DE ESTABLECIMIENTOS
// ======================================================


async function guardarEstablecimiento(evento) {
    evento.preventDefault();

    const formulario = evento.currentTarget;

    const botonGuardar = formulario.querySelector(
        'button[type="submit"]'
    );

    const mensaje = document.querySelector(
        '#mensaje-nuevo-establecimiento'
    );

    const campoLatitud = document.querySelector('#nueva-latitud');
    const campoLongitud = document.querySelector('#nueva-longitud');

    if (!mensaje || !botonGuardar || !campoLatitud || !campoLongitud) {
        return;
    }

    const latitudTexto = campoLatitud.value;
    const longitudTexto = campoLongitud.value;

    if (!latitudTexto || !longitudTexto) {
        mensaje.textContent = 'Debes seleccionar la ubicación en el mapa.';
        mensaje.style.color = '#b42318';
        return;
    }

    const latitud = Number(latitudTexto);
    const longitud = Number(longitudTexto);

    if (
        !Number.isFinite(latitud) ||
        !Number.isFinite(longitud) ||
        latitud < -90 ||
        latitud > 90 ||
        longitud < -180 ||
        longitud > 180
    ) {
        mensaje.textContent = 'Las coordenadas seleccionadas no son válidas.';
        mensaje.style.color = '#b42318';
        return;
    }

    const establecimiento = {
        nombre: document.querySelector('#nuevo-nombre').value.trim(),
        categoria_id: document.querySelector('#nueva-categoria').value,
        descripcion: document.querySelector('#nueva-descripcion').value.trim(),
        direccion: document.querySelector('#nueva-direccion').value.trim(),
        telefono: document.querySelector('#nuevo-telefono').value.trim(),
        correo: document.querySelector('#nuevo-correo').value.trim(),
        latitud,
        longitud
    };

    if (
        !establecimiento.nombre ||
        !establecimiento.categoria_id ||
        !establecimiento.direccion
    ) {
        mensaje.textContent =
            'Completa los campos obligatorios antes de continuar.';
        mensaje.style.color = '#b42318';
        return;
    }

    const modoEdicion = establecimientoEnEdicion !== null;

    botonGuardar.disabled = true;
    botonGuardar.textContent = modoEdicion ? 'Actualizando...' : 'Guardando...';
    mensaje.textContent = '';

    try {
        let error;

        if (modoEdicion) {
            const resultado = await supabase
                .from('establecimientos')
                .update(establecimiento)
                .eq('id', establecimientoEnEdicion);

            error = resultado.error;
        } else {
            const resultado = await supabase
                .from('establecimientos')
                .insert([{
                    ...establecimiento,
                    estado: 'activo'
                }]);

            error = resultado.error;
        }

        if (error) throw error;

        mensaje.textContent = modoEdicion
            ? 'Establecimiento actualizado correctamente.'
            : 'Establecimiento registrado correctamente.';

        mensaje.style.color = '#187344';

        establecimientoEnEdicion = null;
        formulario.reset();

        await cargarEstablecimientos(
            document.querySelector('#admin-establishments-list')
        );

        await cargarEstadisticas();

        setTimeout(() => {
            const modal = document.querySelector(
                '#modal-nuevo-establecimiento'
            );

            if (modal) modal.hidden = true;
        }, 1200);

    } catch (error) {
        console.error('Error al guardar establecimiento:', error);

        mensaje.textContent =
            'No fue posible guardar los cambios. Verifica los datos y los permisos de Supabase.';

        mensaje.style.color = '#b42318';

    } finally {
        botonGuardar.disabled = false;
        botonGuardar.textContent = modoEdicion
            ? 'Actualizar establecimiento'
            : 'Guardar establecimiento';
    }
}


// ======================================================
// ACTIVAR Y DESACTIVAR ESTABLECIMIENTOS
// ======================================================

async function cambiarEstadoEstablecimiento(id) {
    const { data: establecimiento, error: errorConsulta } =
        await supabase
            .from('establecimientos')
            .select('estado')
            .eq('id', id)
            .single();

    if (errorConsulta || !establecimiento) {
        mostrarError(
            'No fue posible consultar el establecimiento.',
            errorConsulta
        );

        return;
    }

    const nuevoEstado =
        establecimiento.estado === 'activo'
            ? 'inactivo'
            : 'activo';

    const accion =
        nuevoEstado === 'activo'
            ? 'activar'
            : 'desactivar';

    if (!confirm(`¿Deseas ${accion} este establecimiento?`)) {
        return;
    }

    const { error } = await supabase
        .from('establecimientos')
        .update({ estado: nuevoEstado })
        .eq('id', id);

    if (error) {
        mostrarError(
            'No fue posible cambiar el estado. Verifica los permisos de administrador.',
            error
        );

        return;
    }

    await cargarEstablecimientos(
        document.querySelector('#admin-establishments-list')
    );

    await cargarEstadisticas();
}

// ======================================================
// ELIMINACIÓN DE ESTABLECIMIENTOS
// ======================================================

async function eliminarEstablecimiento(id) {
    const confirmar = confirm(
        '¿Estás seguro de eliminar este establecimiento? Esta acción no se puede deshacer.'
    );

    if (!confirmar) return;

    const { error } = await supabase
        .from('establecimientos')
        .delete()
        .eq('id', id);

    if (error) {
        mostrarError(
            'No fue posible eliminar el establecimiento. Es posible que falte habilitar el permiso de eliminación en Supabase.',
            error
        );

        return;
    }

    alert('Establecimiento eliminado correctamente.');

    await cargarEstablecimientos(
        document.querySelector('#admin-establishments-list')
    );

    await cargarEstadisticas();
}

// ======================================================
// EDICIÓN DE ESTABLECIMIENTOS
// ======================================================


async function editarEstablecimiento(id) {
    try {
        // Consulta todos los datos del establecimiento seleccionado.
        const { data, error } = await supabase
            .from('establecimientos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            throw new Error('No se encontró el establecimiento.');
        }

        // Guarda el identificador para activar el modo edición.
        establecimientoEnEdicion = data.id;

        const modal = document.querySelector(
            '#modal-nuevo-establecimiento'
        );

        const formulario = document.querySelector(
            '#form-nuevo-establecimiento'
        );

        if (!modal || !formulario) {
            throw new Error('No se encontró el formulario de edición.');
        }

        // Carga las categorías antes de seleccionar la correspondiente.
        await cargarCategorias();

        // Recupera los datos existentes.
        document.querySelector('#nuevo-nombre').value = data.nombre || '';
        document.querySelector('#nueva-categoria').value =
            data.categoria_id || '';
        document.querySelector('#nueva-descripcion').value =
            data.descripcion || '';
        document.querySelector('#nueva-direccion').value =
            data.direccion || '';
        document.querySelector('#nuevo-telefono').value =
            data.telefono || '';
        document.querySelector('#nuevo-correo').value =
            data.correo || '';

        // Cambia los textos del formulario.
        modal.querySelector('.admin-modal-header h2').textContent =
            'Editar establecimiento';

        modal.querySelector('.admin-modal-header p').textContent =
            'Modifica la información del establecimiento seleccionado.';

        formulario.querySelector('button[type="submit"]').textContent =
            'Actualizar establecimiento';

        document.querySelector(
            '#mensaje-nuevo-establecimiento'
        ).textContent = '';

        // Abre el formulario y recupera su ubicación.
        modal.hidden = false;

        requestAnimationFrame(() => {
            inicializarMapaUbicacion();

            establecerUbicacion(data.latitud, data.longitud);
        });

    } catch (error) {
        console.error('Error al cargar establecimiento para edición:', error);
        alert('No fue posible cargar los datos del establecimiento.');
    }
}


// ======================================================
// CONSULTA Y TABLA DE ESTABLECIMIENTOS
// ======================================================

async function cargarEstablecimientos(contenedor) {
    if (!contenedor) return;

    contenedor.innerHTML =
        '<p>Cargando establecimientos...</p>';

    const { data, error } = await supabase
        .from('establecimientos')
        .select(`
            id,
            nombre,
            direccion,
            telefono,
            estado,
            categorias (
                nombre
            )
        `)
        .order('nombre', { ascending: true });

    if (error) {
        console.error(
            'Error al consultar establecimientos:',
            error
        );

        contenedor.innerHTML =
            '<p>No fue posible cargar los establecimientos. Verifica los permisos de consulta.</p>';

        return;
    }

    if (!data || data.length === 0) {
        contenedor.innerHTML =
            '<p>No hay establecimientos registrados.</p>';

        return;
    }

    // Construye la tabla con los registros consultados.
    contenedor.innerHTML = `
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th>Dirección</th>
                        <th>Teléfono</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>

                <tbody>
                    ${data.map((establecimiento) => `
                        <tr>
                            <td>
                                ${escaparHTML(establecimiento.nombre)}
                            </td>

                            <td>
                                ${escaparHTML(
                                    establecimiento.categorias?.nombre ||
                                    'Sin categoría'
                                )}
                            </td>

                            <td>
                                ${escaparHTML(
                                    establecimiento.direccion ||
                                    'No registrada'
                                )}
                            </td>

                            <td>
                                ${escaparHTML(
                                    establecimiento.telefono ||
                                    'No registrado'
                                )}
                            </td>

                            <td>
                                ${escaparHTML(establecimiento.estado)}
                            </td>

                            <td class="admin-actions-cell">

                                <button
                                    type="button"
                                    class="admin-action-button edit"
                                    data-action="editar"
                                    data-id="${escaparHTML(establecimiento.id)}"
                                    title="Editar establecimiento"
                                    aria-label="Editar establecimiento"
                                >
                                    <svg viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="1.8"
                                        stroke-linecap="round"
                                        stroke-linejoin="round">
                                        <path d="M12 20h9"/>
                                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>
                                    </svg>
                                </button>

                                <button
                                    type="button"
                                    class="admin-action-button toggle"
                                    data-action="cambiar-estado"
                                    data-id="${escaparHTML(establecimiento.id)}"
                                    title="Activar o desactivar"
                                    aria-label="Activar o desactivar establecimiento"
                                >
                                    <svg viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="1.8"
                                        stroke-linecap="round"
                                        stroke-linejoin="round">
                                        <path d="M12 2v10"/>
                                        <path d="M5.6 5.6a9 9 0 1 0 12.8 0"/>
                                    </svg>
                                </button>

                                <button
                                    type="button"
                                    class="admin-action-button delete"
                                    data-action="eliminar"
                                    data-id="${escaparHTML(establecimiento.id)}"
                                    title="Eliminar establecimiento"
                                    aria-label="Eliminar establecimiento"
                                >
                                    <svg viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="1.8"
                                        stroke-linecap="round"
                                        stroke-linejoin="round">
                                        <path d="M3 6h18"/>
                                        <path d="M8 6V4h8v2"/>
                                        <path d="m19 6-1 14H6L5 6"/>
                                        <path d="M10 11v5M14 11v5"/>
                                    </svg>
                                </button>

                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Detecta los clics en los botones de acciones de la tabla.
    contenedor.onclick = async (evento) => {
        const boton = evento.target.closest('[data-action]');

        if (!boton || !contenedor.contains(boton)) return;

        const id = boton.dataset.id;
        const accion = boton.dataset.action;

        if (!id) return;

        // Evita varios clics mientras se ejecuta una acción.
        if (boton.disabled) return;

        boton.disabled = true;

        try {
            if (accion === 'cambiar-estado') {
                await cambiarEstadoEstablecimiento(id);

            } else if (accion === 'editar') {
                editarEstablecimiento(id);

            } else if (accion === 'eliminar') {
                await eliminarEstablecimiento(id);
            }

        } finally {
            if (boton.isConnected) {
                boton.disabled = false;
            }
        }
    };
}

// ======================================================
// CONSTRUCCIÓN DEL PANEL ADMINISTRATIVO
// ======================================================

function mostrarPanel(usuario) {
    adminApp.innerHTML = `
        <div class="admin-layout">

            <aside class="admin-sidebar">

                <div class="admin-brand">
                    <h2>SIGECO-SOG</h2>
                    <span>Panel administrativo</span>
                </div>

                <nav class="admin-menu">

                    <button class="active" data-section="inicio">
                        <svg viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round">
                            <rect x="3" y="3" width="8" height="8" rx="1.5"/>
                            <rect x="13" y="3" width="8" height="5" rx="1.5"/>
                            <rect x="13" y="10" width="8" height="11" rx="1.5"/>
                            <rect x="3" y="13" width="8" height="8" rx="1.5"/>
                        </svg>
                        <span>Panel principal</span>
                    </button>

                    <button data-section="establecimientos">
                        <svg viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round">
                            <path d="M3 10h18l-2-6H5l-2 6Z"/>
                            <path d="M4 10v10h16V10"/>
                            <path d="M9 20v-6h6v6"/>
                            <path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>
                        </svg>
                        <span>Establecimientos</span>
                    </button>

                    <button data-section="categorias">
                        <svg viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round">
                            <path d="M4 4h7v7H4z"/>
                            <path d="M15 4h5v5h-5z"/>
                            <path d="M15 13h5v7h-5z"/>
                            <path d="M4 15h7v5H4z"/>
                        </svg>
                        <span>Categorías</span>
                    </button>

                    <button data-section="usuarios">
                        <svg viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.8"
                            stroke-linecap="round"
                            stroke-linejoin="round">
                            <circle cx="9" cy="8" r="4"/>
                            <path d="M2 21v-2a7 7 0 0 1 14 0v2"/>
                            <path d="M19 8v6"/>
                            <path d="M16 11h6"/>
                        </svg>
                        <span>Usuarios y permisos</span>
                    </button>

                </nav>

                <div class="admin-sidebar-footer">
                    <button id="admin-logout">
                        Cerrar sesión
                    </button>
                </div>

            </aside>

            <main class="admin-main">

                <header class="admin-topbar">
                    <div>
                        <h1>Panel principal</h1>
                        <p>Administración del sistema SIGECO-SOG.</p>
                    </div>

                    <div class="admin-user">
                        Administrador: ${escaparHTML(usuario.email)}
                    </div>
                </header>

                <section class="admin-stats">

                    <article class="admin-stat-card">
                        <span>Establecimientos registrados</span>
                        <h2 id="total-establecimientos">--</h2>
                    </article>

                    <article class="admin-stat-card">
                        <span>Categorías disponibles</span>
                        <h2 id="total-categorias">--</h2>
                    </article>

                    <article class="admin-stat-card">
                        <span>Usuarios administrativos</span>
                        <h2 id="total-usuarios">--</h2>
                    </article>

                </section>

                <section
                    class="admin-content"
                    id="admin-section-content"
                >
                    <h2>Bienvenido a SIGECO-SOG</h2>

                    <p>
                        Desde este espacio podrás gestionar la información
                        de los establecimientos, las categorías y los
                        usuarios autorizados del sistema.
                    </p>
                </section>

            </main>

        </div>
    `;

    // Las estadísticas se cargan después de construir el panel.
    cargarEstadisticas();

    // Configura el cierre de sesión.
    document
        .querySelector('#admin-logout')
        .addEventListener('click', async () => {
            const boton = document.querySelector('#admin-logout');

            boton.disabled = true;
            boton.textContent = 'Cerrando sesión...';

            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error('Error al cerrar sesión:', error);

                boton.disabled = false;
                boton.textContent = 'Cerrar sesión';

                alert('No fue posible cerrar la sesión.');
                return;
            }

            window.location.replace('/');
        });

    // Configura la navegación entre módulos.
    document
        .querySelectorAll('.admin-menu button')
        .forEach((boton) => {
            boton.addEventListener('click', () => {
                document
                    .querySelectorAll('.admin-menu button')
                    .forEach((elemento) => {
                        elemento.classList.remove('active');
                    });

                boton.classList.add('active');

                const seccion = boton.dataset.section;

                const contenido = document.querySelector(
                    '#admin-section-content'
                );

                const titulo = document.querySelector(
                    '.admin-topbar h1'
                );

                const nombres = {
                    inicio: 'Panel principal',
                    establecimientos: 'Gestión de establecimientos',
                    categorias: 'Gestión de categorías',
                    usuarios: 'Usuarios y permisos'
                };

                titulo.textContent = nombres[seccion];

                // ------------------------------------------
                // SECCIÓN INICIO
                // ------------------------------------------

                if (seccion === 'inicio') {
                    contenido.innerHTML = `
                        <h2>Bienvenido a SIGECO-SOG</h2>

                        <p>
                            Desde este espacio podrás gestionar la
                            información de los establecimientos,
                            las categorías y los usuarios autorizados
                            del sistema.
                        </p>
                    `;
                }

                // ------------------------------------------
                // SECCIÓN ESTABLECIMIENTOS
                // ------------------------------------------

                else if (seccion === 'establecimientos') {
                    mostrarSeccionEstablecimientos(contenido);
                }

                // ------------------------------------------
                // SECCIÓN CATEGORÍAS
                // ------------------------------------------

                else if (seccion === 'categorias') {
                    contenido.innerHTML = `
                        <h2>Gestión de categorías</h2>

                        <p>
                            Este módulo permitirá administrar las
                            categorías de establecimientos y
                            emprendimientos.
                        </p>
                    `;
                }

                // ------------------------------------------
                // SECCIÓN USUARIOS
                // ------------------------------------------

                else if (seccion === 'usuarios') {
                    contenido.innerHTML = `
                        <h2>Usuarios y permisos</h2>

                        <p>
                            Este módulo permitirá administrar los
                            usuarios autorizados y sus permisos
                            dentro de SIGECO-SOG.
                        </p>
                    `;
                }
            });
        });
}

// ======================================================
// INTERFAZ DE GESTIÓN DE ESTABLECIMIENTOS
// ======================================================

function mostrarSeccionEstablecimientos(contenido) {
    contenido.innerHTML = `
        <div class="admin-section-header">
            <div>
                <h2>Establecimientos registrados</h2>

                <p>
                    Consulta y administra los establecimientos
                    y emprendimientos de Sogamoso.
                </p>
            </div>

            <button
                id="btn-nuevo-establecimiento"
                class="admin-primary-button"
            >
                <span>+</span> Nuevo establecimiento
            </button>
        </div>

        <div id="admin-establishments-list"></div>

        <div
            id="modal-nuevo-establecimiento"
            class="admin-modal-overlay"
            hidden
        >
            <div class="admin-modal">

                <div class="admin-modal-header">
                    <div>
                        <h2>Nuevo establecimiento</h2>

                        <p>
                            Registra un establecimiento o emprendimiento
                            en SIGECO-SOG.
                        </p>
                    </div>

                    <button
                        type="button"
                        id="cerrar-modal-establecimiento"
                        class="admin-modal-close"
                    >
                        &times;
                    </button>
                </div>

                <form id="form-nuevo-establecimiento">

                    <div class="admin-form-grid">

                        <div class="admin-form-group">
                            <label for="nuevo-nombre">Nombre *</label>

                            <input
                                type="text"
                                id="nuevo-nombre"
                                placeholder="Nombre del establecimiento"
                                required
                            >
                        </div>

                        <div class="admin-form-group">
                            <label for="nueva-categoria">Categoría *</label>

                            <select id="nueva-categoria" required>
                                <option value="">
                                    Seleccionar categoría
                                </option>
                            </select>
                        </div>

                        <div class="admin-form-group admin-form-full">
                            <label for="nueva-descripcion">
                                Descripción
                            </label>

                            <textarea
                                id="nueva-descripcion"
                                rows="3"
                                placeholder="Describe brevemente el establecimiento o emprendimiento"
                            ></textarea>
                        </div>

                        <div class="admin-form-group admin-form-full">
                            <label for="nueva-direccion">
                                Dirección *
                            </label>

                            <div class="admin-address-search">
                                <input
                                    type="text"
                                    id="nueva-direccion"
                                    placeholder="Ej. Carrera 11 # 15-20, Sogamoso"
                                    autocomplete="street-address"
                                    required
                                >

                                <button
                                    type="button"
                                    id="btn-buscar-ubicacion"
                                    class="admin-primary-button"
                                >
                                    Buscar ubicación
                                </button>
                            </div>
                        </div>

                        <div class="admin-form-group">
                            <label for="nuevo-telefono">Teléfono</label>

                            <input
                                type="tel"
                                id="nuevo-telefono"
                                placeholder="Número de contacto"
                            >
                        </div>

                        <div class="admin-form-group">
                            <label for="nuevo-correo">
                                Correo electrónico
                            </label>

                            <input
                                type="email"
                                id="nuevo-correo"
                                placeholder="correo@ejemplo.com"
                            >
                        </div>

                        <div class="admin-form-group admin-form-full">
                            <label>Ubicación geográfica</label>

                            <p class="admin-map-help">
                                Busca la dirección y selecciona el punto
                                exacto en el mapa. También puedes mover
                                el marcador para ajustar la ubicación.
                            </p>

                            <div id="mapa-nuevo-establecimiento"></div>

                            <small id="coordenadas-seleccionadas">
                                Selecciona una ubicación en el mapa.
                            </small>
                        </div>

                        <input type="hidden" id="nueva-latitud">
                        <input type="hidden" id="nueva-longitud">

                    </div>

                    <div id="mensaje-nuevo-establecimiento"></div>

                    <div class="admin-form-actions">
                        <button
                            type="button"
                            id="cancelar-modal-establecimiento"
                            class="admin-secondary-button"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            class="admin-primary-button"
                        >
                            Guardar establecimiento
                        </button>
                    </div>

                </form>

            </div>
        </div>
    `;

    // Carga los datos de la tabla y el selector de categorías.
    cargarEstablecimientos(
        document.querySelector('#admin-establishments-list')
    );

    cargarCategorias();

    // Referencias a los elementos del formulario.
    const modal = document.querySelector(
        '#modal-nuevo-establecimiento'
    );

    const botonNuevo = document.querySelector(
        '#btn-nuevo-establecimiento'
    );

    const botonCerrar = document.querySelector(
        '#cerrar-modal-establecimiento'
    );

    const botonCancelar = document.querySelector(
        '#cancelar-modal-establecimiento'
    );

    const botonBuscar = document.querySelector(
        '#btn-buscar-ubicacion'
    );

    const formulario = document.querySelector(
        '#form-nuevo-establecimiento'
    );

 // Abre el formulario para registrar un establecimiento nuevo.
botonNuevo.addEventListener('click', async () => {
    establecimientoEnEdicion = null;

    formulario.reset();

    modal.querySelector('.admin-modal-header h2').textContent =
        'Nuevo establecimiento';

    modal.querySelector('.admin-modal-header p').textContent =
        'Registra un establecimiento o emprendimiento en SIGECO-SOG.';

    formulario.querySelector('button[type="submit"]').textContent =
        'Guardar establecimiento';

    document.querySelector('#mensaje-nuevo-establecimiento').textContent =
        '';

    await cargarCategorias();

    modal.hidden = false;

   requestAnimationFrame(() => {
    inicializarMapaUbicacion();
    restablecerUbicacion();
});
});

    // Ejecuta la búsqueda de dirección.
    botonBuscar.addEventListener('click', buscarDireccion);

    // Conecta el formulario con el registro en Supabase.
    formulario.addEventListener('submit', guardarEstablecimiento);

    // Cierra el formulario.
    function cerrarModal() {
        modal.hidden = true;
    }

    botonCerrar.addEventListener('click', cerrarModal);
    botonCancelar.addEventListener('click', cerrarModal);
}

// ======================================================
// INICIO DEL SISTEMA
// ======================================================

verificarAcceso();
