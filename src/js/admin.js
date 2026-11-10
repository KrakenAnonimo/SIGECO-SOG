
import { supabase } from './supabase.js';
import {
    reproducirAnimacionAdmin,
    detenerAnimacionAdmin
} from '../animaciones.js';

import {
    inicializarMapaUbicacion,
    buscarDireccion,
    establecerUbicacion,
    restablecerUbicacion
} from './ubicacion-admin.js';

// ======================================================
// VARIABLES GENERALES
// ======================================================

const adminApp = document.querySelector('#admin-app');

let establecimientoEnEdicion = null;
let usuarioEnEdicion = null;
let rolActual = null;

// ======================================================
// CONTROL DE ROLES
// ======================================================

function esAdministrador() {
    return ['principal_admin', 'admin'].includes(rolActual);
}

function esVisualizador() {
    return rolActual === 'viewer';
}

function aplicarModoSoloLectura(contenedor) {
    if (!esVisualizador() || !contenedor) return;

    contenedor.querySelectorAll(
        'button, input, select, textarea'
    ).forEach((control) => {
        control.disabled = true;
    });
}

// ======================================================
// UTILIDADES
// ======================================================

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (caracter) => {
        const mapa = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return mapa[caracter];
    });
}

function mostrarError(mensaje, error) {
    console.error(mensaje, error);
    alert(mensaje);
}

function mostrarMensaje(elemento, mensaje, correcto = false) {
    if (!elemento) return;

    elemento.textContent = mensaje;
    elemento.style.color = correcto ? '#187344' : '#b42318';
}

function cerrarModal(modal) {
    if (modal) modal.hidden = true;
}

function esperar(tiempo) {
    return new Promise((resolve) => setTimeout(resolve, tiempo));
}

async function esperarAnimacionMinima(inicio, duracionMinima = 1800) {
    const tiempoTranscurrido = Date.now() - inicio;
    const tiempoRestante = Math.max(0, duracionMinima - tiempoTranscurrido);

    if (tiempoRestante > 0) {
        await esperar(tiempoRestante);
    }
}

function obtenerElemento(id) {
    return document.getElementById(id);
}

// ======================================================
// ALERTA FLOTANTE DE CONFIRMACIÓN
// ======================================================

function mostrarAlertaConfirmacion(mensaje) {
    const avisoAnterior = obtenerElemento('aviso-confirmacion-admin');

    if (avisoAnterior) avisoAnterior.remove();

    const aviso = document.createElement('div');

    aviso.id = 'aviso-confirmacion-admin';
    aviso.setAttribute('role', 'status');
    aviso.setAttribute('aria-live', 'polite');

    aviso.innerHTML = `
        <span class="aviso-confirmacion-icono">✓</span>
        <span class="aviso-confirmacion-texto"></span>
    `;

    aviso.querySelector('.aviso-confirmacion-texto').textContent = mensaje;

    Object.assign(aviso.style, {
        position: 'fixed',
        top: '24px',
        right: '28px',
        zIndex: '100000',
        display: 'flex',
        alignItems: 'center',
        gap: '13px',
        minWidth: '280px',
        maxWidth: 'min(420px, calc(100vw - 40px))',
        padding: '15px 21px',
        background: 'rgba(25, 65, 54, 0.94)',
        color: '#f5f7f4',
        border: '1px solid rgba(205, 177, 112, 0.48)',
        borderLeft: '4px solid #cbb176',
        borderRadius: '10px',
        boxShadow: '0 10px 35px rgba(0, 0, 0, 0.24)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        fontFamily: 'inherit',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.45',
        opacity: '0',
        transform: 'translateY(-12px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease'
    });

    const icono = aviso.querySelector('.aviso-confirmacion-icono');

    Object.assign(icono.style, {
        display: 'flex',
        flexShrink: '0',
        alignItems: 'center',
        justifyContent: 'center',
        width: '27px',
        height: '27px',
        borderRadius: '50%',
        background: 'rgba(203, 177, 118, 0.18)',
        color: '#e4cb91',
        fontSize: '16px',
        fontWeight: '700'
    });

    document.body.appendChild(aviso);

    requestAnimationFrame(() => {
        aviso.style.opacity = '1';
        aviso.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        aviso.style.opacity = '0';
        aviso.style.transform = 'translateY(-12px)';

        setTimeout(() => {
            aviso.remove();
        }, 350);
    }, 3500);
}

// ======================================================
// CONFIRMACIÓN ADMINISTRATIVA REUTILIZABLE
// ======================================================

function confirmarAccion({
    titulo,
    descripcion,
    detalle,
    mensajeExito,
    accion,
    tipoAnimacion = null
}) {
    return new Promise((resolve) => {
        const modalAnterior = obtenerElemento('modal-accion-admin');

        if (modalAnterior) modalAnterior.remove();

        const modal = document.createElement('div');

        modal.id = 'modal-accion-admin';
        modal.className = 'admin-modal-overlay';

        modal.innerHTML = `
            <div class="admin-modal">

                <div class="admin-modal-header">
                    <div>
                        <h2>${escaparHTML(titulo)}</h2>
                        <p>${escaparHTML(descripcion)}</p>
                    </div>

                    <button type="button" class="admin-modal-close" data-cerrar>
                        &times;
                    </button>
                </div>

                <div class="admin-confirmation-content">
                    <p>${escaparHTML(detalle)}</p>
                </div>

                <div class="admin-form-actions">
                    <button type="button" class="admin-secondary-button" data-cancelar>
                        Cancelar
                    </button>

                    <button type="button" class="admin-primary-button" data-confirmar>
                        Confirmar
                    </button>
                </div>

            </div>
        `;

        document.body.appendChild(modal);

        const botonCerrar = modal.querySelector('[data-cerrar]');
        const botonCancelar = modal.querySelector('[data-cancelar]');
        const botonConfirmar = modal.querySelector('[data-confirmar]');
        const contenido = modal.querySelector('.admin-confirmation-content');

        let finalizado = false;
        let procesando = false;

        function terminar(valor) {
            if (finalizado || procesando) return;

            finalizado = true;
            modal.remove();
            resolve(valor);
        }

        botonCerrar.addEventListener('click', () => terminar(false));
        botonCancelar.addEventListener('click', () => terminar(false));

        async function ejecutar() {
            if (procesando || finalizado) return;

            procesando = true;

            botonConfirmar.disabled = true;
            botonCancelar.disabled = true;
            botonCerrar.disabled = true;

            botonConfirmar.textContent = 'Procesando...';
            modal.hidden = true;

            try {
                let promesaAnimacion = null;

                if (tipoAnimacion) {
                    promesaAnimacion = reproducirAnimacionAdmin(
                        tipoAnimacion
                    );
                }

                await accion();

                if (promesaAnimacion) {
                    await promesaAnimacion;
                }

                modal.remove();

                mostrarAlertaConfirmacion(mensajeExito);

                finalizado = true;
                procesando = false;

                resolve(true);

            } catch (error) {
                console.error(
                    'Error en la operación administrativa:',
                    error
                );

                detenerAnimacionAdmin();

                modal.hidden = false;

                contenido.innerHTML = `
                    <p class="admin-error-message">
                        No fue posible completar la operación.
                        ${escaparHTML(
                            error.message ||
                            'Verifica los permisos e inténtalo nuevamente.'
                        )}
                    </p>
                `;

                botonConfirmar.disabled = false;
                botonCancelar.disabled = false;
                botonCerrar.disabled = false;

                botonConfirmar.textContent = 'Intentar nuevamente';

                procesando = false;
            }
        }

        botonConfirmar.addEventListener('click', ejecutar);
    });
}

