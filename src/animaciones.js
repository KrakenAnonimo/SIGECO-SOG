
import solCarga from './assets/Animacion/sol-carga.json';
import aceroASol from './assets/Animacion/acero-a-sol.json';
import solAAcero from './assets/Animacion/sol-a-acero.json';
import aceroBrillo from './assets/Animacion/acero-brillo.json';

// ======================================================
// CONFIGURACIÓN GENERAL
// ======================================================

const ANIMACIONES = {
    'sol-carga': solCarga,
    'acero-a-sol': aceroASol,
    'sol-a-acero': solAAcero,
    'acero-brillo': aceroBrillo
};

const CONFIGURACION = {
    fondo: 'rgba(5, 10, 20, 0.78)',
    colorTexto: '#F5F7FA',
    colorSecundario: '#AAB5C5',
    tamanoMaximo: 360,
    opacidadFondo: 0.78,
    desenfoque: 8
};

const MENSAJES = {
    'sol-carga': 'Procesando información',
    'acero-a-sol': 'Actualizando información',
    'sol-a-acero': 'Sincronizando sistema',
    'acero-brillo': 'Operación completada'
};

let reproduccionActual = null;
let identificadorReproduccion = 0;

// ======================================================
// UTILIDADES
// ======================================================

function limitar(valor, minimo, maximo) {
    return Math.max(minimo, Math.min(maximo, valor));
}

function suavizar(valor) {
    const t = limitar(valor, 0, 1);
    return t * t * (3 - 2 * t);
}

function convertirColor(color, opacidad = 1) {
    if (!Array.isArray(color)) {
        return `rgba(255,255,255,${opacidad})`;
    }

    const r = Math.round((color[0] ?? 1) * 255);
    const g = Math.round((color[1] ?? 1) * 255);
    const b = Math.round((color[2] ?? 1) * 255);
    const a = limitar((color[3] ?? 1) * opacidad, 0, 1);

    return `rgba(${r},${g},${b},${a})`;
}

function mezclarColor(color, destino, cantidad) {
    return color.map((valor, indice) => {
        return valor + (
            (destino[indice] ?? valor) - valor
        ) * cantidad;
    });
}

// ======================================================
// INTERPOLACIÓN DE PROPIEDADES
// ======================================================

function obtenerValor(propiedad, fotograma, predeterminado = 0) {
    if (!propiedad) return predeterminado;

    if (propiedad.a === 0) {
        return propiedad.k ?? predeterminado;
    }

    const fotogramas = propiedad.k;

    if (!Array.isArray(fotogramas) || fotogramas.length === 0) {
        return predeterminado;
    }

    if (typeof fotogramas[0] !== 'object') {
        return fotogramas;
    }

    if (fotograma <= fotogramas[0].t) {
        return fotogramas[0].s ?? predeterminado;
    }

    for (let i = 0; i < fotogramas.length; i++) {
        const actual = fotogramas[i];
        const siguiente = fotogramas[i + 1];

        if (!siguiente || fotograma <= siguiente.t) {
            const inicio = actual.s ?? predeterminado;

           if (!siguiente || actual.e === undefined) {
    return inicio;
}

            const final = actual.e ?? siguiente.s ?? inicio;

            const diferencia = siguiente.t - actual.t;

            if (diferencia <= 0) {
                return final;
            }

            const progreso = suavizar(
                (fotograma - actual.t) / diferencia
            );

            if (Array.isArray(inicio)) {
                const valoresFinales = Array.isArray(final)
                    ? final
                    : [final];

                return inicio.map((valor, indice) => {
                    const destino = valoresFinales[indice] ?? valor;

                    return valor + (destino - valor) * progreso;
                });
            }

            return inicio + (final - inicio) * progreso;
        }
    }

    return fotogramas[fotogramas.length - 1].s
        ?? predeterminado;
}

// ======================================================
// GRADIENTES Y EFECTOS DE ILUMINACIÓN
// ======================================================

