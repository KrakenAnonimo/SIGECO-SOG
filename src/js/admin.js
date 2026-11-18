import { supabase } from "./supabase.js";
import {
  reproducirAnimacionAdmin,
  detenerAnimacionAdmin,
} from "../animaciones.js";

import {
  inicializarMapaUbicacion,
  buscarDireccion,
  establecerUbicacion,
  restablecerUbicacion,
} from "./ubicacion-admin.js";

import { mostrarMapaPanelAdmin } from "./mapa-panel-admin.js";

// ======================================================
// VARIABLES GENERALES
// ======================================================

const adminApp = document.querySelector("#admin-app");

let establecimientoEnEdicion = null;
let urlPreviaLogoTemporal = null;
let usuarioEnEdicion = null;
let rolActual = null;

// ======================================================
// CONTROL DE ROLES
// ======================================================

function esAdministrador() {
  return ["principal_admin", "admin"].includes(rolActual);
}

function esVisualizador() {
  return rolActual === "viewer";
}

function aplicarModoSoloLectura(contenedor) {
  if (!esVisualizador() || !contenedor) return;

  contenedor
    .querySelectorAll("button, input, select, textarea")
    .forEach((control) => {
      control.disabled = true;
    });
}

// ======================================================
// UTILIDADES
// ======================================================