// ======================================================
// VERIFICACIÓN DE ACCESO
// ======================================================

async function verificarAcceso() {
    if (!adminApp) {
        console.error('No se encontró #admin-app.');
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

        const { data: rol, error: rolError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', usuario.id)
            .single();

        const rolesPermitidos = [
            'principal_admin',
            'admin',
            'editor',
            'viewer'
        ];

        if (rolError || !rol || !rolesPermitidos.includes(rol.role)) {
            await supabase.auth.signOut();
            window.location.replace('/');
            return;
        }

        mostrarPanel(usuario, rol.role);

    } catch (error) {
        console.error('Error al verificar el acceso:', error);
        window.location.replace('/');
    }
}

// ======================================================
// ESTADÍSTICAS
// ======================================================

async function cargarEstadisticas() {
    const establecimientos = obtenerElemento('total-establecimientos');
    const categorias = obtenerElemento('total-categorias');
    const usuarios = obtenerElemento('total-usuarios');

    if (!establecimientos || !categorias) return;

    establecimientos.textContent = '...';
    categorias.textContent = '...';

    if (usuarios) {
        usuarios.textContent = esAdministrador() ? '...' : '—';
    }

    const consultas = [
        supabase
            .from('establecimientos')
            .select('*', { count: 'exact', head: true })
            .eq('estado', 'activo'),

        supabase
            .from('categorias')
            .select('*', { count: 'exact', head: true })
    ];

    if (esAdministrador()) {
        consultas.push(
            supabase
                .from('user_roles')
                .select('*', { count: 'exact', head: true })
        );
    }

    const resultados = await Promise.all(consultas);

    const resultadoEstablecimientos = resultados[0];
    const resultadoCategorias = resultados[1];

    establecimientos.textContent = resultadoEstablecimientos.error
        ? 'Error'
        : resultadoEstablecimientos.count ?? 0;

    categorias.textContent = resultadoCategorias.error
        ? 'Error'
        : resultadoCategorias.count ?? 0;

    if (esAdministrador() && usuarios) {
        const resultadoUsuarios = resultados[2];

        usuarios.textContent = resultadoUsuarios.error
            ? 'Error'
            : resultadoUsuarios.count ?? 0;

        if (resultadoUsuarios.error) console.error(resultadoUsuarios.error);
    }

    if (resultadoEstablecimientos.error) console.error(resultadoEstablecimientos.error);
    if (resultadoCategorias.error) console.error(resultadoCategorias.error);
}

// ======================================================
// CATEGORÍAS PARA EL SELECTOR DE ESTABLECIMIENTOS
// ======================================================

async function cargarCategorias() {
    const selector = obtenerElemento('nueva-categoria');

    if (!selector) return;

    const valorAnterior = selector.value;

    selector.innerHTML = '<option value="">Cargando categorías...</option>';

    const { data, error } = await supabase
        .from('categorias')
        .select('id, nombre')
        .order('nombre', { ascending: true });

    if (error) {
        console.error('Error al cargar categorías:', error);
        selector.innerHTML = '<option value="">Error al cargar categorías</option>';
        return;
    }

    selector.innerHTML = '<option value="">Seleccionar categoría</option>';

    (data || []).forEach((categoria) => {
        const opcion = document.createElement('option');
        opcion.value = categoria.id;
        opcion.textContent = categoria.nombre;
        selector.appendChild(opcion);
    });

    if (valorAnterior) selector.value = valorAnterior;
}

// ======================================================
// ESTABLECIMIENTOS: GUARDAR
// ======================================================

async function guardarEstablecimiento(evento) {
    evento.preventDefault();

    if (esVisualizador()) return;

    const formulario = evento.currentTarget;
    const boton = formulario.querySelector('button[type="submit"]');
    const mensaje = obtenerElemento('mensaje-nuevo-establecimiento');
    const campoLatitud = obtenerElemento('nueva-latitud');
    const campoLongitud = obtenerElemento('nueva-longitud');

    if (!boton || !mensaje || !campoLatitud || !campoLongitud) return;

    const nombre = obtenerElemento('nuevo-nombre').value.trim();
    const categoriaId = obtenerElemento('nueva-categoria').value;
    const descripcion = obtenerElemento('nueva-descripcion').value.trim();
    const direccion = obtenerElemento('nueva-direccion').value.trim();
    const telefono = obtenerElemento('nuevo-telefono').value.trim();
    const correo = obtenerElemento('nuevo-correo').value.trim();

    const latitud = Number(campoLatitud.value);
    const longitud = Number(campoLongitud.value);

    if (!nombre || !categoriaId || !direccion) {
        mostrarMensaje(mensaje, 'Completa los campos obligatorios.');
        return;
    }

    if (
        !campoLatitud.value ||
        !campoLongitud.value ||
        !Number.isFinite(latitud) ||
        !Number.isFinite(longitud) ||
        latitud < -90 ||
        latitud > 90 ||
        longitud < -180 ||
        longitud > 180
    ) {
        mostrarMensaje(mensaje, 'Selecciona una ubicación válida en el mapa.');
        return;
    }

    const registro = {
        nombre,
        categoria_id: categoriaId,
        descripcion,
        direccion,
        telefono,
        correo,
        latitud,
        longitud
    };

    const modoEdicion = establecimientoEnEdicion !== null;
    const idEdicion = establecimientoEnEdicion;
    const modal = obtenerElemento('modal-nuevo-establecimiento');

    boton.disabled = true;
    boton.textContent = modoEdicion ? 'Actualizando...' : 'Guardando...';
    mensaje.textContent = '';

    try {
        if (modal) modal.hidden = true;

        const inicioAnimacion = Date.now();
        reproducirAnimacionAdmin('sol-carga', { loop: true });

        let resultado;

        if (modoEdicion) {
            resultado = await supabase
                .from('establecimientos')
                .update(registro)
                .eq('id', idEdicion);
        } else {
            resultado = await supabase
                .from('establecimientos')
                .insert([{
                    ...registro,
                    estado: 'activo'
                }]);
        }

        if (resultado.error) throw resultado.error;

        await Promise.all([
            cargarEstablecimientos(obtenerElemento('admin-establishments-list')),
            cargarEstadisticas()
        ]);

        await esperarAnimacionMinima(inicioAnimacion);
        detenerAnimacionAdmin();

        cerrarModal(modal);
        formulario.reset();

        establecimientoEnEdicion = null;

        const coordenadas = obtenerElemento('coordenadas-seleccionadas');

        if (coordenadas) {
            coordenadas.textContent = 'Selecciona una ubicación en el mapa.';
        }

        mostrarAlertaConfirmacion(
            modoEdicion
                ? 'Establecimiento actualizado correctamente.'
                : 'Establecimiento registrado correctamente.'
        );

    } catch (error) {
        console.error('Error al guardar establecimiento:', error);

        detenerAnimacionAdmin();

        if (modal) modal.hidden = false;

        mostrarMensaje(
            mensaje,
            'No fue posible guardar los cambios. Verifica la información y los permisos.'
        );

    } finally {
        boton.disabled = false;

        boton.textContent = establecimientoEnEdicion !== null
            ? 'Actualizar establecimiento'
            : 'Guardar establecimiento';
    }
}

// ======================================================
// ESTABLECIMIENTOS: CAMBIAR ESTADO
// ======================================================

async function cambiarEstadoEstablecimiento(id) {
    if (esVisualizador()) return;

    const { data: establecimiento, error } = await supabase
        .from('establecimientos')
        .select('id, nombre, estado')
        .eq('id', id)
        .single();

    if (error || !establecimiento) {
        mostrarError('No fue posible consultar el establecimiento.', error);
        return;
    }

    const activar = establecimiento.estado !== 'activo';
    const nuevoEstado = activar ? 'activo' : 'inactivo';

    await confirmarAccion({
        titulo: activar ? 'Activar establecimiento' : 'Desactivar establecimiento',

        descripcion: activar
            ? 'El establecimiento volverá a estar disponible.'
            : 'El establecimiento dejará de estar disponible.',

        detalle: `¿Deseas ${activar ? 'activar' : 'desactivar'} "${establecimiento.nombre}"?`,

        mensajeExito: activar
            ? 'Establecimiento activado correctamente.'
            : 'Establecimiento desactivado correctamente.',

        tipoAnimacion: activar ? 'acero-a-sol' : 'sol-a-acero',

        accion: async () => {
            const { error: errorCambio } = await supabase
                .from('establecimientos')
                .update({ estado: nuevoEstado })
                .eq('id', id);

            if (errorCambio) throw errorCambio;

            await Promise.all([
                cargarEstablecimientos(obtenerElemento('admin-establishments-list')),
                cargarEstadisticas()
            ]);
        }
    });
}

// ======================================================
// ESTABLECIMIENTOS: ELIMINAR
// ======================================================

async function eliminarEstablecimiento(id) {
    if (esVisualizador()) return;

    const { data: establecimiento, error } = await supabase
        .from('establecimientos')
        .select('nombre')
        .eq('id', id)
        .single();

    if (error || !establecimiento) {
        mostrarError('No fue posible consultar el establecimiento.', error);
        return;
    }

    await confirmarAccion({
        titulo: 'Eliminar establecimiento',
        descripcion: 'Esta acción no se puede deshacer.',
        detalle: `¿Estás seguro de que deseas eliminar "${establecimiento.nombre}"?`,
        mensajeExito: 'Establecimiento eliminado correctamente.',
        tipoAnimacion: 'acero-brillo',

        accion: async () => {
            const { error: errorEliminar } = await supabase
                .from('establecimientos')
                .delete()
                .eq('id', id);

            if (errorEliminar) throw errorEliminar;

            await Promise.all([
                cargarEstablecimientos(obtenerElemento('admin-establishments-list')),
                cargarEstadisticas()
            ]);
        }
    });
}

// ======================================================
// ESTABLECIMIENTOS: EDITAR
// ======================================================

async function editarEstablecimiento(id) {
    if (esVisualizador()) return;

    try {
        const { data, error } = await supabase
            .from('establecimientos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) throw new Error('No se encontró el establecimiento.');

        establecimientoEnEdicion = data.id;

        const modal = obtenerElemento('modal-nuevo-establecimiento');
        const formulario = obtenerElemento('form-nuevo-establecimiento');

        if (!modal || !formulario) {
            throw new Error('No se encontró el formulario de establecimientos.');
        }

        await cargarCategorias();

        obtenerElemento('nuevo-nombre').value = data.nombre || '';
        obtenerElemento('nueva-categoria').value = data.categoria_id || '';
        obtenerElemento('nueva-descripcion').value = data.descripcion || '';
        obtenerElemento('nueva-direccion').value = data.direccion || '';
        obtenerElemento('nuevo-telefono').value = data.telefono || '';
        obtenerElemento('nuevo-correo').value = data.correo || '';

        const titulo = modal.querySelector('.admin-modal-header h2');
        if (titulo) titulo.textContent = 'Editar establecimiento';

        const descripcion = modal.querySelector('.admin-modal-header p');
        if (descripcion) {
            descripcion.textContent = 'Modifica la información del establecimiento seleccionado.';
        }

        formulario.querySelector('button[type="submit"]').textContent =
            'Actualizar establecimiento';

        obtenerElemento('mensaje-nuevo-establecimiento').textContent = '';

        modal.hidden = false;

        requestAnimationFrame(() => {
            inicializarMapaUbicacion();
            establecerUbicacion(data.latitud, data.longitud);
        });

    } catch (error) {
        console.error('Error al editar establecimiento:', error);
        alert('No fue posible cargar la información del establecimiento.');
    }
}

// ======================================================
// ESTABLECIMIENTOS: TABLA
// ======================================================

async function cargarEstablecimientos(contenedor) {
    if (!contenedor) return;

    contenedor.innerHTML = '<p>Cargando establecimientos...</p>';

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
        console.error('Error al cargar establecimientos:', error);
        contenedor.innerHTML = '<p>No fue posible cargar los establecimientos.</p>';
        return;
    }

    if (!data || data.length === 0) {
        contenedor.innerHTML = '<p>No hay establecimientos registrados.</p>';
        return;
    }

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
                    ${data.map((item) => `
                        <tr>
                            <td>${escaparHTML(item.nombre)}</td>
                            <td>${escaparHTML(item.categorias?.nombre || 'Sin categoría')}</td>
                            <td>${escaparHTML(item.direccion || 'No registrada')}</td>
                            <td>${escaparHTML(item.telefono || 'No registrado')}</td>
                            <td>
                                <span class="admin-status ${item.estado === 'activo' ? 'active' : 'inactive'}">
                                    ${escaparHTML(item.estado)}
                                </span>
                            </td>
                            <td class="admin-actions-cell">
                                <button
                                    type="button"
                                    class="admin-action-button edit"
                                    data-action="editar"
                                    data-id="${escaparHTML(item.id)}"
                                    title="Editar"
                                    ${esVisualizador() ? 'disabled' : ''}
                                >✎</button>

                                <button
                                    type="button"
                                    class="admin-action-button toggle"
                                    data-action="estado"
                                    data-id="${escaparHTML(item.id)}"
                                    title="Cambiar estado"
                                    ${esVisualizador() ? 'disabled' : ''}
                                >⇄</button>

                                <button
                                    type="button"
                                    class="admin-action-button delete"
                                    data-action="eliminar"
                                    data-id="${escaparHTML(item.id)}"
                                    title="Eliminar"
                                    ${esVisualizador() ? 'disabled' : ''}
                                >✕</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    contenedor.onclick = async (evento) => {
        const boton = evento.target.closest('[data-action]');

        if (!boton || !contenedor.contains(boton) || boton.disabled) return;

        const id = boton.dataset.id;
        if (!id) return;

        boton.disabled = true;

        try {
            switch (boton.dataset.action) {
                case 'editar':
                    await editarEstablecimiento(id);
                    break;

                case 'estado':
                    await cambiarEstadoEstablecimiento(id);
                    break;

                case 'eliminar':
                    await eliminarEstablecimiento(id);
                    break;
            }
        } finally {
            if (boton.isConnected) {
                boton.disabled = esVisualizador();
            }
        }
    };
}

// ======================================================
// CATEGORÍAS: TABLA
// ======================================================

async function cargarTablaCategorias() {
    const contenedor = obtenerElemento('admin-categories-list');
    if (!contenedor) return;

    contenedor.innerHTML = '<p>Cargando categorías...</p>';

    const { data: categorias, error } = await supabase
        .from('categorias')
        .select('id, nombre, descripcion')
        .order('nombre', { ascending: true });

    if (error) {
        console.error('Error al cargar categorías:', error);
        contenedor.innerHTML = '<p>No fue posible cargar las categorías.</p>';
        return;
    }

    const {
        data: establecimientos,
        error: errorEstablecimientos
    } = await supabase
        .from('establecimientos')
        .select('categoria_id');

    if (errorEstablecimientos) {
        console.error(errorEstablecimientos);
        contenedor.innerHTML = '<p>No fue posible consultar las asociaciones.</p>';
        return;
    }

    const cantidades = {};

    (establecimientos || []).forEach((item) => {
        if (item.categoria_id !== null) {
            cantidades[item.categoria_id] =
                (cantidades[item.categoria_id] || 0) + 1;
        }
    });

    if (!categorias || categorias.length === 0) {
        contenedor.innerHTML = '<p>No hay categorías registradas.</p>';
        return;
    }

    contenedor.innerHTML = `
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Descripción</th>
                        <th>Establecimientos asociados</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${categorias.map((categoria) => `
                        <tr>
                            <td>${escaparHTML(categoria.nombre)}</td>
                            <td>${escaparHTML(categoria.descripcion || 'Sin descripción')}</td>
                            <td>${cantidades[categoria.id] || 0}</td>
                            <td class="admin-actions-cell">
                                <button
                                    type="button"
                                    class="admin-action-button edit"
                                    data-action="editar"
                                    data-id="${escaparHTML(categoria.id)}"
                                    title="Editar categoría"
                                    ${esVisualizador() ? 'disabled' : ''}
                                >✎</button>

                                <button
                                    type="button"
                                    class="admin-action-button delete"
                                    data-action="eliminar"
                                    data-id="${escaparHTML(categoria.id)}"
                                    title="Eliminar categoría"
                                    ${esVisualizador() ? 'disabled' : ''}
                                >✕</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    contenedor.onclick = async (evento) => {
        const boton = evento.target.closest('[data-action]');

        if (!boton || !contenedor.contains(boton) || boton.disabled) return;

        const id = boton.dataset.id;
        boton.disabled = true;

        try {
            if (boton.dataset.action === 'editar') {
                const categoria = categorias.find(
                    item => String(item.id) === String(id)
                );

                if (categoria) abrirModalCategoria(categoria);
            }

            if (boton.dataset.action === 'eliminar') {
                await eliminarCategoria(id);
            }
        } finally {
            if (boton.isConnected) {
                boton.disabled = esVisualizador();
            }
        }
    };
}

// ======================================================
// CATEGORÍAS: ABRIR MODAL
// ======================================================

function abrirModalCategoria(categoria = null) {
    if (esVisualizador()) return;

    const modal = obtenerElemento('modal-nueva-categoria');
    const formulario = obtenerElemento('form-categoria-admin');

    if (!modal || !formulario) return;

    formulario.reset();

    obtenerElemento('categoria-id').value = categoria?.id || '';
    obtenerElemento('categoria-nombre-admin').value = categoria?.nombre || '';
    obtenerElemento('categoria-descripcion-admin').value = categoria?.descripcion || '';

    const titulo = modal.querySelector('.admin-modal-header h2');
    const descripcion = modal.querySelector('.admin-modal-header p');

    if (titulo) {
        titulo.textContent = categoria ? 'Editar categoría' : 'Nueva categoría';
    }

    if (descripcion) {
        descripcion.textContent = categoria
            ? 'Modifica la información de esta categoría.'
            : 'Registra una nueva categoría para SIGECO-SOG.';
    }

    obtenerElemento('guardar-categoria').textContent =
        categoria ? 'Actualizar categoría' : 'Guardar categoría';

    obtenerElemento('mensaje-categoria-admin').textContent = '';

    modal.hidden = false;
}

// ======================================================
// CATEGORÍAS: GUARDAR
// ======================================================

async function guardarCategoria(evento) {
    evento.preventDefault();

    if (esVisualizador()) return;

    const formulario = evento.currentTarget;
    const campoId = obtenerElemento('categoria-id');
    const campoNombre = obtenerElemento('categoria-nombre-admin');
    const campoDescripcion = obtenerElemento('categoria-descripcion-admin');
    const boton = obtenerElemento('guardar-categoria');
    const mensaje = obtenerElemento('mensaje-categoria-admin');
    const modal = obtenerElemento('modal-nueva-categoria');

    const id = campoId.value;
    const nombre = campoNombre.value.trim();
    const descripcion = campoDescripcion.value.trim();
    const esEdicion = Boolean(id);

    if (!nombre) {
        mostrarMensaje(mensaje, 'El nombre de la categoría es obligatorio.');
        return;
    }

    boton.disabled = true;
    boton.textContent = esEdicion ? 'Actualizando...' : 'Guardando...';

    try {
        if (modal) modal.hidden = true;

        const inicioAnimacion = Date.now();

        reproducirAnimacionAdmin('sol-carga', {
            loop: true
        });

        let resultado;

        if (esEdicion) {
            resultado = await supabase
                .from('categorias')
                .update({
                    nombre,
                    descripcion: descripcion || null
                })
                .eq('id', id);
        } else {
            resultado = await supabase
                .from('categorias')
                .insert([{
                    nombre,
                    descripcion: descripcion || null
                }]);
        }

        if (resultado.error) throw resultado.error;

        await Promise.all([
            cargarTablaCategorias(),
            cargarEstadisticas(),
            cargarCategorias()
        ]);

        await esperarAnimacionMinima(inicioAnimacion);
        detenerAnimacionAdmin();

        cerrarModal(modal);
        formulario.reset();
        campoId.value = '';

        mostrarAlertaConfirmacion(
            esEdicion
                ? 'Categoría actualizada correctamente.'
                : 'Categoría creada correctamente.'
        );

    } catch (error) {
        console.error('Error al guardar categoría:', error);

        detenerAnimacionAdmin();

        if (modal) modal.hidden = false;

        mostrarMensaje(
            mensaje,
            error.code === '23505'
                ? 'Ya existe una categoría con ese nombre.'
                : `Error al guardar: ${error.message || 'Error desconocido'}`
        );

    } finally {
        boton.disabled = false;
        boton.textContent = campoId.value
            ? 'Actualizar categoría'
            : 'Guardar categoría';
    }
}

// ======================================================
// CATEGORÍAS: ELIMINAR
// ======================================================

async function eliminarCategoria(id) {
    if (esVisualizador()) return;

    const { count, error: errorConteo } = await supabase
        .from('establecimientos')
        .select('id', { count: 'exact', head: true })
        .eq('categoria_id', id);

    if (errorConteo) {
        mostrarError(
            'No fue posible comprobar los establecimientos asociados.',
            errorConteo
        );
        return;
    }

    if (count > 0) {
        alert(
            `No puedes eliminar esta categoría porque tiene ${count} establecimiento(s) asociado(s).`
        );
        return;
    }

    await confirmarAccion({
        titulo: 'Eliminar categoría',
        descripcion: 'Esta acción no se puede deshacer.',
        detalle: '¿Estás seguro de que deseas eliminar esta categoría?',
        mensajeExito: 'Categoría eliminada correctamente.',
        tipoAnimacion: 'acero-brillo',

        accion: async () => {
            const { error } = await supabase
                .from('categorias')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await Promise.all([
                cargarTablaCategorias(),
                cargarEstadisticas(),
                cargarCategorias()
            ]);
        }
    });
}

// ======================================================
// USUARIOS: TABLA
// ======================================================

async function cargarTablaUsuarios() {
    if (!esAdministrador()) return;

    const contenedor = obtenerElemento('admin-users-list');
    if (!contenedor) return;

    contenedor.innerHTML = '<p>Cargando usuarios y permisos...</p>';

    const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .order('role', { ascending: true });

    if (error) {
        console.error('Error al consultar usuarios:', error);
        contenedor.innerHTML =
            '<p>No fue posible cargar los usuarios. Verifica las políticas de acceso.</p>';
        return;
    }

    if (!data || data.length === 0) {
        contenedor.innerHTML = '<p>No hay usuarios con roles registrados.</p>';
        return;
    }

    contenedor.innerHTML = `
        <div class="admin-table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Identificador UUID</th>
                        <th>Rol asignado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map((usuario) => `
                        <tr>
                            <td class="admin-user-uuid">
                                ${escaparHTML(usuario.user_id)}
                            </td>
                            <td>
                                <span class="admin-role ${['admin', 'principal_admin'].includes(usuario.role) ? 'admin-role-admin' : 'admin-role-user'}">
                                    ${escaparHTML(usuario.role)}
                                </span>
                            </td>
                            <td class="admin-actions-cell">
                                <button
                                    type="button"
                                    class="admin-action-button edit"
                                    data-action="editar"
                                    data-id="${escaparHTML(usuario.user_id)}"
                                    title="Editar rol"
                                >✎</button>

                                <button
                                    type="button"
                                    class="admin-action-button delete"
                                    data-action="eliminar"
                                    data-id="${escaparHTML(usuario.user_id)}"
                                    title="Retirar rol"
                                >✕</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <p class="admin-users-note">
            Este módulo administra los roles de cuentas existentes.
            No crea ni elimina cuentas de autenticación.
        </p>
    `;

    contenedor.onclick = async (evento) => {
        const boton = evento.target.closest('[data-action]');

        if (!boton || !contenedor.contains(boton) || boton.disabled) return;

        const userId = boton.dataset.id;
        boton.disabled = true;

        try {
            if (boton.dataset.action === 'editar') {
                const usuario = data.find(item => item.user_id === userId);

                if (usuario) abrirModalUsuario(usuario);
            }

            if (boton.dataset.action === 'eliminar') {
                await eliminarUsuario(userId);
            }
        } finally {
            if (boton.isConnected) boton.disabled = false;
        }
    };
}

// ======================================================
// USUARIOS: ABRIR MODAL
// ======================================================

function abrirModalUsuario(usuario = null) {
    if (!esAdministrador()) return;

    const modal = obtenerElemento('modal-nuevo-usuario');
    const formulario = obtenerElemento('form-usuario-admin');

    if (!modal || !formulario) return;

    formulario.reset();

    usuarioEnEdicion = usuario?.user_id || null;

    const campoUuid = obtenerElemento('usuario-uuid-admin');
    const campoRol = obtenerElemento('usuario-rol-admin');

    campoUuid.value = usuario?.user_id || '';
    campoUuid.readOnly = Boolean(usuario);

    const rolExistente = usuario?.role;

    if (
        rolExistente &&
        !Array.from(campoRol.options).some(opcion => opcion.value === rolExistente)
    ) {
        const opcion = document.createElement('option');
        opcion.value = rolExistente;
        opcion.textContent = rolExistente;
        campoRol.appendChild(opcion);
    }

    campoRol.value = rolExistente || '';

    const titulo = modal.querySelector('.admin-modal-header h2');
    const descripcion = modal.querySelector('.admin-modal-header p');

    if (titulo) {
        titulo.textContent = usuario ? 'Editar permisos' : 'Asignar usuario';
    }

    if (descripcion) {
        descripcion.textContent = usuario
            ? 'Modifica el rol asignado a esta cuenta.'
            : 'Asigna un rol a una cuenta existente en Supabase Auth.';
    }

    obtenerElemento('guardar-usuario').textContent =
        usuario ? 'Actualizar permisos' : 'Asignar rol';

    obtenerElemento('mensaje-usuario-admin').textContent = '';

    modal.hidden = false;
}

// ======================================================
// USUARIOS: ASIGNAR O ACTUALIZAR ROL
// ======================================================

async function guardarUsuario(evento) {
    evento.preventDefault();

    if (!esAdministrador()) return;

    const formulario = evento.currentTarget;
    const campoUuid = obtenerElemento('usuario-uuid-admin');
    const campoRol = obtenerElemento('usuario-rol-admin');
    const boton = obtenerElemento('guardar-usuario');
    const mensaje = obtenerElemento('mensaje-usuario-admin');
    const modal = obtenerElemento('modal-nuevo-usuario');

    const userId = campoUuid.value.trim();
    const role = campoRol.value;
    const modoEdicion = usuarioEnEdicion !== null;
    const userIdEdicion = usuarioEnEdicion;

    const expresionUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!expresionUuid.test(userId)) {
        mostrarMensaje(mensaje, 'Ingresa un UUID válido.');
        return;
    }

    if (!role) {
        mostrarMensaje(mensaje, 'Selecciona un rol.');
        return;
    }

    boton.disabled = true;
    boton.textContent = modoEdicion ? 'Actualizando...' : 'Asignando...';

    try {
        if (modal) modal.hidden = true;

        const inicioAnimacion = Date.now();

        reproducirAnimacionAdmin('sol-carga', {
            loop: true
        });

        let resultado;

        if (modoEdicion) {
            resultado = await supabase
                .from('user_roles')
                .update({ role })
                .eq('user_id', userIdEdicion);
        } else {
            resultado = await supabase
                .from('user_roles')
                .insert([{
                    user_id: userId,
                    role
                }]);
        }

        if (resultado.error) throw resultado.error;

        await Promise.all([
            cargarTablaUsuarios(),
            cargarEstadisticas()
        ]);

        await esperarAnimacionMinima(inicioAnimacion);
        detenerAnimacionAdmin();

        cerrarModal(modal);
        formulario.reset();

        usuarioEnEdicion = null;

        mostrarAlertaConfirmacion(
            modoEdicion
                ? 'Permisos actualizados correctamente.'
                : 'Rol asignado correctamente.'
        );

    } catch (error) {
        console.error('Error al guardar el usuario:', {
            mensaje: error.message,
            codigo: error.code,
            detalles: error.details,
            sugerencia: error.hint
        });

        detenerAnimacionAdmin();

        if (modal) modal.hidden = false;

        let texto =
            'No fue posible guardar el rol. Verifica los permisos de Supabase.';

        if (error.code === '23505') {
            texto = 'Este usuario ya tiene un rol registrado.';
        } else if (error.code === '23503') {
            texto = 'El UUID no corresponde a una cuenta existente en Supabase Auth.';
        } else if (error.code === '22P02') {
            texto = 'El UUID ingresado no tiene un formato válido.';
        }

        mostrarMensaje(mensaje, texto);

    } finally {
        boton.disabled = false;
        boton.textContent = usuarioEnEdicion !== null
            ? 'Actualizar permisos'
            : 'Asignar rol';
    }
}

// ======================================================
// USUARIOS: ELIMINAR ASIGNACIÓN DE ROL
// ======================================================

async function eliminarUsuario(userId) {
    if (!esAdministrador()) return;

    const { data: usuario, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('user_id', userId)
        .single();

    if (error || !usuario) {
        mostrarError('No fue posible consultar el rol del usuario.', error);
        return;
    }

    if (['admin', 'principal_admin'].includes(usuario.role)) {
        const rolesProtegidos = ['admin', 'principal_admin'];

        const { data: administradores, error: errorConteo } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('role', rolesProtegidos);

        if (errorConteo) {
            mostrarError('No fue posible comprobar los administradores.', errorConteo);
            return;
        }

        if (
            usuario.role === 'principal_admin' &&
            (administradores || []).filter(item => item.role === 'principal_admin').length <= 1
        ) {
            alert('No puedes retirar el rol del último administrador principal.');
            return;
        }

        if (
            usuario.role === 'admin' &&
            (administradores || []).filter(item => item.role === 'admin').length <= 1
        ) {
            alert('No puedes retirar el rol del último administrador.');
            return;
        }
    }

    await confirmarAccion({
        titulo: 'Retirar permisos',
        descripcion: 'Se eliminará la asignación de rol.',
        detalle:
            '¿Deseas retirar el rol de este usuario? Su cuenta de Supabase Auth permanecerá intacta.',
        mensajeExito: 'La asignación de rol fue eliminada correctamente.',
        tipoAnimacion: 'acero-brillo',

        accion: async () => {
            const { error: errorEliminar } = await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', userId);

            if (errorEliminar) throw errorEliminar;

            await Promise.all([
                cargarTablaUsuarios(),
                cargarEstadisticas()
            ]);
        }
    });
}

// ======================================================
// PANEL PRINCIPAL
// ======================================================

function mostrarPanel(usuario, rol) {
    rolActual = rol;

    const nombresRoles = {
        principal_admin: 'Administrador principal',
        admin: 'Administrador',
        editor: 'Editor',
        viewer: 'Visualizador'
    };

    adminApp.innerHTML = `
        <div class="admin-layout">

            <aside class="admin-sidebar">

                <div class="admin-brand">
                    <h2>SIGECO-SOG</h2>
                    <span>Panel administrativo</span>
                </div>

                <nav class="admin-menu">
                    <button class="active" data-section="inicio">
                        <span>Panel principal</span>
                    </button>

                    <button data-section="establecimientos">
                        <span>Establecimientos</span>
                    </button>

                    <button data-section="categorias">
                        <span>Categorías</span>
                    </button>

                    ${esAdministrador() ? `
                        <button data-section="usuarios">
                            <span>Usuarios y permisos</span>
                        </button>
                    ` : ''}
                </nav>

                <div class="admin-sidebar-footer">
                    <button id="admin-logout" type="button">
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
                        ${escaparHTML(nombresRoles[rolActual] || 'Usuario')}:
                        ${escaparHTML(usuario.email || usuario.id)}
                    </div>
                </header>

                <section class="admin-stats">

                    <article class="admin-stat-card">
                        <span>Establecimientos activos</span>
                        <h2 id="total-establecimientos">--</h2>
                    </article>

                    <article class="admin-stat-card">
                        <span>Categorías registradas</span>
                        <h2 id="total-categorias">--</h2>
                    </article>

                    ${esAdministrador() ? `
                        <article class="admin-stat-card">
                            <span>Usuarios con rol</span>
                            <h2 id="total-usuarios">--</h2>
                        </article>
                    ` : ''}

                </section>

                <section class="admin-content" id="admin-section-content">
                    <h2>Bienvenido a SIGECO-SOG</h2>
                    <p>
                        Desde este espacio puedes administrar los
                        establecimientos, las categorías y los permisos
                        de acceso al sistema.
                    </p>
                </section>

            </main>

        </div>
    `;

    cargarEstadisticas();

    obtenerElemento('admin-logout').addEventListener(
        'click',
        async (evento) => {
            const boton = evento.currentTarget;

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
        }
    );

    document.querySelectorAll('.admin-menu button').forEach((boton) => {
        boton.addEventListener('click', () => {
            document.querySelectorAll('.admin-menu button').forEach((elemento) => {
                elemento.classList.remove('active');
            });

            boton.classList.add('active');

            const contenido = obtenerElemento('admin-section-content');
            const titulo = document.querySelector('.admin-topbar h1');
            const seccion = boton.dataset.section;

            const titulos = {
                inicio: 'Panel principal',
                establecimientos: 'Gestión de establecimientos',
                categorias: 'Gestión de categorías',
                usuarios: 'Usuarios y permisos'
            };

            titulo.textContent = titulos[seccion] || 'Panel principal';

            switch (seccion) {
                case 'establecimientos':
                    mostrarSeccionEstablecimientos(contenido);
                    break;

                case 'categorias':
                    mostrarSeccionCategorias(contenido);
                    break;

                case 'usuarios':
                    if (esAdministrador()) {
                        mostrarSeccionUsuarios(contenido);
                    } else {
                        contenido.innerHTML = `
                            <h2>Acceso restringido</h2>
                            <p>No tienes permisos para gestionar usuarios.</p>
                        `;
                    }
                    break;

                default:
                    contenido.innerHTML = `
                        <h2>Bienvenido a SIGECO-SOG</h2>
                        <p>
                            Desde este espacio puedes administrar los
                            establecimientos, las categorías y los permisos
                            de acceso al sistema.
                        </p>
                    `;
                    break;
            }
        });
    });
}

// ======================================================
// SECCIÓN ESTABLECIMIENTOS
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
                type="button"
                ${esVisualizador() ? 'disabled' : ''}
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
                            Registra un establecimiento o emprendimiento en SIGECO-SOG.
                        </p>
                    </div>

                    <button
                        type="button"
                        id="cerrar-modal-establecimiento"
                        class="admin-modal-close"
                        aria-label="Cerrar"
                    >&times;</button>
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
                                <option value="">Seleccionar categoría</option>
                            </select>
                        </div>

                        <div class="admin-form-group admin-form-full">
                            <label for="nueva-descripcion">Descripción</label>
                            <textarea
                                id="nueva-descripcion"
                                rows="3"
                                placeholder="Descripción del establecimiento"
                            ></textarea>
                        </div>

                        <div class="admin-form-group admin-form-full">
                            <label for="nueva-direccion">Dirección *</label>

                            <div class="admin-address-search">
                                <input
                                    type="text"
                                    id="nueva-direccion"
                                    placeholder="Dirección en Sogamoso"
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
                            <label for="nuevo-correo">Correo electrónico</label>
                            <input
                                type="email"
                                id="nuevo-correo"
                                placeholder="correo@ejemplo.com"
                            >
                        </div>

                        <div class="admin-form-group admin-form-full">
                            <label>Ubicación geográfica</label>
                            <p class="admin-map-help">
                                Busca la dirección y selecciona el punto exacto
                                en el mapa. Puedes mover el marcador para ajustar
                                la ubicación.
                            </p>

                            <div id="mapa-nuevo-establecimiento"></div>

                            <small id="coordenadas-seleccionadas">
                                Selecciona una ubicación en el mapa.
                            </small>
                        </div>

                        <input type="hidden" id="nueva-latitud">
                        <input type="hidden" id="nueva-longitud">

                    </div>

                    <div
                        id="mensaje-nuevo-establecimiento"
                        role="status"
                    ></div>

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

    cargarEstablecimientos(obtenerElemento('admin-establishments-list'));
    cargarCategorias();

    const modal = obtenerElemento('modal-nuevo-establecimiento');
    const formulario = obtenerElemento('form-nuevo-establecimiento');

    obtenerElemento('btn-nuevo-establecimiento').addEventListener(
        'click',
        async () => {
            if (esVisualizador()) return;

            establecimientoEnEdicion = null;

            formulario.reset();

            const titulo = modal.querySelector('.admin-modal-header h2');
            const descripcion = modal.querySelector('.admin-modal-header p');

            titulo.textContent = 'Nuevo establecimiento';

            descripcion.textContent =
                'Registra un establecimiento o emprendimiento en SIGECO-SOG.';

            formulario.querySelector('button[type="submit"]').textContent =
                'Guardar establecimiento';

            obtenerElemento('mensaje-nuevo-establecimiento').textContent = '';

            await cargarCategorias();

            modal.hidden = false;

            requestAnimationFrame(() => {
                inicializarMapaUbicacion();
                restablecerUbicacion();
            });
        }
    );

    obtenerElemento('btn-buscar-ubicacion').addEventListener(
        'click',
        (evento) => buscarDireccion(evento)
    );

    formulario.addEventListener('submit', guardarEstablecimiento);

    const cerrar = () => {
        modal.hidden = true;
    };

    obtenerElemento('cerrar-modal-establecimiento').addEventListener('click', cerrar);
    obtenerElemento('cancelar-modal-establecimiento').addEventListener('click', cerrar);
}

// ======================================================
// SECCIÓN CATEGORÍAS
// ======================================================

function mostrarSeccionCategorias(contenido) {
    contenido.innerHTML = `
        <div class="admin-section-header">
            <div>
                <h2>Categorías registradas</h2>
                <p>
                    Administra las categorías utilizadas para clasificar
                    establecimientos y emprendimientos.
                </p>
            </div>

            <button
                id="btn-nueva-categoria"
                class="admin-primary-button"
                type="button"
                ${esVisualizador() ? 'disabled' : ''}
            >
                <span>+</span> Nueva categoría
            </button>
        </div>

        <div id="admin-categories-list"></div>

        <div
            id="modal-nueva-categoria"
            class="admin-modal-overlay"
            hidden
        >
            <div class="admin-modal">

                <div class="admin-modal-header">
                    <div>
                        <h2>Nueva categoría</h2>
                        <p>Registra una categoría para SIGECO-SOG.</p>
                    </div>

                    <button
                        type="button"
                        id="cerrar-modal-categoria"
                        class="admin-modal-close"
                        aria-label="Cerrar"
                    >&times;</button>
                </div>

                <form id="form-categoria-admin">
                    <input type="hidden" id="categoria-id">

                    <div class="admin-form-group">
                        <label for="categoria-nombre-admin">
                            Nombre de la categoría *
                        </label>

                        <input
                            type="text"
                            id="categoria-nombre-admin"
                            maxlength="100"
                            placeholder="Ej. Restaurantes"
                            required
                        >
                    </div>

                    <div class="admin-form-group">
                        <label for="categoria-descripcion-admin">
                            Descripción
                        </label>

                        <textarea
                            id="categoria-descripcion-admin"
                            rows="4"
                            placeholder="Describe brevemente esta categoría"
                        ></textarea>
                    </div>

                    <div id="mensaje-categoria-admin" role="status"></div>

                    <div class="admin-form-actions">
                        <button
                            type="button"
                            id="cancelar-modal-categoria"
                            class="admin-secondary-button"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            id="guardar-categoria"
                            class="admin-primary-button"
                        >
                            Guardar categoría
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    cargarTablaCategorias();

    const modal = obtenerElemento('modal-nueva-categoria');

    obtenerElemento('btn-nueva-categoria').addEventListener(
        'click',
        () => abrirModalCategoria()
    );

    obtenerElemento('form-categoria-admin').addEventListener(
        'submit',
        guardarCategoria
    );

    const cerrar = () => cerrarModal(modal);

    obtenerElemento('cerrar-modal-categoria').addEventListener('click', cerrar);
    obtenerElemento('cancelar-modal-categoria').addEventListener('click', cerrar);
}

// ======================================================
// SECCIÓN USUARIOS
// ======================================================

function mostrarSeccionUsuarios(contenido) {
    if (!esAdministrador()) {
        contenido.innerHTML = `
            <h2>Acceso restringido</h2>
            <p>No tienes permisos para gestionar usuarios.</p>
        `;
        return;
    }

    contenido.innerHTML = `
        <div class="admin-section-header">
            <div>
                <h2>Usuarios y permisos</h2>
                <p>
                    Administra los roles de las cuentas autorizadas
                    para acceder al sistema.
                </p>
            </div>

            <button
                id="btn-nuevo-usuario"
                class="admin-primary-button"
                type="button"
            >
                <span>+</span> Asignar usuario
            </button>
        </div>

        <div id="admin-users-list"></div>

        <div
            id="modal-nuevo-usuario"
            class="admin-modal-overlay"
            hidden
        >
            <div class="admin-modal">

                <div class="admin-modal-header">
                    <div>
                        <h2>Asignar usuario</h2>
                        <p>
                            Asigna un rol a una cuenta existente
                            en Supabase Auth.
                        </p>
                    </div>

                    <button
                        type="button"
                        id="cerrar-modal-usuario"
                        class="admin-modal-close"
                        aria-label="Cerrar"
                    >&times;</button>
                </div>

                <form id="form-usuario-admin">

                    <div class="admin-form-group">
                        <label for="usuario-uuid-admin">
                            UUID del usuario *
                        </label>

                        <input
                            type="text"
                            id="usuario-uuid-admin"
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            autocomplete="off"
                            required
                        >

                        <small>
                            Debe corresponder a una cuenta que ya exista
                            en Supabase Auth.
                        </small>
                    </div>

                    <div class="admin-form-group">
                        <label for="usuario-rol-admin">
                            Rol del usuario *
                        </label>

                        <select id="usuario-rol-admin" required>
                            <option value="">Selecciona un rol</option>
                            <option value="admin">Administrador</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Visualizador</option>
                        </select>
                    </div>

                    <div id="mensaje-usuario-admin" role="status"></div>

                    <div class="admin-form-actions">
                        <button
                            type="button"
                            id="cancelar-modal-usuario"
                            class="admin-secondary-button"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            id="guardar-usuario"
                            class="admin-primary-button"
                        >
                            Asignar rol
                        </button>
                    </div>

                </form>
            </div>
        </div>
    `;

    cargarTablaUsuarios();

    const modal = obtenerElemento('modal-nuevo-usuario');

    obtenerElemento('btn-nuevo-usuario').addEventListener(
        'click',
        () => abrirModalUsuario()
    );

    obtenerElemento('form-usuario-admin').addEventListener(
        'submit',
        guardarUsuario
    );

    const cerrar = () => {
        usuarioEnEdicion = null;
        cerrarModal(modal);
    };

    obtenerElemento('cerrar-modal-usuario').addEventListener('click', cerrar);
    obtenerElemento('cancelar-modal-usuario').addEventListener('click', cerrar);
}

// ======================================================
// INICIALIZACIÓN
// ======================================================

verificarAcceso();