function crearDegradadoRadial(
    ctx,
    x,
    y,
    radio,
    color,
    opacidad = 1
) {
    const gradiente = ctx.createRadialGradient(
        x - radio * 0.22,
        y - radio * 0.25,
        radio * 0.04,
        x,
        y,
        radio
    );

    const colorClaro = mezclarColor(
        color,
        [1, 1, 1, 1],
        0.42
    );

    const colorOscuro = mezclarColor(
        color,
        [0.20, 0.22, 0.28, 1],
        0.42
    );

    gradiente.addColorStop(
        0,
        convertirColor(colorClaro, opacidad)
    );

    gradiente.addColorStop(
        0.42,
        convertirColor(color, opacidad)
    );

    gradiente.addColorStop(
        1,
        convertirColor(colorOscuro, opacidad)
    );

    return gradiente;
}

function crearDegradadoMetalico(ctx, color, opacidad = 1) {
    const gradiente = ctx.createLinearGradient(
        -150,
        -150,
        150,
        150
    );

    const claro = mezclarColor(color, BLANCO(), 0.65);
    const oscuro = mezclarColor(color, [0.20, 0.25, 0.32, 1], 0.45);

    gradiente.addColorStop(
        0,
        convertirColor(claro, opacidad)
    );

    gradiente.addColorStop(
        0.22,
        convertirColor(color, opacidad)
    );

    gradiente.addColorStop(
        0.48,
        convertirColor([0.98, 0.99, 1, 1], opacidad)
    );

    gradiente.addColorStop(
        0.68,
        convertirColor(color, opacidad)
    );

    gradiente.addColorStop(
        1,
        convertirColor(oscuro, opacidad)
    );

    return gradiente;
}

function BLANCO() {
    return [1, 1, 1, 1];
}