function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => {
    const mapa = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
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
  elemento.style.color = correcto ? "#187344" : "#b42318";
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
// IMÁGENES DE ESTABLECIMIENTOS
// ======================================================

const BUCKET_ESTABLECIMIENTOS = "sigeco-imagenes";

function validarImagen(archivo) {
  if (!archivo) return;

  const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
  const tamanoMaximo = 5 * 1024 * 1024;

  if (!tiposPermitidos.includes(archivo.type)) {
    throw new Error("Selecciona una imagen JPG, PNG o WEBP.");
  }

  if (archivo.size > tamanoMaximo) {
    throw new Error("La imagen no puede superar los 5 MB.");
  }
}

async function subirImagenEstablecimiento(archivo, establecimientoId) {
  if (!archivo) return null;

  validarImagen(archivo);

  const extension = archivo.name.split(".").pop().toLowerCase();
  const nombreArchivo = `${crypto.randomUUID()}.${extension}`;
  const ruta = `${establecimientoId}/${nombreArchivo}`;

  const { error } = await supabase.storage
    .from(BUCKET_ESTABLECIMIENTOS)
    .upload(ruta, archivo, {
      cacheControl: "3600",
      upsert: false,
      contentType: archivo.type,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(BUCKET_ESTABLECIMIENTOS)
    .getPublicUrl(ruta);

  return {
    url: data.publicUrl,
    path: ruta,
  };
}

async function eliminarImagenEstablecimiento(ruta) {
  if (!ruta) return;

  const { error } = await supabase.storage
    .from(BUCKET_ESTABLECIMIENTOS)
    .remove([ruta]);

  if (error) throw error;
}

// ======================================================
// VISTA PREVIA DEL LOGO
// ======================================================

function renderizarLogoEstablecimiento(url = null) {
  const vistaPrevia = obtenerElemento("vista-previa-logo");
  const estadoLogo = obtenerElemento("estado-logo");
  const etiquetaLogo = obtenerElemento("etiqueta-logo");

  if (!vistaPrevia) return;

  vistaPrevia.innerHTML = "";

  if (url) {
    const imagen = document.createElement("img");
    imagen.src = url;
    imagen.alt = "Logo del establecimiento";

    vistaPrevia.appendChild(imagen);

    if (estadoLogo) {
      estadoLogo.textContent = "Logo cargado";
      estadoLogo.className = "admin-logo-estado cargado";
    }

    if (etiquetaLogo) {
      etiquetaLogo.innerHTML = `
        <span class="admin-logo-boton-icono">＋</span>
        Cambiar logo
      `;
    }
  } else {
    vistaPrevia.innerHTML = `
      <div class="admin-logo-vacio">
        <div class="admin-logo-icono">
          <i class="lucide lucide-image-plus"></i>
        </div>
        <strong>Añade el logo de tu establecimiento</strong>
        <span>
          Selecciona una imagen para identificar visualmente tu negocio.
        </span>
      </div>
    `;

    if (estadoLogo) {
      estadoLogo.textContent = "Sin logo";
      estadoLogo.className = "admin-logo-estado";
    }

    if (etiquetaLogo) {
      etiquetaLogo.innerHTML = `
        <span class="admin-logo-boton-icono">＋</span>
        Cargar logo
      `;
    }
  }
}

function limpiarVistaPreviaLogo() {
  if (urlPreviaLogoTemporal) {
    URL.revokeObjectURL(urlPreviaLogoTemporal);
    urlPreviaLogoTemporal = null;
  }

  const campoLogo = obtenerElemento("nuevo-logo");

  if (campoLogo) {
    campoLogo.value = "";
  }

  renderizarLogoEstablecimiento(null);
}

function inicializarCampoLogo() {
  const campoLogo = obtenerElemento("nuevo-logo");

  if (!campoLogo) return;

  campoLogo.onchange = () => {
    const archivo = campoLogo.files[0];

    if (!archivo) return;

    try {
      validarImagen(archivo);
    } catch (error) {
      alert(error.message);
      campoLogo.value = "";
      return;
    }

    if (urlPreviaLogoTemporal) {
      URL.revokeObjectURL(urlPreviaLogoTemporal);
      urlPreviaLogoTemporal = null;
    }

    urlPreviaLogoTemporal = URL.createObjectURL(archivo);

    renderizarLogoEstablecimiento(urlPreviaLogoTemporal);

    const estadoLogo = obtenerElemento("estado-logo");

    if (estadoLogo) {
      estadoLogo.textContent = "Imagen nueva";
      estadoLogo.className = "admin-logo-estado nuevo";
    }
  };
}

// ======================================================
// ALERTA FLOTANTE DE CONFIRMACIÓN
// ======================================================

function mostrarAlertaConfirmacion(mensaje) {
  const avisoAnterior = obtenerElemento("aviso-confirmacion-admin");

  if (avisoAnterior) avisoAnterior.remove();

  const aviso = document.createElement("div");

  aviso.id = "aviso-confirmacion-admin";
  aviso.setAttribute("role", "status");
  aviso.setAttribute("aria-live", "polite");

  aviso.innerHTML = `
    <span class="aviso-confirmacion-icono">✓</span>
    <span class="aviso-confirmacion-texto"></span>
  `;

  aviso.querySelector(".aviso-confirmacion-texto").textContent = mensaje;

  Object.assign(aviso.style, {
    position: "fixed",
    top: "24px",
    right: "28px",
    zIndex: "100000",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    minWidth: "280px",
    maxWidth: "min(420px, calc(100vw - 40px))",
    padding: "15px 21px",
    background: "rgba(25, 65, 54, 0.94)",
    color: "#f5f7f4",
    border: "1px solid rgba(205, 177, 112, 0.48)",
    borderLeft: "4px solid #cbb176",
    borderRadius: "10px",
    boxShadow: "0 10px 35px rgba(0, 0, 0, 0.24)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    fontFamily: "inherit",
    fontSize: "14px",
    fontWeight: "500",
    lineHeight: "1.45",
    opacity: "0",
    transform: "translateY(-12px)",
    transition: "opacity 0.3s ease, transform 0.3s ease",
  });

  const icono = aviso.querySelector(".aviso-confirmacion-icono");

  Object.assign(icono.style, {
    display: "flex",
    flexShrink: "0",
    alignItems: "center",
    justifyContent: "center",
    width: "27px",
    height: "27px",
    borderRadius: "50%",
    background: "rgba(203, 177, 118, 0.18)",
    color: "#e4cb91",
    fontSize: "16px",
    fontWeight: "700",
  });

  document.body.appendChild(aviso);

  requestAnimationFrame(() => {
    aviso.style.opacity = "1";
    aviso.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    aviso.style.opacity = "0";
    aviso.style.transform = "translateY(-12px)";

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
  tipoAnimacion = null,
}) {
  return new Promise((resolve) => {
    const modalAnterior = obtenerElemento("modal-accion-admin");

    if (modalAnterior) modalAnterior.remove();

    const modal = document.createElement("div");

    modal.id = "modal-accion-admin";
    modal.className = "admin-modal-overlay";

    modal.innerHTML = `
      <div class="admin-modal">
        <div class="admin-modal-header">
          <div>
            <h2>${escaparHTML(titulo)}</h2>
            <p>${escaparHTML(descripcion)}</p>
          </div>

          <button
            type="button"
            class="admin-modal-close"
            data-cerrar
          >&times;</button>
        </div>

        <div class="admin-confirmation-content">
          <p>${escaparHTML(detalle)}</p>
        </div>

        <div class="admin-form-actions">
          <button
            type="button"
            class="admin-secondary-button"
            data-cancelar
          >
            Cancelar
          </button>

          <button
            type="button"
            class="admin-primary-button"
            data-confirmar
          >
            Confirmar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const botonCerrar = modal.querySelector("[data-cerrar]");
    const botonCancelar = modal.querySelector("[data-cancelar]");
    const botonConfirmar = modal.querySelector("[data-confirmar]");
    const contenido = modal.querySelector(".admin-confirmation-content");

    let finalizado = false;
    let procesando = false;

    function terminar(valor) {
      if (finalizado || procesando) return;

      finalizado = true;
      modal.remove();
      resolve(valor);
    }

    botonCerrar.addEventListener("click", () => terminar(false));
    botonCancelar.addEventListener("click", () => terminar(false));

    async function ejecutar() {
      if (procesando || finalizado) return;

      procesando = true;

      botonConfirmar.disabled = true;
      botonCancelar.disabled = true;
      botonCerrar.disabled = true;

      botonConfirmar.textContent = "Procesando...";
      modal.hidden = true;

      try {
        let promesaAnimacion = null;

        if (tipoAnimacion) {
          promesaAnimacion = reproducirAnimacionAdmin(tipoAnimacion);
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
        console.error("Error en la operación administrativa:", error);

        detenerAnimacionAdmin();

        modal.hidden = false;

        contenido.innerHTML = `
          <p class="admin-error-message">
            No fue posible completar la operación.
            ${escaparHTML(
              error.message || "Verifica los permisos e inténtalo nuevamente.",
            )}
          </p>
        `;

        botonConfirmar.disabled = false;
        botonCancelar.disabled = false;
        botonCerrar.disabled = false;

        botonConfirmar.textContent = "Intentar nuevamente";

        procesando = false;
      }
    }

    botonConfirmar.addEventListener("click", ejecutar);
  });
}

// ======================================================
// VERIFICACIÓN DE ACCESO
// ======================================================

async function verificarAcceso() {
  if (!adminApp) {
    console.error("No se encontró #admin-app.");
    return;
  }

  try {
    const { data: sesionData, error: sesionError } =
      await supabase.auth.getSession();

    if (sesionError || !sesionData.session) {
      window.location.replace("/");
      return;
    }

    const usuario = sesionData.session.user;

    const { data: rol, error: rolError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", usuario.id)
      .single();

    const rolesPermitidos = ["principal_admin", "admin", "editor", "viewer"];

    if (rolError || !rol || !rolesPermitidos.includes(rol.role)) {
      await supabase.auth.signOut();
      window.location.replace("/");
      return;
    }

    mostrarPanel(usuario, rol.role);
  } catch (error) {
    console.error("Error al verificar acceso:", error);
    alert("No fue posible verificar el acceso al panel administrativo.");
  }
}

// ======================================================
// ESTADÍSTICAS
// ======================================================

async function cargarEstadisticas() {
  const establecimientos = obtenerElemento("total-establecimientos");
  const categorias = obtenerElemento("total-categorias");
  const usuarios = obtenerElemento("total-usuarios");

  if (!establecimientos || !categorias) return;

  establecimientos.textContent = "...";
  categorias.textContent = "...";

  if (usuarios) {
    usuarios.textContent = esAdministrador() ? "..." : "—";
  }

  const consultas = [
    supabase
      .from("establecimientos")
      .select("*", { count: "exact", head: true })
      .eq("estado", "activo"),

    supabase.from("categorias").select("*", { count: "exact", head: true }),
  ];

  if (esAdministrador()) {
    consultas.push(
      supabase.from("user_roles").select("*", { count: "exact", head: true }),
    );
  }

  const resultados = await Promise.all(consultas);

  const resultadoEstablecimientos = resultados[0];
  const resultadoCategorias = resultados[1];

  establecimientos.textContent = resultadoEstablecimientos.error
    ? "Error"
    : (resultadoEstablecimientos.count ?? 0);

  categorias.textContent = resultadoCategorias.error
    ? "Error"
    : (resultadoCategorias.count ?? 0);

  if (esAdministrador() && usuarios) {
    const resultadoUsuarios = resultados[2];

    usuarios.textContent = resultadoUsuarios.error
      ? "Error"
      : (resultadoUsuarios.count ?? 0);

    if (resultadoUsuarios.error) {
      console.error(resultadoUsuarios.error);
    }
  }

  if (resultadoEstablecimientos.error) {
    console.error(resultadoEstablecimientos.error);
  }

  if (resultadoCategorias.error) {
    console.error(resultadoCategorias.error);
  }
}

// ======================================================
// PANEL PRINCIPAL: MAPA DE ESTABLECIMIENTOS
// ======================================================

async function cargarMapaPanelAdmin() {
  const contenedor = obtenerElemento("mapa-panel-admin");

  if (!contenedor) return;

  contenedor.innerHTML =
    '<p class="mapa-admin-cargando">Cargando establecimientos en el mapa...</p>';

  const { data, error } = await supabase
    .from("establecimientos")
    .select(
      `
      id,
      nombre,
      direccion,
      latitud,
      longitud,
      estado,
      categoria_id,
      categorias (
        nombre
      )
    `,
    )
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error al cargar los establecimientos del mapa:", error);

    contenedor.innerHTML = `
      <p class="mapa-admin-error">
        No fue posible cargar los establecimientos en el mapa.
      </p>
    `;

    return;
  }

  contenedor.innerHTML = "";

  mostrarMapaPanelAdmin(data || []);
}

// ======================================================
// CATEGORÍAS: SELECTOR DE ESTABLECIMIENTOS
// ======================================================

async function cargarCategorias() {
  const selector = obtenerElemento("nueva-categoria");

  if (!selector) return;

  const valorAnterior = selector.value;

  selector.innerHTML = '<option value="">Cargando categorías...</option>';

  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre, categoria_padre_id")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error al cargar categorías:", error);
    selector.innerHTML = '<option value="">Error al cargar categorías</option>';
    return;
  }

  const principales = (data || []).filter(
    (item) => item.categoria_padre_id === null,
  );

  const secundarias = (data || []).filter(
    (item) => item.categoria_padre_id !== null,
  );

  selector.innerHTML = '<option value="">Seleccionar categoría</option>';

  const grupoPrincipal = document.createElement("optgroup");
  grupoPrincipal.label = "Categorías principales";

  principales.forEach((categoria) => {
    const opcion = document.createElement("option");
    opcion.value = categoria.id;
    opcion.textContent = categoria.nombre;
    grupoPrincipal.appendChild(opcion);
  });

  selector.appendChild(grupoPrincipal);

  principales.forEach((principal) => {
    const hijas = secundarias.filter(
      (secundaria) =>
        String(secundaria.categoria_padre_id) === String(principal.id),
    );

    if (hijas.length === 0) return;

    const grupo = document.createElement("optgroup");
    grupo.label = principal.nombre;

    hijas.forEach((categoria) => {
      const opcion = document.createElement("option");
      opcion.value = categoria.id;
      opcion.textContent = categoria.nombre;
      grupo.appendChild(opcion);
    });

    selector.appendChild(grupo);
  });

  if (valorAnterior) {
    selector.value = valorAnterior;
  }
}

// ======================================================
// ESTABLECIMIENTOS: HORARIOS DE ATENCIÓN
// ======================================================

const DIAS_HORARIO = [
  ["lunes", "Lunes"],
  ["martes", "Martes"],
  ["miercoles", "Miércoles"],
  ["jueves", "Jueves"],
  ["viernes", "Viernes"],
  ["sabado", "Sábado"],
  ["domingo", "Domingo"],
];

function inicializarHorariosEstablecimiento(horarios = null) {
  const contenedor = obtenerElemento("horarios-establecimiento");

  if (!contenedor) return;

  contenedor.innerHTML = DIAS_HORARIO.map(([clave, nombre]) => {
    const datos = horarios?.[clave] || {};
    const abierto = datos.abierto ?? false;
    const turnos = datos.turnos || [];

    return `
      <div class="admin-horario-dia" data-dia="${clave}">
        <div class="admin-horario-dia-cabecera">
          <strong>${nombre}</strong>

          <label class="admin-horario-estado">
            <input
              type="checkbox"
              class="horario-abierto"
              ${abierto ? "checked" : ""}
            >
            <span>Abierto</span>
          </label>
        </div>

        <div class="admin-horario-campos" ${abierto ? "" : "hidden"}>
          <div class="admin-horario-turno">
            <label>
              Apertura
              <input
                type="time"
                class="horario-inicio-1"
                value="${escaparHTML(turnos[0]?.inicio || "08:00")}"
              >
            </label>

            <label>
              Cierre
              <input
                type="time"
                class="horario-fin-1"
                value="${escaparHTML(turnos[0]?.fin || "18:00")}"
              >
            </label>
          </div>

          <label class="admin-horario-segundo">
            <input
              type="checkbox"
              class="horario-doble"
              ${turnos.length > 1 ? "checked" : ""}
            >
            Agregar segundo turno
          </label>

          <div
            class="admin-horario-turno admin-horario-turno-2"
            ${turnos.length > 1 ? "" : "hidden"}
          >
            <label>
              Segunda apertura
              <input
                type="time"
                class="horario-inicio-2"
                value="${escaparHTML(turnos[1]?.inicio || "14:00")}"
              >
            </label>

            <label>
              Segundo cierre
              <input
                type="time"
                class="horario-fin-2"
                value="${escaparHTML(turnos[1]?.fin || "18:00")}"
              >
            </label>
          </div>
        </div>
      </div>
    `;
  }).join("");

  contenedor.querySelectorAll(".admin-horario-dia").forEach((dia) => {
    const abierto = dia.querySelector(".horario-abierto");
    const campos = dia.querySelector(".admin-horario-campos");
    const doble = dia.querySelector(".horario-doble");
    const segundoTurno = dia.querySelector(".admin-horario-turno-2");

    abierto.addEventListener("change", () => {
      campos.hidden = !abierto.checked;
    });

    doble.addEventListener("change", () => {
      segundoTurno.hidden = !doble.checked;
    });
  });
}

 // ======================================================
 // ESTABLECIMIENTOS: OBTENER Y VALIDAR HORARIOS
 // ======================================================

function obtenerHorariosEstablecimiento() {
  const contenedor = obtenerElemento("horarios-establecimiento");

  if (!contenedor) {
    throw new Error("No se encontró el formulario de horarios.");
  }

  const dias = contenedor.querySelectorAll(".admin-horario-dia");

  if (dias.length !== 7) {
    throw new Error("No se han inicializado los horarios de atención.");
  }

  const horarios = {};

  dias.forEach((dia) => {
    const clave = dia.dataset.dia;
    const abierto = dia.querySelector(".horario-abierto").checked;

    if (!abierto) {
      horarios[clave] = {
        abierto: false,
        turnos: [],
      };
      return;
    }

    const inicio1 = dia.querySelector(".horario-inicio-1").value;
    const fin1 = dia.querySelector(".horario-fin-1").value;

    if (!inicio1 || !fin1 || inicio1 >= fin1) {
      throw new Error(`Revisa el primer turno de ${clave}.`);
    }

    const turnos = [{ inicio: inicio1, fin: fin1 }];

    if (dia.querySelector(".horario-doble").checked) {
      const inicio2 = dia.querySelector(".horario-inicio-2").value;
      const fin2 = dia.querySelector(".horario-fin-2").value;

      if (!inicio2 || !fin2 || inicio2 >= fin2 || inicio2 < fin1) {
        throw new Error(`Revisa el segundo turno de ${clave}.`);
      }

      turnos.push({ inicio: inicio2, fin: fin2 });
    }

    horarios[clave] = {
      abierto: true,
      turnos,
    };
  });

  return horarios;
}

// ======================================================
// ESTABLECIMIENTOS: GUARDAR
// ======================================================

async function guardarEstablecimiento(evento) {
  evento.preventDefault();

  if (esVisualizador()) return;

  const formulario = evento.currentTarget;
  const boton = formulario.querySelector('button[type="submit"]');
  const mensaje = obtenerElemento("mensaje-nuevo-establecimiento");

  const campoLatitud = obtenerElemento("nueva-latitud");
  const campoLongitud = obtenerElemento("nueva-longitud");

  if (!boton || !mensaje || !campoLatitud || !campoLongitud) return;

  const nombre = obtenerElemento("nuevo-nombre").value.trim();
  const categoriaId = obtenerElemento("nueva-categoria").value;
  const descripcion = obtenerElemento("nueva-descripcion").value.trim();
  const direccion = obtenerElemento("nueva-direccion").value.trim();
  const telefono = obtenerElemento("nuevo-telefono").value.trim();
  const correo = obtenerElemento("nuevo-correo").value.trim();

  const archivoLogo = obtenerElemento("nuevo-logo")?.files[0] || null;

  const latitud = Number(campoLatitud.value);
  const longitud = Number(campoLongitud.value);

  if (!nombre || !categoriaId || !direccion) {
    mostrarMensaje(mensaje, "Completa los campos obligatorios.");
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
    mostrarMensaje(mensaje, "Selecciona una ubicación válida en el mapa.");
    return;
  }

  let modal = null;
  let animacionIniciada = false;

  try {
    // Obtener y validar los horarios antes de guardar.
    const horarioAtencion = obtenerHorariosEstablecimiento();

    if (archivoLogo) validarImagen(archivoLogo);

    boton.disabled = true;
    boton.textContent =
      establecimientoEnEdicion !== null ? "Actualizando..." : "Guardando...";

    mensaje.textContent = "";

    modal = obtenerElemento("modal-nuevo-establecimiento");

    if (modal) modal.hidden = true;

    const inicioAnimacion = Date.now();

    reproducirAnimacionAdmin("sol-carga", { loop: true });
    animacionIniciada = true;

    const modoEdicion = establecimientoEnEdicion !== null;
    const idEdicion = establecimientoEnEdicion;

    // Información que se enviará a Supabase.
    const registro = {
      nombre,
      categoria_id: categoriaId,
      descripcion,
      direccion,
      telefono,
      correo,
      latitud,
      longitud,
      horario_atencion: horarioAtencion,
    };

    let idEstablecimiento = idEdicion;
    let imagenAnterior = null;

    // Recuperar imagen anterior si se va a reemplazar.
    if (modoEdicion && archivoLogo) {
      const { data, error } = await supabase
        .from("establecimientos")
        .select("imagen_path")
        .eq("id", idEdicion)
        .single();

      if (error) throw error;

      imagenAnterior = data.imagen_path;
    }

    // Actualizar establecimiento existente.
    if (modoEdicion) {
      const { error } = await supabase
        .from("establecimientos")
        .update(registro)
        .eq("id", idEdicion);

      if (error) throw error;
    } else {
      // Crear un nuevo establecimiento.
      const { data, error } = await supabase
        .from("establecimientos")
        .insert([
          {
            ...registro,
            estado: "activo",
          },
        ])
        .select("id")
        .single();

      if (error) throw error;

      idEstablecimiento = data.id;
    }

    // Guardar o actualizar la imagen del establecimiento.
    if (archivoLogo) {
      const imagen = await subirImagenEstablecimiento(
        archivoLogo,
        idEstablecimiento,
      );

      const { error } = await supabase
        .from("establecimientos")
        .update({
          imagen_path: imagen.path,
        })
        .eq("id", idEstablecimiento);

      if (error) {
        await eliminarImagenEstablecimiento(imagen.path);
        throw error;
      }

      if (imagenAnterior) {
        try {
          await eliminarImagenEstablecimiento(imagenAnterior);
        } catch (error) {
          console.error("No fue posible eliminar la imagen anterior:", error);
        }
      }
    }

    // Guardar productos y servicios asociados.
    await guardarCatalogoEstablecimiento(idEstablecimiento);

    // Actualizar el listado y las estadísticas.
    await Promise.all([
      cargarEstablecimientos(obtenerElemento("admin-establishments-list")),
      cargarEstadisticas(),
    ]);

    await esperarAnimacionMinima(inicioAnimacion);

    detenerAnimacionAdmin();
    animacionIniciada = false;

    cerrarModal(modal);
    formulario.reset();

    establecimientoEnEdicion = null;
    limpiarVistaPreviaLogo();

    const coordenadas = obtenerElemento("coordenadas-seleccionadas");

    if (coordenadas) {
      coordenadas.textContent = "Selecciona una ubicación en el mapa.";
    }

    mostrarAlertaConfirmacion(
      modoEdicion
        ? "Establecimiento actualizado correctamente."
        : "Establecimiento registrado correctamente.",
    );
  } catch (error) {
    console.error("Error al guardar establecimiento:", error);

    if (animacionIniciada) {
      detenerAnimacionAdmin();
    }

    modal = obtenerElemento("modal-nuevo-establecimiento");

    if (modal) modal.hidden = false;

    mostrarMensaje(
      mensaje,
      error.message || "No fue posible guardar el establecimiento.",
    );
  } finally {
    boton.disabled = false;

    boton.textContent =
      establecimientoEnEdicion !== null
        ? "Actualizar establecimiento"
        : "Guardar establecimiento";
  }
}

// ======================================================
// ESTABLECIMIENTOS: CAMBIAR ESTADO
// ======================================================

async function cambiarEstadoEstablecimiento(id) {
  if (esVisualizador()) return;

  const { data: establecimiento, error } = await supabase
    .from("establecimientos")
    .select("id, nombre, estado")
    .eq("id", id)
    .single();

  if (error || !establecimiento) {
    mostrarError("No fue posible consultar el establecimiento.", error);
    return;
  }

  const activar = establecimiento.estado !== "activo";
  const nuevoEstado = activar ? "activo" : "inactivo";

  await confirmarAccion({
    titulo: activar ? "Activar establecimiento" : "Desactivar establecimiento",

    descripcion: activar
      ? "El establecimiento volverá a estar disponible."
      : "El establecimiento dejará de estar disponible.",

    detalle: `¿Deseas ${
      activar ? "activar" : "desactivar"
    } "${establecimiento.nombre}"?`,

    mensajeExito: activar
      ? "Establecimiento activado correctamente."
      : "Establecimiento desactivado correctamente.",

    tipoAnimacion: activar ? "acero-a-sol" : "sol-a-acero",

    accion: async () => {
      const { error: errorCambio } = await supabase
        .from("establecimientos")
        .update({ estado: nuevoEstado })
        .eq("id", id);

      if (errorCambio) throw errorCambio;

      await Promise.all([
        cargarEstablecimientos(obtenerElemento("admin-establishments-list")),
        cargarEstadisticas(),
      ]);
    },
  });
}

// ======================================================
// ESTABLECIMIENTOS: ELIMINAR
// ======================================================

async function eliminarEstablecimiento(id) {
  if (esVisualizador()) return;

  const { data: establecimiento, error } = await supabase
    .from("establecimientos")
    .select("nombre")
    .eq("id", id)
    .single();

  if (error || !establecimiento) {
    mostrarError("No fue posible consultar el establecimiento.", error);
    return;
  }

  await confirmarAccion({
    titulo: "Eliminar establecimiento",
    descripcion: "Esta acción no se puede deshacer.",
    detalle: `¿Estás seguro de que deseas eliminar "${establecimiento.nombre}"?`,
    mensajeExito: "Establecimiento eliminado correctamente.",
    tipoAnimacion: "acero-brillo",

    accion: async () => {
      const { error: errorEliminar } = await supabase
        .from("establecimientos")
        .delete()
        .eq("id", id);

      if (errorEliminar) throw errorEliminar;

      await Promise.all([
        cargarEstablecimientos(obtenerElemento("admin-establishments-list")),
        cargarEstadisticas(),
      ]);
    },
  });
}

// ======================================================
// ESTABLECIMIENTOS: EDITAR
// ======================================================

async function editarEstablecimiento(id) {
  if (esVisualizador()) return;

  try {
    // Obtener toda la información del establecimiento.
    const { data, error } = await supabase
      .from("establecimientos")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      throw new Error("No se encontró el establecimiento.");
    }

    const modal = obtenerElemento("modal-nuevo-establecimiento");
    const formulario = obtenerElemento("form-nuevo-establecimiento");

    if (!modal || !formulario) {
      throw new Error("No se encontró el formulario de establecimientos.");
    }

    // Recuperar las categorías disponibles.
    await cargarCategorias();

    // Identificar el establecimiento que estamos editando.
    establecimientoEnEdicion = data.id;

    // ==================================================
    // CARGAR INFORMACIÓN GENERAL
    // ==================================================

    obtenerElemento("nuevo-nombre").value = data.nombre || "";
    obtenerElemento("nueva-categoria").value = data.categoria_id || "";
    obtenerElemento("nueva-descripcion").value = data.descripcion || "";
    obtenerElemento("nueva-direccion").value = data.direccion || "";
    obtenerElemento("nuevo-telefono").value = data.telefono || "";
    obtenerElemento("nuevo-correo").value = data.correo || "";

    // ==================================================
    // RECUPERAR HORARIOS DE ATENCIÓN
    // ==================================================

    // La columna horario_atencion es JSONB en Supabase.
    // Si no hay horarios registrados, se inicializan vacíos.
    inicializarHorariosEstablecimiento(data.horario_atencion ?? null);

    // ==================================================
    // CONFIGURAR MODAL DE EDICIÓN
    // ==================================================

    const titulo = modal.querySelector(".admin-modal-header h2");

    if (titulo) {
      titulo.textContent = "Editar establecimiento";
    }

    const descripcionModal = modal.querySelector(".admin-modal-header p");

    if (descripcionModal) {
      descripcionModal.textContent =
        "Modifica la información, los horarios y los productos del establecimiento seleccionado.";
    }

    // ==================================================
    // RECUPERAR IMAGEN DEL ESTABLECIMIENTO
    // ==================================================

    limpiarVistaPreviaLogo();

    if (data.imagen_path) {
      const { data: imagenPublica } = supabase.storage
        .from(BUCKET_ESTABLECIMIENTOS)
        .getPublicUrl(data.imagen_path);

      renderizarLogoEstablecimiento(imagenPublica.publicUrl);
    }

    inicializarCampoLogo();

    // ==================================================
    // RECUPERAR PRODUCTOS Y SERVICIOS
    // ==================================================

    await cargarCatalogoEstablecimiento(data.id);

    // ==================================================
    // PREPARAR BOTÓN Y MENSAJES
    // ==================================================

    const botonGuardar = formulario.querySelector('button[type="submit"]');

    if (botonGuardar) {
      botonGuardar.textContent = "Actualizar establecimiento";
    }

    const mensaje = obtenerElemento("mensaje-nuevo-establecimiento");

    if (mensaje) {
      mensaje.textContent = "";
    }

    // ==================================================
    // MOSTRAR FORMULARIO
    // ==================================================

    modal.hidden = false;

    // ==================================================
    // RECUPERAR UBICACIÓN EN EL MAPA
    // ==================================================

    requestAnimationFrame(() => {
      inicializarMapaUbicacion();

      establecerUbicacion(data.latitud, data.longitud);
    });
  } catch (error) {
    console.error("Error al editar establecimiento:", error);

    alert("Error al editar: " + (error.message || error));
  }
}

// ======================================================
// ESTABLECIMIENTOS: TABLA
// ======================================================

async function cargarEstablecimientos(contenedor) {
  if (!contenedor) return;

  contenedor.innerHTML = "<p>Cargando establecimientos...</p>";

  const { data, error } = await supabase
    .from("establecimientos")
    .select(
      `
      id,
      nombre,
      direccion,
      telefono,
      estado,
      categorias (
        nombre
      )
    `,
    )
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error al cargar establecimientos:", error);
    contenedor.innerHTML = "<p>No fue posible cargar los establecimientos.</p>";
    return;
  }

  if (!data || data.length === 0) {
    contenedor.innerHTML = "<p>No hay establecimientos registrados.</p>";
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
          ${data
            .map(
              (item) => `
              <tr>
                <td>${escaparHTML(item.nombre)}</td>
                <td>${escaparHTML(
                  item.categorias?.nombre || "Sin categoría",
                )}</td>
                <td>${escaparHTML(item.direccion || "No registrada")}</td>
                <td>${escaparHTML(item.telefono || "No registrado")}</td>
                <td>
                  <span class="admin-status ${
                    item.estado === "activo" ? "active" : "inactive"
                  }">
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
                    ${esVisualizador() ? "disabled" : ""}
                  >✎</button>

                  <button
                    type="button"
                    class="admin-action-button toggle"
                    data-action="estado"
                    data-id="${escaparHTML(item.id)}"
                    title="Cambiar estado"
                    ${esVisualizador() ? "disabled" : ""}
                  >⇄</button>

                  <button
                    type="button"
                    class="admin-action-button delete"
                    data-action="eliminar"
                    data-id="${escaparHTML(item.id)}"
                    title="Eliminar"
                    ${esVisualizador() ? "disabled" : ""}
                  >✕</button>
                </td>
              </tr>
            `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  contenedor.onclick = async (evento) => {
    const boton = evento.target.closest("[data-action]");

    if (!boton || !contenedor.contains(boton) || boton.disabled) {
      return;
    }

    const id = boton.dataset.id;

    if (!id) return;

    boton.disabled = true;

    try {
      switch (boton.dataset.action) {
        case "editar":
          await editarEstablecimiento(id);
          break;

        case "estado":
          await cambiarEstadoEstablecimiento(id);
          break;

        case "eliminar":
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
  const contenedor = obtenerElemento("admin-categories-list");

  if (!contenedor) return;

  contenedor.innerHTML = "<p>Cargando categorías...</p>";

  const { data: categorias, error } = await supabase
    .from("categorias")
    .select(
      `
      id,
      nombre,
      descripcion,
      categoria_padre_id
    `,
    )
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error al cargar categorías:", error);
    contenedor.innerHTML = "<p>No fue posible cargar las categorías.</p>";
    return;
  }

  const { data: establecimientos, error: errorEstablecimientos } =
    await supabase.from("establecimientos").select("categoria_id");

  if (errorEstablecimientos) {
    console.error(errorEstablecimientos);
    contenedor.innerHTML = "<p>No fue posible consultar las asociaciones.</p>";
    return;
  }

  const cantidades = {};

  (establecimientos || []).forEach((item) => {
    if (item.categoria_id !== null) {
      cantidades[item.categoria_id] = (cantidades[item.categoria_id] || 0) + 1;
    }
  });

  if (!categorias || categorias.length === 0) {
    contenedor.innerHTML = "<p>No hay categorías registradas.</p>";
    return;
  }

  const obtenerNombrePadre = (id) => {
    return (
      categorias.find((categoria) => String(categoria.id) === String(id))
        ?.nombre || "Categoría no encontrada"
    );
  };

  contenedor.innerHTML = `
    <div class="admin-table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Descripción</th>
            <th>Establecimientos asociados</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          ${categorias
            .map((categoria) => {
              const esPrincipal = categoria.categoria_padre_id === null;

              return `
                <tr>
                  <td>
                    <strong>${escaparHTML(categoria.nombre)}</strong>
                  </td>

                  <td>
                    <span class="admin-status ${
                      esPrincipal ? "active" : "inactive"
                    }">
                      ${esPrincipal ? "Principal" : "Secundaria"}
                    </span>

                    ${
                      !esPrincipal
                        ? `
                          <small style="display:block; margin-top:5px;">
                            Pertenece a:
                            ${escaparHTML(
                              obtenerNombrePadre(categoria.categoria_padre_id),
                            )}
                          </small>
                        `
                        : ""
                    }
                  </td>

                  <td>
                    ${escaparHTML(categoria.descripcion || "Sin descripción")}
                  </td>

                  <td>${cantidades[categoria.id] || 0}</td>

                  <td class="admin-actions-cell">
                    <button
                      type="button"
                      class="admin-action-button edit"
                      data-action="editar"
                      data-id="${escaparHTML(categoria.id)}"
                      title="Editar categoría"
                      ${esVisualizador() ? "disabled" : ""}
                    >✎</button>

                    <button
                      type="button"
                      class="admin-action-button delete"
                      data-action="eliminar"
                      data-id="${escaparHTML(categoria.id)}"
                      title="Eliminar categoría"
                      ${esVisualizador() ? "disabled" : ""}
                    >✕</button>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  contenedor.onclick = async (evento) => {
    const boton = evento.target.closest("[data-action]");

    if (!boton || !contenedor.contains(boton) || boton.disabled) {
      return;
    }

    const id = boton.dataset.id;
    boton.disabled = true;

    try {
      if (boton.dataset.action === "editar") {
        const categoria = categorias.find(
          (item) => String(item.id) === String(id),
        );

        if (categoria) {
          abrirModalCategoria(categoria);
        }
      }

      if (boton.dataset.action === "eliminar") {
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

async function abrirModalCategoria(categoria = null) {
  if (esVisualizador()) return;

  const modal = obtenerElemento("modal-nueva-categoria");
  const formulario = obtenerElemento("form-categoria-admin");
  const selectorPadre = obtenerElemento("categoria-padre-admin");

  if (!modal || !formulario || !selectorPadre) return;

  formulario.reset();

  const { data: categorias, error } = await supabase
    .from("categorias")
    .select("id, nombre, categoria_padre_id")
    .is("categoria_padre_id", null)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error al consultar categorías principales:", error);
    alert("No fue posible cargar las categorías principales.");
    return;
  }

  selectorPadre.innerHTML = `
    <option value="">Ninguna (categoría principal)</option>
  `;

  (categorias || []).forEach((item) => {
    if (categoria && String(item.id) === String(categoria.id)) {
      return;
    }

    const opcion = document.createElement("option");
    opcion.value = item.id;
    opcion.textContent = item.nombre;

    selectorPadre.appendChild(opcion);
  });

  obtenerElemento("categoria-id").value = categoria?.id || "";
  obtenerElemento("categoria-nombre-admin").value = categoria?.nombre || "";
  obtenerElemento("categoria-descripcion-admin").value =
    categoria?.descripcion || "";

  selectorPadre.value = categoria?.categoria_padre_id || "";

  const titulo = modal.querySelector(".admin-modal-header h2");
  const descripcion = modal.querySelector(".admin-modal-header p");

  if (titulo) {
    titulo.textContent = categoria ? "Editar categoría" : "Nueva categoría";
  }

  if (descripcion) {
    descripcion.textContent = categoria
      ? "Modifica la categoría y su relación principal."
      : "Registra una categoría principal o una subcategoría.";
  }

  obtenerElemento("guardar-categoria").textContent = categoria
    ? "Actualizar categoría"
    : "Guardar categoría";

  obtenerElemento("mensaje-categoria-admin").textContent = "";

  modal.hidden = false;
}

// ======================================================
// CATEGORÍAS: GUARDAR
// ======================================================

async function guardarCategoria(evento) {
  evento.preventDefault();

  if (esVisualizador()) return;

  const formulario = evento.currentTarget;

  const campoId = obtenerElemento("categoria-id");
  const campoNombre = obtenerElemento("categoria-nombre-admin");
  const campoDescripcion = obtenerElemento("categoria-descripcion-admin");
  const campoPadre = obtenerElemento("categoria-padre-admin");

  const boton = obtenerElemento("guardar-categoria");
  const mensaje = obtenerElemento("mensaje-categoria-admin");
  const modal = obtenerElemento("modal-nueva-categoria");

  const id = campoId.value;
  const nombre = campoNombre.value.trim();
  const descripcion = campoDescripcion.value.trim();
  const categoriaPadreId = campoPadre.value || null;

  const esEdicion = Boolean(id);

  if (!nombre) {
    mostrarMensaje(mensaje, "El nombre de la categoría es obligatorio.");
    return;
  }

  if (categoriaPadreId && String(categoriaPadreId) === String(id)) {
    mostrarMensaje(
      mensaje,
      "Una categoría no puede ser su propia categoría principal.",
    );
    return;
  }

  boton.disabled = true;
  boton.textContent = esEdicion ? "Actualizando..." : "Guardando...";

  try {
    if (modal) modal.hidden = true;

    const inicioAnimacion = Date.now();

    reproducirAnimacionAdmin("sol-carga", {
      loop: true,
    });

    const registro = {
      nombre,
      descripcion: descripcion || null,
      categoria_padre_id: categoriaPadreId,
    };

    let resultado;

    if (esEdicion) {
      resultado = await supabase
        .from("categorias")
        .update(registro)
        .eq("id", id);
    } else {
      resultado = await supabase.from("categorias").insert([registro]);
    }

    if (resultado.error) throw resultado.error;

    await Promise.all([
      cargarTablaCategorias(),
      cargarEstadisticas(),
      cargarCategorias(),
    ]);

    await esperarAnimacionMinima(inicioAnimacion);

    detenerAnimacionAdmin();

    cerrarModal(modal);
    formulario.reset();
    campoId.value = "";

    mostrarAlertaConfirmacion(
      esEdicion
        ? "Categoría actualizada correctamente."
        : "Categoría creada correctamente.",
    );
  } catch (error) {
    console.error("Error al guardar categoría:", error);

    detenerAnimacionAdmin();

    if (modal) modal.hidden = false;

    mostrarMensaje(
      mensaje,
      error.code === "23505"
        ? "Ya existe una categoría con ese nombre."
        : `Error al guardar: ${error.message || "Error desconocido"}`,
    );
  } finally {
    boton.disabled = false;
    boton.textContent = campoId.value
      ? "Actualizar categoría"
      : "Guardar categoría";
  }
}

// ======================================================
// CATEGORÍAS: ELIMINAR
// ======================================================

async function eliminarCategoria(id) {
  if (esVisualizador()) return;

  const { count: cantidadHijas, error: errorHijas } = await supabase
    .from("categorias")
    .select("id", { count: "exact", head: true })
    .eq("categoria_padre_id", id);

  if (errorHijas) {
    mostrarError("No fue posible comprobar las subcategorías.", errorHijas);
    return;
  }

  if (cantidadHijas > 0) {
    alert(
      `No puedes eliminar esta categoría porque tiene ${cantidadHijas} subcategoría(s) asociada(s). Elimina o reasigna primero esas subcategorías.`,
    );
    return;
  }

  const { count, error: errorConteo } = await supabase
    .from("establecimientos")
    .select("id", { count: "exact", head: true })
    .eq("categoria_id", id);

  if (errorConteo) {
    mostrarError(
      "No fue posible comprobar los establecimientos asociados.",
      errorConteo,
    );
    return;
  }

  if (count > 0) {
    alert(
      `No puedes eliminar esta categoría porque tiene ${count} establecimiento(s) asociado(s).`,
    );
    return;
  }

  await confirmarAccion({
    titulo: "Eliminar categoría",
    descripcion: "Esta acción no se puede deshacer.",
    detalle: "¿Estás seguro de que deseas eliminar esta categoría?",
    mensajeExito: "Categoría eliminada correctamente.",
    tipoAnimacion: "acero-brillo",

    accion: async () => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);

      if (error) throw error;

      await Promise.all([
        cargarTablaCategorias(),
        cargarEstadisticas(),
        cargarCategorias(),
      ]);
    },
  });
}

// ======================================================
// USUARIOS: TABLA
// ======================================================

async function cargarTablaUsuarios() {
  if (!esAdministrador()) return;

  const contenedor = obtenerElemento("admin-users-list");

  if (!contenedor) return;

  contenedor.innerHTML = "<p>Cargando usuarios y permisos...</p>";

  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .order("role", { ascending: true });

  if (error) {
    console.error("Error al consultar usuarios:", error);

    contenedor.innerHTML =
      "<p>No fue posible cargar los usuarios. Verifica las políticas de acceso.</p>";

    return;
  }

  if (!data || data.length === 0) {
    contenedor.innerHTML = "<p>No hay usuarios con roles registrados.</p>";
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
          ${data
            .map(
              (usuario) => `
                <tr>
                  <td class="admin-user-uuid">
                    ${escaparHTML(usuario.user_id)}
                  </td>

                  <td>
                    <span class="admin-role ${
                      ["admin", "principal_admin"].includes(usuario.role)
                        ? "admin-role-admin"
                        : "admin-role-user"
                    }">
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
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <p class="admin-users-note">
      Este módulo administra los roles de cuentas existentes.
      No crea ni elimina cuentas de autenticación.
    </p>
  `;

  contenedor.onclick = async (evento) => {
    const boton = evento.target.closest("[data-action]");

    if (!boton || !contenedor.contains(boton) || boton.disabled) {
      return;
    }

    const userId = boton.dataset.id;
    boton.disabled = true;

    try {
      if (boton.dataset.action === "editar") {
        const usuario = data.find((item) => item.user_id === userId);

        if (usuario) abrirModalUsuario(usuario);
      }

      if (boton.dataset.action === "eliminar") {
        await eliminarUsuario(userId);
      }
    } finally {
      if (boton.isConnected) {
        boton.disabled = false;
      }
    }
  };
}

// ======================================================
// USUARIOS: ABRIR MODAL
// ======================================================

function abrirModalUsuario(usuario = null) {
  if (!esAdministrador()) return;

  const modal = obtenerElemento("modal-nuevo-usuario");
  const formulario = obtenerElemento("form-usuario-admin");

  if (!modal || !formulario) return;

  formulario.reset();

  usuarioEnEdicion = usuario?.user_id || null;

  const campoUuid = obtenerElemento("usuario-uuid-admin");
  const campoRol = obtenerElemento("usuario-rol-admin");

  campoUuid.value = usuario?.user_id || "";
  campoUuid.readOnly = Boolean(usuario);

  const rolExistente = usuario?.role;

  if (
    rolExistente &&
    !Array.from(campoRol.options).some(
      (opcion) => opcion.value === rolExistente,
    )
  ) {
    const opcion = document.createElement("option");
    opcion.value = rolExistente;
    opcion.textContent = rolExistente;
    campoRol.appendChild(opcion);
  }

  campoRol.value = rolExistente || "";

  const titulo = modal.querySelector(".admin-modal-header h2");
  const descripcion = modal.querySelector(".admin-modal-header p");

  if (titulo) {
    titulo.textContent = usuario ? "Editar permisos" : "Asignar usuario";
  }

  if (descripcion) {
    descripcion.textContent = usuario
      ? "Modifica el rol asignado a esta cuenta."
      : "Asigna un rol a una cuenta existente en Supabase Auth.";
  }

  obtenerElemento("guardar-usuario").textContent = usuario
    ? "Actualizar permisos"
    : "Asignar rol";

  obtenerElemento("mensaje-usuario-admin").textContent = "";

  modal.hidden = false;
}

// ======================================================
// USUARIOS: ASIGNAR O ACTUALIZAR ROL
// ======================================================

async function guardarUsuario(evento) {
  evento.preventDefault();

  if (!esAdministrador()) return;

  const formulario = evento.currentTarget;

  const campoUuid = obtenerElemento("usuario-uuid-admin");
  const campoRol = obtenerElemento("usuario-rol-admin");
  const boton = obtenerElemento("guardar-usuario");
  const mensaje = obtenerElemento("mensaje-usuario-admin");
  const modal = obtenerElemento("modal-nuevo-usuario");

  const userId = campoUuid.value.trim();
  const role = campoRol.value;

  const modoEdicion = usuarioEnEdicion !== null;
  const userIdEdicion = usuarioEnEdicion;

  const expresionUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!expresionUuid.test(userId)) {
    mostrarMensaje(mensaje, "Ingresa un UUID válido.");
    return;
  }

  if (!role) {
    mostrarMensaje(mensaje, "Selecciona un rol.");
    return;
  }

  boton.disabled = true;
  boton.textContent = modoEdicion ? "Actualizando..." : "Asignando...";

  try {
    if (modal) modal.hidden = true;

    const inicioAnimacion = Date.now();

    reproducirAnimacionAdmin("sol-carga", {
      loop: true,
    });

    let resultado;

    if (modoEdicion) {
      resultado = await supabase
        .from("user_roles")
        .update({ role })
        .eq("user_id", userIdEdicion);
    } else {
      resultado = await supabase.from("user_roles").insert([
        {
          user_id: userId,
          role,
        },
      ]);
    }

    if (resultado.error) throw resultado.error;

    await Promise.all([cargarTablaUsuarios(), cargarEstadisticas()]);

    await esperarAnimacionMinima(inicioAnimacion);

    detenerAnimacionAdmin();

    cerrarModal(modal);
    formulario.reset();

    usuarioEnEdicion = null;

    mostrarAlertaConfirmacion(
      modoEdicion
        ? "Permisos actualizados correctamente."
        : "Rol asignado correctamente.",
    );
  } catch (error) {
    console.error("Error al guardar el usuario:", {
      mensaje: error.message,
      codigo: error.code,
      detalles: error.details,
      sugerencia: error.hint,
    });

    detenerAnimacionAdmin();

    if (modal) modal.hidden = false;

    let texto =
      "No fue posible guardar el rol. Verifica los permisos de Supabase.";

    if (error.code === "23505") {
      texto = "Este usuario ya tiene un rol registrado.";
    } else if (error.code === "23503") {
      texto = "El UUID no corresponde a una cuenta existente en Supabase Auth.";
    } else if (error.code === "22P02") {
      texto = "El UUID ingresado no tiene un formato válido.";
    }

    mostrarMensaje(mensaje, texto);
  } finally {
    boton.disabled = false;

    boton.textContent =
      usuarioEnEdicion !== null ? "Actualizar permisos" : "Asignar rol";
  }
}

// ======================================================
// USUARIOS: ELIMINAR ASIGNACIÓN DE ROL
// ======================================================

async function eliminarUsuario(userId) {
  if (!esAdministrador()) return;

  const { data: usuario, error } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .eq("user_id", userId)
    .single();

  if (error || !usuario) {
    mostrarError("No fue posible consultar el rol del usuario.", error);
    return;
  }

  if (["admin", "principal_admin"].includes(usuario.role)) {
    const rolesProtegidos = ["admin", "principal_admin"];

    const { data: administradores, error: errorConteo } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", rolesProtegidos);

    if (errorConteo) {
      mostrarError(
        "No fue posible comprobar los administradores.",
        errorConteo,
      );
      return;
    }

    if (
      usuario.role === "principal_admin" &&
      (administradores || []).filter((item) => item.role === "principal_admin")
        .length <= 1
    ) {
      alert("No puedes retirar el rol del último administrador principal.");
      return;
    }

    if (
      usuario.role === "admin" &&
      (administradores || []).filter((item) => item.role === "admin").length <=
        1
    ) {
      alert("No puedes retirar el rol del último administrador.");
      return;
    }
  }

  await confirmarAccion({
    titulo: "Retirar permisos",
    descripcion: "Se eliminará la asignación de rol.",
    detalle:
      "¿Deseas retirar el rol de este usuario? Su cuenta de Supabase Auth permanecerá intacta.",
    mensajeExito: "La asignación de rol fue eliminada correctamente.",
    tipoAnimacion: "acero-brillo",

    accion: async () => {
      const { error: errorEliminar } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (errorEliminar) throw errorEliminar;

      await Promise.all([cargarTablaUsuarios(), cargarEstadisticas()]);
    },
  });
}

// ======================================================
// PANEL PRINCIPAL
// ======================================================

function mostrarPanel(usuario, rol) {
  rolActual = rol;

  const nombresRoles = {
    principal_admin: "Administrador principal",
    admin: "Administrador",
    editor: "Editor",
    viewer: "Visualizador",
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

         
          ${
            esAdministrador()
              ? `
                <button data-section="usuarios">
                  <span>Usuarios y permisos</span>
                </button>

                ${
                  rolActual === "admin"
                    ? `
                      <button data-section="auditoria">
                        <span>Auditoría</span>
                      </button>
                    `
                    : ""
                }
              `
              : ""
          }

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
            ${escaparHTML(nombresRoles[rolActual] || "Usuario")}:
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

          ${
            esAdministrador()
              ? `
                <article class="admin-stat-card">
                  <span>Usuarios con rol</span>
                  <h2 id="total-usuarios">--</h2>
                </article>
              `
              : ""
          }
        </section>

        <section
          class="admin-content"
          id="admin-section-content"
        >
          <div class="admin-dashboard-intro">
            <div>
              <h2>Resumen general</h2>
              <p>
                Explora la distribución geográfica de los establecimientos
                registrados en SIGECO-SOG.
              </p>
            </div>
          </div>

          <section class="admin-map-section">
            <div class="admin-map-header">
              <div>
                <h3>Mapa de establecimientos</h3>
                <p>
                  Ubicación geográfica de los emprendimientos
                  y unidades productivas de Sogamoso.
                </p>
              </div>
            </div>

            <div
              id="mapa-panel-admin"
              class="admin-map-container"
            >
              <p class="mapa-admin-cargando">
                Preparando mapa...
              </p>
            </div>

            <div class="admin-map-legend">
              <h4>Categorías</h4>
              <div
                id="mapa-panel-leyenda"
                class="mapa-leyenda-lista"
              >
                <span>Cargando categorías...</span>
              </div>
            </div>

            <div class="admin-map-note">
              <span>
                Los marcadores representan establecimientos con
                coordenadas geográficas registradas.
              </span>
            </div>
          </section>
        </section>

      </main>
    </div>
  `;

  cargarEstadisticas();
  cargarMapaPanelAdmin();

  obtenerElemento("admin-logout").addEventListener("click", async (evento) => {
    const boton = evento.currentTarget;

    boton.disabled = true;
    boton.textContent = "Cerrando sesión...";

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error al cerrar sesión:", error);

      boton.disabled = false;
      boton.textContent = "Cerrar sesión";

      alert("No fue posible cerrar la sesión.");
      return;
    }

    window.location.replace("/");
  });

  document.querySelectorAll(".admin-menu button").forEach((boton) => {
    boton.addEventListener("click", () => {
      document.querySelectorAll(".admin-menu button").forEach((elemento) => {
        elemento.classList.remove("active");
      });

      boton.classList.add("active");

      const contenido = obtenerElemento("admin-section-content");
      const titulo = document.querySelector(".admin-topbar h1");
      const seccion = boton.dataset.section;

      const titulos = {
        inicio: "Panel principal",
        establecimientos: "Gestión de establecimientos",
        categorias: "Gestión de categorías",
        usuarios: "Usuarios y permisos",
        auditoria: "Auditoría del sistema",
      };

      titulo.textContent = titulos[seccion] || "Panel principal";

      switch (seccion) {
        case "establecimientos":
          mostrarSeccionEstablecimientos(contenido);
          break;

        case "categorias":
          mostrarSeccionCategorias(contenido);
          break;

        case "usuarios":
          if (esAdministrador()) {
            mostrarSeccionUsuarios(contenido);
          } else {
            contenido.innerHTML = `
              <h2>Acceso restringido</h2>
              <p>
                No tienes permisos para gestionar usuarios.
              </p>
            `;
          }
          break;

        case "auditoria":
          if (rolActual === "admin") {
            mostrarSeccionAuditoria(contenido);
          } else {
            contenido.innerHTML = `
              <h2>Acceso restringido</h2>
              <p>No tienes permisos para consultar la auditoría.</p>
            `;
          }
          break;

        default:
          contenido.innerHTML = `
            <div class="admin-dashboard-intro">
              <div>
                <h2>Resumen general</h2>
                <p>
                  Explora la distribución geográfica de los establecimientos
                  registrados en SIGECO-SOG.
                </p>
              </div>
            </div>

            <section class="admin-map-section">
              <div class="admin-map-header">
                <div>
                  <h3>Mapa de establecimientos</h3>
                  <p>
                    Ubicación geográfica de los emprendimientos
                    y unidades productivas de Sogamoso.
                  </p>
                </div>
              </div>

              <div
                id="mapa-panel-admin"
                class="admin-map-container"
              >
                <p class="mapa-admin-cargando">
                  Preparando mapa...
                </p>
              </div>

              <div class="admin-map-legend">
                <h4>Categorías</h4>
                <div
                  id="mapa-panel-leyenda"
                  class="mapa-leyenda-lista"
                >
                  <span>Cargando categorías...</span>
                </div>
              </div>

              <div class="admin-map-note">
                <span>
                  Los marcadores representan establecimientos con
                  coordenadas geográficas registradas.
                </span>
              </div>
            </section>
          `;

          cargarMapaPanelAdmin();
          break;
      }
    });
  });
}

/* ======================================================
   SIGECO-SOG — HISTORIAL DE AUDITORÍA
   ====================================================== */

async function mostrarSeccionAuditoria(contenido) {
  if (rolActual !== "admin") {
    contenido.innerHTML = "<p>Acceso restringido.</p>";
    return;
  }

  contenido.innerHTML = `
    <div class="audit-page">
      <div class="audit-hero">
        <div>
          <span class="audit-eyebrow">SEGURIDAD Y TRAZABILIDAD</span>
          <h2>Historial de auditoría</h2>
          <p>
            Consulta los movimientos del sistema, identifica a sus
            responsables y revisa los cambios realizados.
          </p>
        </div>
        <button type="button" id="audit-refresh" class="audit-refresh">
          ↻ Actualizar historial
        </button>
      </div>

      <div class="audit-stats">
        <article class="audit-stat">
          <span>Movimientos consultados</span>
          <strong id="audit-total">—</strong>
          <small>Registros cargados</small>
        </article>
        <article class="audit-stat">
          <span>Creaciones</span>
          <strong id="audit-inserts">—</strong>
          <small>Registros nuevos</small>
        </article>
        <article class="audit-stat">
          <span>Modificaciones</span>
          <strong id="audit-updates">—</strong>
          <small>Cambios realizados</small>
        </article>
        <article class="audit-stat">
          <span>Eliminaciones</span>
          <strong id="audit-deletes">—</strong>
          <small>Registros retirados</small>
        </article>
      </div>

      <div class="audit-panel">
        <div class="audit-panel-heading">
          <div>
            <span class="audit-eyebrow">REGISTRO DE ACTIVIDAD</span>
            <h3>Movimientos del sistema</h3>
            <p>Explora los eventos almacenados en Supabase.</p>
          </div>
          <span class="audit-live">● Historial registrado</span>
        </div>

        <div class="audit-filters">
          <input
            type="search"
            id="audit-search"
            placeholder="Buscar usuario, registro o movimiento..."
            aria-label="Buscar movimientos"
          >

          <select id="audit-operation" aria-label="Filtrar operación">
            <option value="">Todas las operaciones</option>
            <option value="INSERT">Creaciones</option>
            <option value="UPDATE">Modificaciones</option>
            <option value="DELETE">Eliminaciones</option>
            <option value="INICIO_SESION">Inicios de sesión</option>
            <option value="CIERRE_SESION">Cierres de sesión</option>
          </select>

          <select id="audit-module" aria-label="Filtrar módulo">
            <option value="">Todos los módulos</option>
            <option value="establecimientos">Establecimientos</option>
            <option value="categorias">Categorías</option>
            <option value="productos">Productos</option>
            <option value="imagenes_establecimiento">Imágenes</option>
            <option value="user_roles">Usuarios y roles</option>
            <option value="autenticacion">Autenticación</option>
          </select>
        </div>

        <div class="audit-table-wrap">
          <table class="audit-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Responsable</th>
                <th>Rol</th>
                <th>Módulo</th>
                <th>Operación</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody id="audit-table-body">
              <tr>
                <td colspan="6" class="audit-empty">
                  Cargando movimientos...
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="audit-pagination">
          <span id="audit-count">Preparando historial...</span>
          <div>
            <button type="button" id="audit-prev">Anterior</button>
            <span id="audit-page-number">1</span>
            <button type="button" id="audit-next">Siguiente</button>
          </div>
        </div>
      </div>

      <div class="audit-detail-overlay" id="audit-detail-overlay" hidden>
        <div class="audit-detail-dialog"
             role="dialog"
             aria-modal="true"
             aria-labelledby="audit-detail-title">
          <div class="audit-detail-header">
            <div>
              <span class="audit-eyebrow">TRAZABILIDAD DEL EVENTO</span>
              <h3 id="audit-detail-title">Detalle del movimiento</h3>
            </div>
            <button type="button"
                    id="audit-detail-close"
                    aria-label="Cerrar detalle">×</button>
          </div>
          <div class="audit-detail-body" id="audit-detail-body"></div>
        </div>
      </div>
    </div>
  `;

  const escapar = (valor) => escaparHTML(String(valor ?? ""));

  const formatoFecha = (fecha) => {
    if (!fecha) return "Sin fecha";
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(new Date(fecha));
  };

  const nombresModulos = {
    establecimientos: "Establecimientos",
    categorias: "Categorías",
    productos: "Productos",
    imagenes_establecimiento: "Imágenes",
    user_roles: "Usuarios y roles",
    autenticacion: "Autenticación",
  };

  const nombresOperaciones = {
    INSERT: "Creación",
    UPDATE: "Actualización",
    DELETE: "Eliminación",
    INICIO_SESION: "Inicio de sesión",
    CIERRE_SESION: "Cierre de sesión",
  };

  const nombresCampos = {
    nombre: "Nombre",
    descripcion: "Descripción",
    direccion: "Dirección",
    telefono: "Teléfono",
    correo: "Correo",
    categoria_id: "Categoría",
    categoria_padre_id: "Categoría principal",
    establecimiento_id: "Establecimiento",
    precio: "Precio",
    estado: "Estado",
    latitud: "Latitud",
    longitud: "Longitud",
    imagen_path: "Imagen",
    imagen_url: "Imagen del producto",
    ruta_archivo: "Archivo de imagen",
    texto_alternativo: "Texto alternativo",
    mensaje_imagen: "Mensaje de imagen",
    role: "Rol",
    tipo: "Tipo",
    orden: "Orden",
    updated_at: "Fecha de actualización",
    created_at: "Fecha de creación",
    user_id: "Usuario",
  };

  const formatoValor = (valor) => {
    if (valor === null || valor === undefined) return "Sin valor";
    if (typeof valor === "boolean") return valor ? "Sí" : "No";
    if (typeof valor === "object") return JSON.stringify(valor, null, 2);
    return String(valor);
  };

  const $ = (selector) => contenido.querySelector(selector);

  let registros = [];
  let filtrados = [];
  let pagina = 1;
  const porPagina = 10;
  let categoriasHistoricas = {};

  function obtenerNombreRegistro(registro) {
    const datos = registro.datos_nuevos || registro.datos_anteriores || {};
    return (
      datos.nombre || datos.role || registro.registro_id || "Sin identificador"
    );
  }

  function renderizarTabla() {
    const busqueda = $("#audit-search").value.toLocaleLowerCase("es");
    const operacion = $("#audit-operation").value;
    const modulo = $("#audit-module").value;

    filtrados = registros.filter((registro) => {
      const texto = [
        registro.usuario_correo,
        registro.usuario_rol,
        registro.operacion,
        registro.tabla_afectada,
        registro.registro_id,
        registro.descripcion,
        obtenerNombreRegistro(registro),
        JSON.stringify(registro.campos_modificados || {}),
      ]
        .join(" ")
        .toLocaleLowerCase("es");

      return (
        texto.includes(busqueda) &&
        (!operacion || registro.operacion === operacion) &&
        (!modulo || registro.tabla_afectada === modulo)
      );
    });

    const paginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
    pagina = Math.min(pagina, paginas);

    const visibles = filtrados.slice(
      (pagina - 1) * porPagina,
      pagina * porPagina,
    );

    $("#audit-table-body").innerHTML = visibles.length
      ? visibles
          .map(
            (registro) => `
          <tr>
            <td>
              <span class="audit-date">
                ${escapar(formatoFecha(registro.fecha_hora))}
              </span>
            </td>
            <td>
              <strong class="audit-user">
                ${escapar(registro.usuario_correo || "No identificado")}
              </strong>
            </td>
            <td>
              <span class="audit-role">
                ${escapar(registro.usuario_rol || "Sin rol")}
              </span>
            </td>
            <td>
              <span class="audit-module">
                ${escapar(
                  nombresModulos[registro.tabla_afectada] ||
                    registro.tabla_afectada,
                )}
              </span>
              <small class="audit-record-name">
                ${escapar(obtenerNombreRegistro(registro))}
              </small>
            </td>
            <td>
              <span class="audit-tag audit-tag-${escapar(registro.operacion)}">
                ${escapar(
                  nombresOperaciones[registro.operacion] || registro.operacion,
                )}
              </span>
            </td>
            <td>
              <button type="button"
                      class="audit-view"
                      data-audit-id="${registro.id}">
                Ver detalles →
              </button>
            </td>
          </tr>
        `,
          )
          .join("")
      : `<tr><td colspan="6" class="audit-empty">
           No se encontraron movimientos con esos filtros.
         </td></tr>`;

    $("#audit-count").textContent =
      `${filtrados.length} movimientos encontrados`;

    $("#audit-page-number").textContent = `${pagina} / ${paginas}`;
    $("#audit-prev").disabled = pagina <= 1;
    $("#audit-next").disabled = pagina >= paginas;
  }

  function construirCambios(registro) {
    let cambios = registro.campos_modificados;

    if (registro.operacion === "INSERT") {
      cambios = Object.fromEntries(
        Object.entries(registro.datos_nuevos || {}).map(([campo, valor]) => [
          campo,
          { anterior: null, nuevo: valor },
        ]),
      );
    }

    if (registro.operacion === "DELETE") {
      cambios = Object.fromEntries(
        Object.entries(registro.datos_anteriores || {}).map(
          ([campo, valor]) => [campo, { anterior: valor, nuevo: null }],
        ),
      );
    }

    if (!cambios || !Object.keys(cambios).length) {
      return `
        <div class="audit-no-changes">
          Este evento no contiene modificaciones de campos.
        </div>
      `;
    }

    return Object.entries(cambios)
      .map(([campo, valores]) => {
        const anterior = valores?.anterior;
        const nuevo = valores?.nuevo;

        const nombreAnterior =
          campo === "categoria_id" || campo === "categoria_padre_id"
            ? categoriasHistoricas[String(anterior)]
            : null;

        const nombreNuevo =
          campo === "categoria_id" || campo === "categoria_padre_id"
            ? categoriasHistoricas[String(nuevo)]
            : null;

        const mostrarAnterior = nombreAnterior
          ? `${nombreAnterior} (ID ${anterior})`
          : formatoValor(anterior);

        const mostrarNuevo = nombreNuevo
          ? `${nombreNuevo} (ID ${nuevo})`
          : formatoValor(nuevo);

        return `
        <article class="audit-change">
          <h4>${escapar(nombresCampos[campo] || campo)}</h4>
          <div class="audit-change-grid">
            <div class="audit-before">
              <span>VALOR ANTERIOR</span>
              <p>${escapar(mostrarAnterior)}</p>
            </div>
            <div class="audit-after">
              <span>VALOR NUEVO</span>
              <p>${escapar(mostrarNuevo)}</p>
            </div>
          </div>
        </article>
      `;
      })
      .join("");
  }

  function abrirDetalle(registro) {
    $("#audit-detail-body").innerHTML = `
      <div class="audit-detail-summary">
        <span class="audit-tag audit-tag-${escapar(registro.operacion)}">
          ${escapar(
            nombresOperaciones[registro.operacion] || registro.operacion,
          )}
        </span>
        <h4>${escapar(obtenerNombreRegistro(registro))}</h4>
        <p>${escapar(formatoFecha(registro.fecha_hora))}</p>
      </div>

      <div class="audit-detail-metadata">
        <div>
          <span>Responsable</span>
          <strong>${escapar(registro.usuario_correo || "No identificado")}</strong>
        </div>
        <div>
          <span>Rol</span>
          <strong>${escapar(registro.usuario_rol || "Sin rol")}</strong>
        </div>
        <div>
          <span>Módulo</span>
          <strong>${escapar(
            nombresModulos[registro.tabla_afectada] || registro.tabla_afectada,
          )}</strong>
        </div>
        <div>
          <span>ID del registro</span>
          <strong>${escapar(registro.registro_id || "No aplica")}</strong>
        </div>
      </div>

      <div class="audit-detail-section-heading">
        <h4>Detalle de los cambios</h4>
        <p>Comparación de la información registrada.</p>
      </div>

      <div class="audit-changes">
        ${construirCambios(registro)}
      </div>
    `;

    $("#audit-detail-overlay").hidden = false;
    $("#audit-detail-close").focus();
  }

  function cerrarDetalle() {
    $("#audit-detail-overlay").hidden = true;
  }

  async function cargarAuditoria() {
    $("#audit-table-body").innerHTML = `
      <tr><td colspan="6" class="audit-empty">
        Consultando historial de auditoría...
      </td></tr>
    `;

    const { data, error } = await supabase
      .from("auditoria")
      .select("*")
      .order("fecha_hora", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Error al consultar auditoría:", error);
      $("#audit-table-body").innerHTML = `
        <tr><td colspan="6" class="audit-empty">
          No fue posible cargar la auditoría.
          Verifica los permisos de lectura en Supabase.
        </td></tr>
      `;
      return;
    }

    registros = data || [];

    // Consulta auxiliar para mostrar nombres de categorías actuales.
    const { data: categorias, error: errorCategorias } = await supabase
      .from("categorias")
      .select("id, nombre");

    categoriasHistoricas = {};

    if (!errorCategorias) {
      (categorias || []).forEach((categoria) => {
        categoriasHistoricas[String(categoria.id)] = categoria.nombre;
      });
    }

    $("#audit-total").textContent = registros.length;
    $("#audit-inserts").textContent = registros.filter(
      (r) => r.operacion === "INSERT",
    ).length;
    $("#audit-updates").textContent = registros.filter(
      (r) => r.operacion === "UPDATE",
    ).length;
    $("#audit-deletes").textContent = registros.filter(
      (r) => r.operacion === "DELETE",
    ).length;

    pagina = 1;
    renderizarTabla();
  }

  $("#audit-refresh").addEventListener("click", cargarAuditoria);

  ["#audit-search", "#audit-operation", "#audit-module"].forEach((selector) => {
    $(selector).addEventListener(
      selector === "#audit-search" ? "input" : "change",
      () => {
        pagina = 1;
        renderizarTabla();
      },
    );
  });

  $("#audit-prev").addEventListener("click", () => {
    if (pagina > 1) {
      pagina--;
      renderizarTabla();
    }
  });

  $("#audit-next").addEventListener("click", () => {
    if (pagina * porPagina < filtrados.length) {
      pagina++;
      renderizarTabla();
    }
  });

  $("#audit-table-body").addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-audit-id]");
    if (!boton) return;

    const registro = registros.find(
      (item) => String(item.id) === boton.dataset.auditId,
    );

    if (registro) abrirDetalle(registro);
  });

  $("#audit-detail-close").addEventListener("click", cerrarDetalle);

  $("#audit-detail-overlay").addEventListener("click", (evento) => {
    if (evento.target.id === "audit-detail-overlay") {
      cerrarDetalle();
    }
  });

  await cargarAuditoria();
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
        ${esVisualizador() ? "disabled" : ""}
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
  <div class="admin-horarios-encabezado">
    <h3>Horario de atención</h3>
    <p>
      Configura los días y horas de funcionamiento del establecimiento.
      Puedes dejar días cerrados o establecer dos turnos.
    </p>
  </div>

  <div id="horarios-establecimiento" class="admin-horarios-lista"></div>
</div>

            <div class="admin-form-group admin-form-full">
              <div class="admin-logo-section">

                <div class="admin-logo-header">
                  <div>
                    <h3>Identidad visual</h3>
                    <p>
                      Logo o imagen principal del establecimiento.
                    </p>
                  </div>

                  <span
                    id="estado-logo"
                    class="admin-logo-estado"
                  >
                    Sin logo
                  </span>
                </div>

                <div
                  id="vista-previa-logo"
                  class="admin-logo-preview"
                >
                  <div class="admin-logo-vacio">
                    <div class="admin-logo-icono">
                      <i class="lucide lucide-image-plus"></i>
                    </div>

                    <strong>
                      Añade el logo de tu establecimiento
                    </strong>

                    <span>
                      Selecciona una imagen para identificar
                      visualmente tu negocio.
                    </span>
                  </div>
                </div>

                <div class="admin-logo-footer">
                  <label
                    for="nuevo-logo"
                    id="etiqueta-logo"
                    class="admin-logo-boton"
                  >
                    <span class="admin-logo-boton-icono">＋</span>
                    Cargar logo
                  </label>

                  <input
                    type="file"
                    id="nuevo-logo"
                    accept="image/jpeg,image/png,image/webp"
                  >

                  <small>
                    JPG, PNG o WEBP. Tamaño máximo: 5 MB.
                  </small>
                </div>

              </div>
            </div>

            <!-- CATÁLOGO DE PRODUCTOS Y SERVICIOS -->

            <section
              class="admin-catalogo-section"
              id="seccion-catalogo-establecimiento"
            >

              <div class="admin-catalogo-header">
                <div>
                  <h3>Catálogo de productos y servicios</h3>
                  <p>
                    Agrega los productos o servicios que ofrece
                    este establecimiento.
                  </p>
                </div>

                <span
                  class="admin-catalogo-contador"
                  id="contador-catalogo"
                >
                  0 elementos
                </span>
              </div>

              <div class="admin-catalogo-contenido">

                <div
                  class="admin-catalogo-vacio"
                  id="catalogo-vacio"
                >
                  <div class="admin-catalogo-icono">+</div>

                  <strong>
                    Aún no hay productos o servicios
                  </strong>

                  <p>
                    Comienza agregando los elementos que ofrece el negocio.
                  </p>
                </div>

                <div
                  class="admin-catalogo-listado"
                  id="catalogo-listado"
                ></div>

                <button
                  type="button"
                  class="admin-catalogo-agregar"
                  id="btn-mostrar-form-catalogo"
                >
                  + Agregar producto o servicio
                </button>

                <div
                  class="admin-catalogo-formulario"
                  id="formulario-catalogo"
                  hidden
                >

                  <div class="admin-catalogo-form-header">
                    <h4>Nuevo elemento del catálogo</h4>

                    <button
                      type="button"
                      id="btn-cerrar-form-catalogo"
                      class="admin-catalogo-cerrar"
                    >
                      ×
                    </button>
                  </div>

                  <div class="admin-form-grid">

                    <div class="admin-form-group">
                      <label for="catalogo-tipo">Tipo</label>

                      <select id="catalogo-tipo">
                        <option value="producto">Producto</option>
                        <option value="servicio">Servicio</option>
                      </select>
                    </div>

                    <div class="admin-form-group">
                      <label for="catalogo-nombre">Nombre</label>

                      <input
                        type="text"
                        id="catalogo-nombre"
                        placeholder="Nombre del producto o servicio"
                      >
                    </div>

                    <div class="admin-form-group admin-form-full">
                      <label for="catalogo-descripcion">
                        Descripción
                      </label>

                      <textarea
                        id="catalogo-descripcion"
                        rows="3"
                        placeholder="Describe brevemente el producto o servicio"
                      ></textarea>
                    </div>

                    <div class="admin-form-group">
                      <label for="catalogo-precio">
                        Precio (COP)
                      </label>

                      <input
                        type="number"
                        id="catalogo-precio"
                        min="0"
                        step="1"
                        placeholder="Ej. 25000"
                      >
                    </div>

                    <div class="admin-form-group">
                      <label for="catalogo-disponibilidad">
                        Disponibilidad
                      </label>

                      <select id="catalogo-disponibilidad">
                        <option value="disponible">
                          Disponible
                        </option>

                        <option value="no_disponible">
                          No disponible
                        </option>
                      </select>
                    </div>

                    <div class="admin-form-group admin-form-full">
                      <label for="catalogo-imagen">
                        Imagen del producto o servicio
                      </label>

                      <input
                        type="file"
                        id="catalogo-imagen"
                        accept="image/jpeg,image/png,image/webp"
                      >

                      <div
                        class="admin-catalogo-imagen-preview"
                        id="catalogo-imagen-preview"
                        hidden
                      ></div>
                    </div>

                  </div>

                  <div class="admin-catalogo-form-acciones">

                    <button
                      type="button"
                      class="admin-secondary-button"
                      id="btn-cancelar-catalogo"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      class="admin-primary-button"
                      id="btn-guardar-catalogo"
                    >
                      Agregar al catálogo
                    </button>

                  </div>
                </div>

              </div>
            </section>

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

            <input
              type="hidden"
              id="nueva-latitud"
            >

            <input
              type="hidden"
              id="nueva-longitud"
            >

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

  inicializarCatalogoEstablecimiento();
  inicializarCampoLogo();

  cargarEstablecimientos(obtenerElemento("admin-establishments-list"));

  cargarCategorias();

  const modal = obtenerElemento("modal-nuevo-establecimiento");
  const formulario = obtenerElemento("form-nuevo-establecimiento");

  obtenerElemento("btn-nuevo-establecimiento").addEventListener(
    "click",
    async () => {
      if (esVisualizador()) return;

      establecimientoEnEdicion = null;

      formulario.reset();
      limpiarVistaPreviaLogo();

      // INICIALIZAR HORARIOS VACÍOS PARA EL NUEVO ESTABLECIMIENTO
      inicializarHorariosEstablecimiento();

      // LIMPIAR PRODUCTOS DEL ESTABLECIMIENTO ANTERIOR
      reiniciarCatalogoEstablecimiento();

      const titulo = modal.querySelector(".admin-modal-header h2");
      const descripcion = modal.querySelector(".admin-modal-header p");

      titulo.textContent = "Nuevo establecimiento";

      descripcion.textContent =
        "Registra un establecimiento o emprendimiento en SIGECO-SOG.";

      formulario.querySelector('button[type="submit"]').textContent =
        "Guardar establecimiento";

      obtenerElemento("mensaje-nuevo-establecimiento").textContent = "";

      await cargarCategorias();

      modal.hidden = false;

      requestAnimationFrame(() => {
        inicializarMapaUbicacion();
        restablecerUbicacion();
      });
    },
  );

  obtenerElemento("btn-buscar-ubicacion").addEventListener("click", (evento) =>
    buscarDireccion(evento),
  );

  formulario.addEventListener("submit", guardarEstablecimiento);

  const cerrar = () => {
    modal.hidden = true;
  };

  obtenerElemento("cerrar-modal-establecimiento").addEventListener(
    "click",
    cerrar,
  );

  obtenerElemento("cancelar-modal-establecimiento").addEventListener(
    "click",
    cerrar,
  );
}

/* ======================================================
   CATÁLOGO DE PRODUCTOS Y SERVICIOS - SIGECO-SOG
====================================================== */

let catalogoTemporalEstablecimiento = [];
let imagenTemporalCatalogo = null;
let productosEliminadosCatalogo = [];
let catalogoEditandoId = null;
let vistaPreviaCatalogoUrl = null;

function liberarVistaPreviaCatalogo() {
  if (vistaPreviaCatalogoUrl) {
    URL.revokeObjectURL(vistaPreviaCatalogoUrl);
    vistaPreviaCatalogoUrl = null;
  }

  imagenTemporalCatalogo = null;
}

function limpiarFormularioCatalogo() {
  const valores = {
    "catalogo-tipo": "producto",
    "catalogo-nombre": "",
    "catalogo-descripcion": "",
    "catalogo-precio": "",
    "catalogo-disponibilidad": "disponible",
    "catalogo-imagen": "",
  };

  Object.entries(valores).forEach(([id, valor]) => {
    const campo = obtenerElemento(id);
    if (campo) campo.value = valor;
  });

  const vista = obtenerElemento("catalogo-imagen-preview");

  if (vista) {
    vista.replaceChildren();
    vista.hidden = true;
  }

  const boton = obtenerElemento("btn-guardar-catalogo");

  if (boton) {
    boton.textContent = "Agregar al catálogo";
  }

  catalogoEditandoId = null;
  liberarVistaPreviaCatalogo();
}

function reiniciarCatalogoEstablecimiento() {
  catalogoTemporalEstablecimiento.forEach((producto) => {
    if (producto.previewUrl) {
      URL.revokeObjectURL(producto.previewUrl);
    }
  });

  catalogoTemporalEstablecimiento = [];
  productosEliminadosCatalogo = [];

  limpiarFormularioCatalogo();

  const formulario = obtenerElemento("formulario-catalogo");
  const botonMostrar = obtenerElemento("btn-mostrar-form-catalogo");

  if (formulario) formulario.hidden = true;
  if (botonMostrar) botonMostrar.hidden = false;

  renderizarCatalogoTemporal();
}

async function cargarCatalogoEstablecimiento(establecimientoId) {
  reiniciarCatalogoEstablecimiento();

  if (!establecimientoId) return;

  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("establecimiento_id", establecimientoId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  catalogoTemporalEstablecimiento = (data || []).map((producto) => ({
    id: producto.id,
    temporal_id: crypto.randomUUID(),
    tipo: producto.tipo || "producto",
    nombre: producto.nombre || "",
    descripcion: producto.descripcion || "",
    precio: Number(producto.precio || 0),
    disponibilidad:
      producto.estado === "inactivo" ? "no_disponible" : "disponible",
    imagen_url: producto.imagen_url || null,
    imagen: null,
    previewUrl: null,
    modificado: false,
  }));

  renderizarCatalogoTemporal();
}

function inicializarCatalogoEstablecimiento() {
  const seccion = obtenerElemento("seccion-catalogo-establecimiento");

  if (!seccion || seccion.dataset.inicializado === "true") {
    return;
  }

  seccion.dataset.inicializado = "true";

  const formulario = obtenerElemento("formulario-catalogo");
  const botonMostrar = obtenerElemento("btn-mostrar-form-catalogo");
  const botonCerrar = obtenerElemento("btn-cerrar-form-catalogo");
  const botonCancelar = obtenerElemento("btn-cancelar-catalogo");
  const botonGuardar = obtenerElemento("btn-guardar-catalogo");
  const inputImagen = obtenerElemento("catalogo-imagen");

  if (
    !formulario ||
    !botonMostrar ||
    !botonCerrar ||
    !botonCancelar ||
    !botonGuardar ||
    !inputImagen
  ) {
    console.error("No se encontró el formulario del catálogo.");
    return;
  }

  botonMostrar.addEventListener("click", () => {
    limpiarFormularioCatalogo();
    formulario.hidden = false;
    botonMostrar.hidden = true;
  });

  const cerrarFormulario = () => {
    limpiarFormularioCatalogo();
    formulario.hidden = true;
    botonMostrar.hidden = false;
  };

  botonCerrar.addEventListener("click", cerrarFormulario);
  botonCancelar.addEventListener("click", cerrarFormulario);

  inputImagen.addEventListener("change", () => {
    const archivo = inputImagen.files?.[0];
    const vista = obtenerElemento("catalogo-imagen-preview");

    liberarVistaPreviaCatalogo();

    if (!vista) return;

    vista.replaceChildren();
    vista.hidden = true;

    if (!archivo) return;

    try {
      validarImagen(archivo);
    } catch (error) {
      alert(error.message);
      inputImagen.value = "";
      return;
    }

    imagenTemporalCatalogo = archivo;
    vistaPreviaCatalogoUrl = URL.createObjectURL(archivo);

    const imagen = document.createElement("img");
    imagen.src = vistaPreviaCatalogoUrl;
    imagen.alt = "Vista previa del producto";

    vista.appendChild(imagen);
    vista.hidden = false;
  });

  botonGuardar.addEventListener("click", agregarElementoCatalogo);

  renderizarCatalogoTemporal();
}

function agregarElementoCatalogo() {
  const tipo = obtenerElemento("catalogo-tipo").value;

  const nombre = obtenerElemento("catalogo-nombre").value.trim();

  const descripcion = obtenerElemento("catalogo-descripcion").value.trim();

  const precioTexto = obtenerElemento("catalogo-precio").value;

  const disponibilidad = obtenerElemento("catalogo-disponibilidad").value;

  const precio = Number(precioTexto);

  if (!nombre) {
    alert("Escribe el nombre del producto o servicio.");
    return;
  }

  if (precioTexto === "" || !Number.isFinite(precio) || precio < 0) {
    alert("Ingresa un precio válido.");
    return;
  }

  const existente = catalogoTemporalEstablecimiento.find(
    (producto) => producto.temporal_id === catalogoEditandoId,
  );

  if (existente) {
    existente.tipo = tipo;
    existente.nombre = nombre;
    existente.descripcion = descripcion;
    existente.precio = precio;
    existente.disponibilidad = disponibilidad;
    existente.modificado = true;

    if (imagenTemporalCatalogo) {
      if (existente.previewUrl) {
        URL.revokeObjectURL(existente.previewUrl);
      }

      existente.imagen = imagenTemporalCatalogo;

      existente.previewUrl = URL.createObjectURL(imagenTemporalCatalogo);
    }
  } else {
    const archivo = imagenTemporalCatalogo;

    catalogoTemporalEstablecimiento.push({
      id: null,
      temporal_id: crypto.randomUUID(),
      tipo,
      nombre,
      descripcion,
      precio,
      disponibilidad,
      imagen: archivo,
      imagen_url: null,
      previewUrl: archivo ? URL.createObjectURL(archivo) : null,
      modificado: true,
    });
  }

  limpiarFormularioCatalogo();

  obtenerElemento("formulario-catalogo").hidden = true;

  obtenerElemento("btn-mostrar-form-catalogo").hidden = false;

  renderizarCatalogoTemporal();
}

function editarElementoCatalogo(temporalId) {
  const producto = catalogoTemporalEstablecimiento.find(
    (item) => item.temporal_id === temporalId,
  );

  if (!producto) return;

  limpiarFormularioCatalogo();

  catalogoEditandoId = temporalId;

  obtenerElemento("catalogo-tipo").value = producto.tipo;
  obtenerElemento("catalogo-nombre").value = producto.nombre;
  obtenerElemento("catalogo-descripcion").value = producto.descripcion;
  obtenerElemento("catalogo-precio").value = producto.precio;

  obtenerElemento("catalogo-disponibilidad").value = producto.disponibilidad;

  const vista = obtenerElemento("catalogo-imagen-preview");
  const url = producto.previewUrl || producto.imagen_url;

  if (vista && url) {
    const imagen = document.createElement("img");

    imagen.src = url;
    imagen.alt = producto.nombre;

    vista.replaceChildren(imagen);
    vista.hidden = false;
  }

  obtenerElemento("btn-guardar-catalogo").textContent = "Actualizar elemento";

  obtenerElemento("formulario-catalogo").hidden = false;
  obtenerElemento("btn-mostrar-form-catalogo").hidden = true;
}

function eliminarElementoCatalogo(temporalId) {
  const producto = catalogoTemporalEstablecimiento.find(
    (item) => item.temporal_id === temporalId,
  );

  if (!producto) return;

  if (!confirm(`¿Eliminar "${producto.nombre}" del catálogo?`)) {
    return;
  }

  if (producto.id) {
    productosEliminadosCatalogo.push(producto.id);
  }

  if (producto.previewUrl) {
    URL.revokeObjectURL(producto.previewUrl);
  }

  catalogoTemporalEstablecimiento = catalogoTemporalEstablecimiento.filter(
    (item) => item.temporal_id !== temporalId,
  );

  renderizarCatalogoTemporal();
}

function renderizarCatalogoTemporal() {
  const listado = obtenerElemento("catalogo-listado");
  const vacio = obtenerElemento("catalogo-vacio");
  const contador = obtenerElemento("contador-catalogo");

  if (!listado || !vacio || !contador) return;

  listado.replaceChildren();

  const cantidad = catalogoTemporalEstablecimiento.length;

  vacio.hidden = cantidad > 0;

  contador.textContent = `${cantidad} ${
    cantidad === 1 ? "elemento" : "elementos"
  }`;

  catalogoTemporalEstablecimiento.forEach((producto) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "admin-catalogo-item";

    const url = producto.previewUrl || producto.imagen_url;

    if (url) {
      const imagen = document.createElement("img");

      imagen.src = url;
      imagen.alt = producto.nombre;

      tarjeta.appendChild(imagen);
    }

    const contenido = document.createElement("div");
    contenido.className = "admin-catalogo-item-contenido";

    const titulo = document.createElement("h5");
    titulo.textContent = producto.nombre;

    const tipo = document.createElement("p");

    tipo.textContent = producto.tipo === "servicio" ? "Servicio" : "Producto";

    const descripcion = document.createElement("p");

    descripcion.textContent = producto.descripcion || "Sin descripción";

    const precio = document.createElement("span");
    precio.className = "admin-catalogo-precio";

    precio.textContent = producto.precio.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });

    const estado = document.createElement("span");

    estado.className = `admin-catalogo-estado ${
      producto.disponibilidad === "disponible" ? "disponible" : "no-disponible"
    }`;

    estado.textContent =
      producto.disponibilidad === "disponible" ? "Disponible" : "No disponible";

    const acciones = document.createElement("div");
    acciones.className = "admin-catalogo-acciones";

    const botonEditar = document.createElement("button");
    botonEditar.type = "button";
    botonEditar.textContent = "Editar";
    botonEditar.className = "admin-secondary-button";

    botonEditar.addEventListener("click", () => {
      editarElementoCatalogo(producto.temporal_id);
    });

    const botonEliminar = document.createElement("button");
    botonEliminar.type = "button";
    botonEliminar.textContent = "Eliminar";
    botonEliminar.className = "admin-catalogo-eliminar";

    botonEliminar.addEventListener("click", () => {
      eliminarElementoCatalogo(producto.temporal_id);
    });

    acciones.append(botonEditar, botonEliminar);

    contenido.append(titulo, tipo, descripcion, precio, estado, acciones);

    tarjeta.appendChild(contenido);
    listado.appendChild(tarjeta);
  });
}

async function subirImagenProducto(archivo, establecimientoId) {
  validarImagen(archivo);

  const extension = archivo.name.split(".").pop().toLowerCase();

  const ruta =
    `${establecimientoId}/catalogo/` + `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET_ESTABLECIMIENTOS)
    .upload(ruta, archivo, {
      contentType: archivo.type,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(BUCKET_ESTABLECIMIENTOS)
    .getPublicUrl(ruta);

  return {
    url: data.publicUrl,
    path: ruta,
  };
}

async function guardarCatalogoEstablecimiento(establecimientoId) {
  if (!establecimientoId) {
    throw new Error("No existe un establecimiento asociado.");
  }

  for (const producto of catalogoTemporalEstablecimiento) {
    if (producto.id && !producto.modificado) continue;

    let imagenUrl = producto.imagen_url;
    let rutaImagenNueva = null;

    if (producto.imagen) {
      const imagen = await subirImagenProducto(
        producto.imagen,
        establecimientoId,
      );

      imagenUrl = imagen.url;
      rutaImagenNueva = imagen.path;
    }

    const registro = {
      establecimiento_id: establecimientoId,
      tipo: producto.tipo,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio,
      imagen_url: imagenUrl,
      estado: producto.disponibilidad === "disponible" ? "activo" : "inactivo",
    };

    let resultado;

    if (producto.id) {
      resultado = await supabase
        .from("productos")
        .update(registro)
        .eq("id", producto.id)
        .eq("establecimiento_id", establecimientoId);
    } else {
      resultado = await supabase
        .from("productos")
        .insert([registro])
        .select("id")
        .single();
    }

    if (resultado.error) {
      if (rutaImagenNueva) {
        try {
          await eliminarImagenEstablecimiento(rutaImagenNueva);
        } catch (errorLimpieza) {
          console.error(
            "No se pudo limpiar la imagen recién subida:",
            errorLimpieza,
          );
        }
      }

      throw resultado.error;
    }

    if (!producto.id) {
      producto.id = resultado.data.id;
    }

    producto.imagen_url = imagenUrl;
    producto.modificado = false;
  }

  for (const id of productosEliminadosCatalogo) {
    const { error } = await supabase
      .from("productos")
      .delete()
      .eq("id", id)
      .eq("establecimiento_id", establecimientoId);

    if (error) throw error;
  }

  productosEliminadosCatalogo = [];
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
        ${esVisualizador() ? "disabled" : ""}
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

          <input
            type="hidden"
            id="categoria-id"
          >

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
            <label for="categoria-padre-admin">
              Categoría principal
            </label>

            <select id="categoria-padre-admin">
              <option value="">
                Ninguna (categoría principal)
              </option>
            </select>

            <small>
              Si seleccionas una categoría, esta se registrará
              como subcategoría. Si lo dejas vacío, será una
              categoría principal.
            </small>
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

          <div
            id="mensaje-categoria-admin"
            role="status"
          ></div>

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

  const modal = obtenerElemento("modal-nueva-categoria");

  obtenerElemento("btn-nueva-categoria").addEventListener("click", () =>
    abrirModalCategoria(),
  );

  obtenerElemento("form-categoria-admin").addEventListener(
    "submit",
    guardarCategoria,
  );

  const cerrar = () => cerrarModal(modal);

  obtenerElemento("cerrar-modal-categoria").addEventListener("click", cerrar);

  obtenerElemento("cancelar-modal-categoria").addEventListener("click", cerrar);
}

// ======================================================
// SECCIÓN USUARIOS
// ======================================================

function mostrarSeccionUsuarios(contenido) {
  if (!esAdministrador()) {
    contenido.innerHTML = `
      <h2>Acceso restringido</h2>
      <p>
        No tienes permisos para gestionar usuarios.
      </p>
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

            <select
              id="usuario-rol-admin"
              required
            >
              <option value="">Selecciona un rol</option>
              <option value="admin">Administrador</option>
              <option value="editor">Editor</option>
              <option value="viewer">Visualizador</option>
            </select>
          </div>

          <div
            id="mensaje-usuario-admin"
            role="status"
          ></div>

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

  const modal = obtenerElemento("modal-nuevo-usuario");

  obtenerElemento("btn-nuevo-usuario").addEventListener("click", () =>
    abrirModalUsuario(),
  );

  obtenerElemento("form-usuario-admin").addEventListener(
    "submit",
    guardarUsuario,
  );

  const cerrar = () => {
    usuarioEnEdicion = null;
    cerrarModal(modal);
  };

  obtenerElemento("cerrar-modal-usuario").addEventListener("click", cerrar);

  obtenerElemento("cancelar-modal-usuario").addEventListener("click", cerrar);
}

// ======================================================
// INICIALIZACIÓN
// ======================================================

verificarAcceso();