function dibujarHalo(ctx, x, y, radio, color, intensidad = 0.25) {
    const gradiente = ctx.createRadialGradient(
        x,
        y,
        radio * 0.12,
        x,
        y,
        radio
    );

    gradiente.addColorStop(
        0,
        convertirColor(color, intensidad)
    );

    gradiente.addColorStop(
        0.55,
        convertirColor(color, intensidad * 0.35)
    );

    gradiente.addColorStop(
        1,
        convertirColor(color, 0)
    );

    ctx.save();
    ctx.fillStyle = gradiente;
    ctx.beginPath();
    ctx.arc(x, y, radio, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ======================================================
// FIGURAS GEOMÉTRICAS
// ======================================================

function dibujarElipse(ctx, figura, fotograma) {
    const tamano = obtenerValor(figura.s, fotograma, [20, 20]);
    const posicion = obtenerValor(figura.p, fotograma, [0, 0]);

    ctx.beginPath();

    ctx.ellipse(
        posicion[0] ?? 0,
        posicion[1] ?? 0,
        Math.abs((tamano[0] ?? 20) / 2),
        Math.abs((tamano[1] ?? 20) / 2),
        0,
        0,
        Math.PI * 2
    );
}

function dibujarEstrella(ctx, figura, fotograma) {
    const puntos = Math.max(
        2,
        Math.floor(obtenerValor(figura.pt, fotograma, 5))
    );

    const radioExterior = obtenerValor(
        figura.or,
        fotograma,
        10
    );

    const radioInterior = obtenerValor(
        figura.ir,
        fotograma,
        5
    );

    const posicion = obtenerValor(
        figura.p,
        fotograma,
        [0, 0]
    );

    ctx.beginPath();

    for (let i = 0; i < puntos * 2; i++) {
        const angulo = -Math.PI / 2 +
            (i * Math.PI / puntos);

        const radio = i % 2 === 0
            ? radioExterior
            : radioInterior;

        const x = (posicion[0] ?? 0) +
            Math.cos(angulo) * radio;

        const y = (posicion[1] ?? 0) +
            Math.sin(angulo) * radio;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.closePath();
}

// ======================================================
// DIBUJO DE FIGURAS CON EFECTOS
// ======================================================


function dibujarFigura(
    ctx,
    figura,
    relleno,
    contorno,
    fotograma,
    opacidadCapa = 1
) {
    if (figura.ty === 'el') {
        dibujarElipse(ctx, figura, fotograma);
    } else if (figura.ty === 'sr') {
        dibujarEstrella(ctx, figura, fotograma);
    } else {
        return;
    }

    const color = relleno
        ? obtenerValor(relleno.c, fotograma, [1, 1, 1, 1])
        : [0.75, 0.82, 0.92, 1];

    const esMetalico = (
        color[0] < 0.85 &&
        color[1] > 0.65 &&
        color[2] > 0.70
    );

    const tamano = figura.ty === 'el'
        ? obtenerValor(figura.s, fotograma, [20, 20])
        : [0, 0];

    const esAnilloMetalico = (
        esMetalico &&
        figura.ty === 'el' &&
        Math.max(
            Math.abs(tamano[0] ?? 0),
            Math.abs(tamano[1] ?? 0)
        ) >= 100 &&
        contorno
    );

    if (relleno) {
        const opacidadRelleno = limitar(
            obtenerValor(relleno.o, fotograma, 100) / 100 *
            opacidadCapa,
            0,
            1
        );

        ctx.save();

        ctx.shadowColor = convertirColor(
            color,
            esMetalico ? 0.55 : 0.75
        );

        ctx.shadowBlur = esMetalico ? 15 : 25;

        ctx.fillStyle = crearDegradadoRadial(
            ctx,
            0,
            0,
            figura.ty === 'el'
                ? Math.max(
                    Math.abs(tamano[0] ?? 20),
                    Math.abs(tamano[1] ?? 20)
                ) * 0.75
                : Math.abs(obtenerValor(figura.or, fotograma, 10)),
            color,
            opacidadRelleno
        );

        ctx.fill();
        ctx.restore();
    }

    if (contorno) {
        const opacidadContorno = limitar(
            obtenerValor(contorno.o, fotograma, 100) / 100 *
            opacidadCapa,
            0,
            1
        );

        const grosorOriginal = obtenerValor(
            contorno.w,
            fotograma,
            2
        );

        ctx.save();

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (esAnilloMetalico) {
            // Cuerpo exterior oscuro que aporta profundidad.
            ctx.globalAlpha = opacidadContorno;
            ctx.lineWidth = Math.max(28, grosorOriginal * 2.8);
            ctx.strokeStyle = 'rgba(13, 22, 36, 0.95)';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
            ctx.shadowBlur = 15;
            ctx.stroke();

            // Banda principal de acero.
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(170, 205, 240, 0.65)';
            ctx.lineWidth = Math.max(21, grosorOriginal * 2.2);

            ctx.strokeStyle = crearDegradadoMetalico(
                ctx,
                obtenerValor(contorno.c, fotograma, color),
                opacidadContorno
            );

            ctx.stroke();

            // Borde luminoso exterior.
            ctx.shadowBlur = 5;
            ctx.lineWidth = 2.2;
            ctx.strokeStyle = `rgba(240, 248, 255, ${opacidadContorno * 0.9})`;
            ctx.stroke();

            // Reflejo interior.
            ctx.shadowBlur = 0;
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacidadContorno * 0.75})`;
            ctx.stroke();

        } else {
            ctx.globalAlpha = 1;
            ctx.lineWidth = grosorOriginal;

            ctx.strokeStyle = crearDegradadoMetalico(
                ctx,
                obtenerValor(contorno.c, fotograma, color),
                opacidadContorno
            );

            ctx.shadowColor = convertirColor(
                obtenerValor(contorno.c, fotograma, color),
                0.8
            );

            ctx.shadowBlur = esMetalico ? 10 : 7;
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.globalAlpha = opacidadContorno * 0.45;
            ctx.lineWidth = Math.max(0.7, grosorOriginal * 0.25);
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
        }

        ctx.restore();
    }
}


// ======================================================
// DIBUJO DE CAPAS
// ======================================================

function dibujarCapa(ctx, capa, fotograma) {
    if (
        fotograma < (capa.ip ?? 0) ||
        fotograma >= (capa.op ?? Infinity)
    ) {
        return;
    }

    const transformacion = capa.ks;

    if (!transformacion) return;

    const posicion = obtenerValor(
        transformacion.p,
        fotograma,
        [0, 0, 0]
    );

    const escala = obtenerValor(
        transformacion.s,
        fotograma,
        [100, 100, 100]
    );

    const rotacion = obtenerValor(
        transformacion.r,
        fotograma,
        0
    );

    const opacidad = limitar(
        obtenerValor(transformacion.o, fotograma, 100) / 100,
        0,
        1
    );

    if (opacidad <= 0.001) return;

    ctx.save();

    ctx.translate(
        posicion[0] ?? 0,
        posicion[1] ?? 0
    );

    ctx.rotate(rotacion * Math.PI / 180);

    ctx.scale(
        (escala[0] ?? 100) / 100,
        (escala[1] ?? 100) / 100
    );

    ctx.globalAlpha *= opacidad;

    const figuras = capa.shapes ?? [];

    const relleno = figuras.find(
        figura => figura.ty === 'fl'
    );

    const contorno = figuras.find(
        figura => figura.ty === 'st'
    );

    const transformacionFigura = figuras.find(
        figura => figura.ty === 'tr'
    );

    const figura = figuras.find(
        elemento =>
            elemento.ty === 'el' ||
            elemento.ty === 'sr'
    );

    if (figura) {
        ctx.save();

        if (transformacionFigura) {
            const posicionFigura = obtenerValor(
                transformacionFigura.p,
                fotograma,
                [0, 0]
            );

            const escalaFigura = obtenerValor(
                transformacionFigura.s,
                fotograma,
                [100, 100]
            );

            const rotacionFigura = obtenerValor(
                transformacionFigura.r,
                fotograma,
                0
            );

            ctx.translate(
                posicionFigura[0] ?? 0,
                posicionFigura[1] ?? 0
            );

            ctx.rotate(
                rotacionFigura * Math.PI / 180
            );

            ctx.scale(
                (escalaFigura[0] ?? 100) / 100,
                (escalaFigura[1] ?? 100) / 100
            );
        }

        dibujarFigura(
            ctx,
            figura,
            relleno,
            contorno,
            fotograma,
            opacidad
        );

        ctx.restore();
    }

    ctx.restore();
}

// ======================================================
// ILUMINACIÓN AMBIENTAL
// ======================================================

function dibujarAmbiente(ctx, datos, tiempo) {
    const esSolar = (
        datos.nm?.toLowerCase().includes('sol') ||
        datos.nm?.toLowerCase().includes('transformación')
    );

    const color = esSolar
        ? [1, 0.67, 0.22, 1]
        : [0.62, 0.76, 0.96, 1];

    const pulsacion = 1 + Math.sin(tiempo * 0.0018) * 0.035;

    dibujarHalo(
        ctx,
        datos.w / 2,
        datos.h / 2,
        178 * pulsacion,
        color,
        0.20
    );

    // Polvo luminoso ambiental
    for (let i = 0; i < 18; i++) {
        const angulo = i * 2.39996;
        const radio = 150 + (i % 5) * 12;

        const movimiento = Math.sin(
            tiempo * 0.0006 + i
        ) * 5;

        const x = datos.w / 2 +
            Math.cos(angulo) * (radio + movimiento);

        const y = datos.h / 2 +
            Math.sin(angulo) * (radio + movimiento);

        const brillo = 0.25 + (
            Math.sin(tiempo * 0.002 + i) + 1
        ) * 0.25;

        ctx.save();

        ctx.globalAlpha = brillo;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = convertirColor(color, 0.9);
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.arc(x, y, i % 3 === 0 ? 1.8 : 1.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ======================================================
// REFLEJO METÁLICO ADICIONAL
// ======================================================

function dibujarReflejoMetalico(ctx, datos, tiempo) {
    const esAcero = (
        datos.nm?.toLowerCase().includes('acero') ||
        datos.nm?.toLowerCase().includes('brillo')
    );

    if (!esAcero) return;

    const progreso = (tiempo % 2600) / 2600;
    const x = -190 + progreso * 380;

    ctx.save();

    ctx.translate(datos.w / 2, datos.h / 2);
    ctx.rotate(-Math.PI / 4);

    const gradiente = ctx.createLinearGradient(
        x - 22,
        -190,
        x + 22,
        190
    );

    gradiente.addColorStop(0, 'rgba(255,255,255,0)');
    gradiente.addColorStop(0.5, 'rgba(255,255,255,0.20)');
    gradiente.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradiente;
    ctx.fillRect(x - 22, -190, 44, 380);

    ctx.restore();
}

// ======================================================
// ESCENARIO DE REPRODUCCIÓN
// ======================================================

function crearEscenario(datos, nombre, opciones = {}) {
    const overlay = document.createElement('div');

    overlay.id = 'animacion-admin-overlay';

    Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '99999',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '18px',
        padding: '20px',
        boxSizing: 'border-box',
        background: `
            radial-gradient(
                circle at center,
                rgba(27, 39, 58, 0.78) 0%,
                rgba(8, 13, 24, 0.92) 55%,
                rgba(3, 7, 15, 0.96) 100%
            )
        `,
        backdropFilter: `blur(${CONFIGURACION.desenfoque}px)`,
        WebkitBackdropFilter: `blur(${CONFIGURACION.desenfoque}px)`
    });

    const contenedor = document.createElement('div');

    Object.assign(contenedor.style, {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'min(90vw, 420px)',
        padding: '22px 16px',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '24px',
        background: 'rgba(12, 20, 34, 0.42)',
        boxShadow: '0 20px 70px rgba(0,0,0,0.38)'
    });

    const canvas = document.createElement('canvas');

    const dimension = Math.min(
        window.innerWidth * 0.78,
        CONFIGURACION.tamanoMaximo
    );

    const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        2
    );

    canvas.width = datos.w * pixelRatio;
    canvas.height = datos.h * pixelRatio;

    Object.assign(canvas.style, {
        display: 'block',
        width: `${dimension}px`,
        height: `${dimension * datos.h / datos.w}px`,
        maxWidth: '100%',
        objectFit: 'contain'
    });

    canvas.setAttribute(
        'aria-label',
        datos.nm || 'Animación SIGECO-SOG'
    );

    canvas.setAttribute('role', 'img');

    const marca = document.createElement('div');

    marca.textContent = 'SIGECO-SOG';

    Object.assign(marca.style, {
        marginTop: '3px',
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '3px',
        color: 'rgba(220,230,245,0.58)',
        fontFamily: 'Arial, sans-serif'
    });

    const mensaje = document.createElement('div');

    mensaje.textContent = opciones.mensaje ||
        MENSAJES[nombre] ||
        'Procesando solicitud';

    Object.assign(mensaje.style, {
        marginTop: '12px',
        color: CONFIGURACION.colorTexto,
        fontSize: '15px',
        fontWeight: '500',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        letterSpacing: '0.3px'
    });

    const indicador = document.createElement('div');

    Object.assign(indicador.style, {
        width: '44px',
        height: '3px',
        marginTop: '14px',
        overflow: 'hidden',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.12)'
    });

    const indicadorInterno = document.createElement('div');

    Object.assign(indicadorInterno.style, {
        width: '40%',
        height: '100%',
        borderRadius: '10px',
        background: 'linear-gradient(90deg, #D5A642, #FFF1B8)',
        animation: 'sigecoCarga 1.3s ease-in-out infinite'
    });

    indicador.appendChild(indicadorInterno);

    contenedor.appendChild(canvas);
    contenedor.appendChild(marca);
    contenedor.appendChild(mensaje);
    contenedor.appendChild(indicador);

    overlay.appendChild(contenedor);

    const estilo = document.createElement('style');

    estilo.textContent = `
        @keyframes sigecoCarga {
            0% { transform: translateX(-120%); }
            100% { transform: translateX(260%); }
        }
    `;

    overlay.appendChild(estilo);
    document.body.appendChild(overlay);

    const ctx = canvas.getContext('2d', {
        alpha: true,
        desynchronized: true
    });

    return {
        overlay,
        canvas,
        ctx,
        pixelRatio
    };
}

// ======================================================
// REPRODUCIR ANIMACIÓN
// ======================================================

export async function reproducirAnimacionAdmin(
    nombre,
    opciones = {}
) {
    detenerAnimacionAdmin();

    const id = ++identificadorReproduccion;

    try {
        const datos = ANIMACIONES[nombre];

        if (!datos) {
            throw new Error(
                `La animación "${nombre}" no está registrada.`
            );
        }

        if (
            !Array.isArray(datos.layers) ||
            !datos.w ||
            !datos.h ||
            !datos.fr ||
            datos.op === undefined
        ) {
            throw new Error(
                `El archivo JSON de "${nombre}" tiene una estructura inválida.`
            );
        }

        if (id !== identificadorReproduccion) {
            return false;
        }

        const loop = opciones.loop ?? (
            nombre === 'sol-carga'
        );

        const { overlay, canvas, ctx, pixelRatio } =
            crearEscenario(datos, nombre, opciones);

        const duracionFotogramas = datos.op - datos.ip;

        const duracionMilisegundos = (
            duracionFotogramas / datos.fr
        ) * 1000;

        if (duracionMilisegundos <= 0) {
            overlay.remove();
            throw new Error('La duración de la animación no es válida.');
        }

        return new Promise(resolve => {
            const reproduccion = {
                id,
                overlay,
                canvas,
                ctx,
                frame: null,
                resolve
            };

            reproduccionActual = reproduccion;

            const inicio = performance.now();

            function renderizar(ahora) {
                if (
                    !reproduccionActual ||
                    reproduccionActual.id !== id
                ) {
                    return;
                }

                let tiempo = ahora - inicio;

                if (loop) {
                    tiempo %= duracionMilisegundos;
                } else {
                    tiempo = Math.min(
                        tiempo,
                        duracionMilisegundos
                    );
                }

                const fotograma = Math.min(
                    datos.op - 0.001,
                    datos.ip + (tiempo / 1000) * datos.fr
                );

                ctx.setTransform(
                    pixelRatio,
                    0,
                    0,
                    pixelRatio,
                    0,
                    0
                );

                ctx.clearRect(
                    0,
                    0,
                    datos.w,
                    datos.h
                );

                // Iluminación ambiental
                dibujarAmbiente(ctx, datos, tiempo);

                // Reflejo metálico
                dibujarReflejoMetalico(ctx, datos, tiempo);

               // Capas de la animación centradas en el lienzo
ctx.save();

ctx.translate(
    datos.w / 2,
    datos.h / 2
);

datos.layers.forEach(capa => {
    dibujarCapa(ctx, capa, fotograma);
});

ctx.restore();
                if (
                    !loop &&
                    ahora - inicio >= duracionMilisegundos
                ) {
                    finalizarReproduccion(reproduccion, true);
                    return;
                }

                reproduccion.frame =
                    requestAnimationFrame(renderizar);
            }

            reproduccion.frame =
                requestAnimationFrame(renderizar);
        });

    } catch (error) {
        console.error(
            `Error al reproducir "${nombre}":`,
            error
        );

        return false;
    }
}

// ======================================================
// FINALIZAR REPRODUCCIÓN
// ======================================================

function finalizarReproduccion(reproduccion, resultado) {
    if (!reproduccion) return;

    if (reproduccion.frame !== null) {
        cancelAnimationFrame(reproduccion.frame);
        reproduccion.frame = null;
    }

    reproduccion.overlay?.remove();

    if (reproduccionActual === reproduccion) {
        reproduccionActual = null;
    }

    reproduccion.resolve?.(resultado);
}

// ======================================================
// DETENER ANIMACIÓN
// ======================================================

export function detenerAnimacionAdmin() {
    identificadorReproduccion++;

    if (reproduccionActual) {
        finalizarReproduccion(
            reproduccionActual,
            false
        );
    }
}
