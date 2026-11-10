
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ======================================================
// CONFIGURACIÓN
// ======================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CARPETA_SALIDA = path.resolve(
    __dirname,
    '../assets/Animacion'
);

const ANCHO = 400;
const ALTO = 400;
const FPS = 60;

const ORO = [1, 0.70, 0.18, 1];
const ORO_CLARO = [1, 0.88, 0.43, 1];
const ORO_OSCURO = [0.70, 0.35, 0.06, 1];
const AMBAR = [1, 0.48, 0.08, 1];

const PLATA = [0.65, 0.74, 0.86, 1];
const PLATA_CLARA = [0.91, 0.96, 1, 1];
const PLATA_OSCURA = [0.30, 0.40, 0.54, 1];
const BLANCO = [1, 1, 1, 1];

let identificadorCapa = 1;

// ======================================================
// PROPIEDADES DE ANIMACIÓN
// ======================================================

function estatica(valor) {
    return { a: 0, k: valor };
}

function animada(inicio, final, desde, hasta) {
    return {
        a: 1,
        k: [
            {
                t: desde,
                s: inicio,
                e: final
            },
            {
                t: hasta,
                s: final
            }
        ]
    };
}

function propiedad(valorInicial, valorFinal, desde, hasta) {
    if (valorFinal === null || valorFinal === undefined) {
        return estatica(valorInicial);
    }

    return animada(
        valorInicial,
        valorFinal,
        desde,
        hasta
    );
}

// ======================================================
// CREACIÓN DE CAPAS
// ======================================================

function crearCapa({
    nombre,
    tipo = 'el',
    x = 0,
    y = 0,
    ancho = 20,
    alto = 20,
    color = ORO,
    relleno = true,
    contorno = false,
    grosor = 2,
    puntos = 5,
    radioExterior = 10,
    radioInterior = 5,

    escalaInicial = [100, 100],
    escalaFinal = null,

    opacidadInicial = 100,
    opacidadFinal = null,

    rotacionInicial = 0,
    rotacionFinal = null,

    posicionInicial = null,
    posicionFinal = null,

    inicio = 0,
    fin = 240
}) {
    const id = identificadorCapa++;

    const figura = tipo === 'sr'
        ? {
            ty: 'sr',
            d: 1,
            pt: estatica(puntos),
            or: estatica(radioExterior),
            ir: estatica(radioInterior),
            p: estatica([0, 0]),
            r: estatica(0)
        }
        : {
            ty: 'el',
            p: estatica([0, 0]),
            s: estatica([ancho, alto])
        };

    const shapes = [];

    if (relleno) {
        shapes.push({
            ty: 'fl',
            c: estatica(color),
            o: estatica(100),
            r: 1
        });
    }

    if (contorno) {
        shapes.push({
            ty: 'st',
            c: estatica(color),
            o: estatica(100),
            w: estatica(grosor),
            lc: 2,
            lj: 2
        });
    }

    shapes.push(figura);

    return {
        ddd: 0,
        ind: id,
        ty: 4,
        nm: nombre,
        sr: 1,

        ks: {
            o: propiedad(
                opacidadInicial,
                opacidadFinal,
                inicio,
                fin
            ),

            r: propiedad(
                rotacionInicial,
                rotacionFinal,
                inicio,
                fin
            ),

            p: posicionFinal
                ? animada(
                    [...(posicionInicial || [x, y]), 0],
                    [...posicionFinal, 0],
                    inicio,
                    fin
                )
                : estatica([x, y, 0]),

            a: estatica([0, 0, 0]),

            s: escalaFinal
                ? animada(
                    [...escalaInicial, 100],
                    [...escalaFinal, 100],
                    inicio,
                    fin
                )
                : estatica([
                    escalaInicial[0],
                    escalaInicial[1],
                    100
                ])
        },

        ao: 0,
        ip: inicio,
        op: fin,
        st: 0,
        bm: 0,
        shapes,
        id
    };
}

// ======================================================
// ELEMENTOS REUTILIZABLES
// ======================================================

function anillo(capas, nombre, radio, color, grosor, opciones = {}) {
    capas.push(crearCapa({
        nombre,
        ancho: radio * 2,
        alto: radio * 2,
        color,
        relleno: false,
        contorno: true,
        grosor,
        ...opciones
    }));
}

function circulo(capas, nombre, radio, color, opciones = {}) {
    capas.push(crearCapa({
        nombre,
        ancho: radio * 2,
        alto: radio * 2,
        color,
        relleno: true,
        contorno: false,
        ...opciones
    }));
}

function destello(capas, nombre, x, y, tamano, color, opciones = {}) {
    capas.push(crearCapa({
        nombre,
        tipo: 'sr',
        x,
        y,
        puntos: 4,
        radioExterior: tamano,
        radioInterior: tamano * 0.12,
        color,
        ...opciones
    }));
}

function particulas(
    capas,
    cantidad,
    color,
    radioMinimo,
    radioMaximo,
    inicio,
    fin
) {
    for (let i = 0; i < cantidad; i++) {
        const angulo = i * 137.508 * Math.PI / 180;

        const radio = radioMinimo +
            ((i * 37) % (radioMaximo - radioMinimo));

        const x = Math.cos(angulo) * radio;
        const y = Math.sin(angulo) * radio;

        const tamano = i % 3 === 0 ? 4 : 2.5;

        capas.push(crearCapa({
            nombre: `Partícula ${i + 1}`,
            tipo: i % 3 === 0 ? 'sr' : 'el',
            x,
            y,
            ancho: tamano,
            alto: tamano,
            puntos: 4,
            radioExterior: tamano,
            radioInterior: 1,
            color,
            escalaInicial: [0, 0],
            escalaFinal: [100, 100],
            opacidadInicial: 0,
            opacidadFinal: 100,
            inicio: inicio + (i % 12) * 3,
            fin
        }));
    }
}

// ======================================================
// RAYOS SOLARES
// ======================================================

function rayosSolares(
    capas,
    cantidad,
    distancia,
    tamano,
    color,
    inicio,
    fin,
    opciones = {}
) {
    const {
        escalaInicial = 55,
        escalaFinal = 100,
        opacidadInicial = 0,
        opacidadFinal = 100
    } = opciones;

    for (let i = 0; i < cantidad; i++) {
        const angulo = Math.PI * 2 * i / cantidad;

        const x = Math.cos(angulo) * distancia;
        const y = Math.sin(angulo) * distancia;

        const longitud = i % 2 === 0
            ? tamano
            : tamano * 0.70;

        capas.push(crearCapa({
            nombre: `Rayo solar ${i + 1}`,
            tipo: 'sr',
            x,
            y,
            puntos: 4,
            radioExterior: longitud,
            radioInterior: longitud * 0.28,
            color: i % 2 === 0 ? color : ORO,

            escalaInicial: [
                escalaInicial,
                escalaInicial
            ],

            escalaFinal: [
                escalaFinal,
                escalaFinal
            ],

            opacidadInicial,
            opacidadFinal,

            rotacionInicial: 0,
            rotacionFinal: 360,
            inicio,
            fin
        }));
    }
}

// ======================================================
// SOL CENTRAL CORREGIDO
// ======================================================

function crearSol(capas, opciones = {}) {
    const {
        inicio = 0,
        fin = 240,
        escalaInicial = 100,
        escalaFinal = escalaInicial * 1.04,
        opacidadInicial = 100,
        opacidadFinal = opacidadInicial,
        rotacionInicial = 0
    } = opciones;

    const escala = (factor = 1) => [
        escalaInicial * factor,
        escalaInicial * factor
    ];

    const escalaFinalFactor = (factor = 1) => [
        escalaFinal * factor,
        escalaFinal * factor
    ];

    const opacidad = (factor = 1) =>
        opacidadInicial * factor;

    const opacidadFinalFactor = (factor = 1) =>
        opacidadFinal * factor;

    // Halo exterior
    circulo(
        capas,
        'Halo solar exterior',
        112,
        [1, 0.48, 0.08, 0.16],
        {
            escalaInicial: escala(),
            escalaFinal: escalaFinalFactor(1.08),
            opacidadInicial: opacidad(0.55),
            opacidadFinal: opacidadFinalFactor(0.85),
            inicio,
            fin
        }
    );

    // Rayos sincronizados con la transformación
    rayosSolares(
        capas,
        16,
        94,
        24,
        ORO_CLARO,
        inicio,
        fin,
        {
            escalaInicial: escalaInicial * 0.55,
            escalaFinal: escalaFinal,
            opacidadInicial,
            opacidadFinal
        }
    );

    // Corona exterior
    anillo(
        capas,
        'Corona dorada exterior',
        83,
        ORO_CLARO,
        3,
        {
            escalaInicial: escala(),
            escalaFinal: escalaFinalFactor(1.04),
            opacidadInicial,
            opacidadFinal,
            rotacionInicial,
            inicio,
            fin
        }
    );

    // Cuerpo principal
    circulo(
        capas,
        'Cuerpo solar dorado',
        76,
        ORO,
        {
            escalaInicial: escala(),
            escalaFinal: escalaFinalFactor(1.04),
            opacidadInicial,
            opacidadFinal,
            inicio,
            fin
        }
    );

    // Volumen interior
    circulo(
        capas,
        'Volumen interior dorado',
        61,
        ORO_OSCURO,
        {
            escalaInicial: escala(),
            escalaFinal: escalaFinalFactor(1.03),
            opacidadInicial: opacidad(0.65),
            opacidadFinal: opacidadFinalFactor(0.85),
            inicio,
            fin
        }
    );

    // Núcleo luminoso
    circulo(
        capas,
        'Núcleo solar luminoso',
        52,
        ORO_CLARO,
        {
            escalaInicial: escala(),
            escalaFinal: escalaFinalFactor(1.05),
            opacidadInicial,
            opacidadFinal,
            inicio,
            fin
        }
    );

    // Centro blanco dorado
    circulo(
        capas,
        'Centro blanco dorado',
        28,
        [1, 0.97, 0.82, 1],
        {
            escalaInicial: escala(),
            escalaFinal: escalaFinalFactor(1.04),
            opacidadInicial,
            opacidadFinal,
            inicio,
            fin
        }
    );

    // Destellos exteriores
    const posiciones = [
        [0, -112],
        [112, 0],
        [0, 112],
        [-112, 0],
        [79, -79],
        [79, 79],
        [-79, 79],
        [-79, -79]
    ];

    posiciones.forEach(([x, y], i) => {
        destello(
            capas,
            `Destello solar ${i + 1}`,
            x,
            y,
            i % 2 === 0 ? 10 : 7,
            BLANCO,
            {
                opacidadInicial: opacidadInicial * 0.65,
                opacidadFinal: opacidadFinal,
                escalaInicial: escala(0.8),
                escalaFinal: escalaFinalFactor(1.2),
                inicio,
                fin
            }
        );
    });
}

// ======================================================
// ACERO CENTRAL
// ======================================================

function crearAcero(capas, opciones = {}) {
    const {
        inicio = 0,
        fin = 210,
        escalaInicial = 100,
        opacidadInicial = 100,
        escalaFinal = null,
        opacidadFinal = null
    } = opciones;

    const propiedades = {
        escalaInicial: [escalaInicial, escalaInicial],

        escalaFinal: escalaFinal !== null
            ? [escalaFinal, escalaFinal]
            : null,

        opacidadInicial,
        opacidadFinal,
        inicio,
        fin
    };

    // Halo metálico
    anillo(
        capas,
        'Halo exterior de acero',
        145,
        PLATA_OSCURA,
        2,
        {
            ...propiedades
        }
    );

    // Borde exterior
    anillo(
        capas,
        'Borde exterior de acero',
        132,
        PLATA,
        4,
        {
            ...propiedades
        }
    );

    // Cuerpo principal
    anillo(
        capas,
        'Anillo metálico principal',
        119,
        PLATA,
        12,
        {
            ...propiedades
        }
    );

    // Borde luminoso
    anillo(
        capas,
        'Borde interior brillante',
        106,
        PLATA_CLARA,
        3,
        {
            ...propiedades
        }
    );

    // Reflejo interior
    anillo(
        capas,
        'Reflejo interior metálico',
        96,
        PLATA_OSCURA,
        1.5,
        {
            ...propiedades
        }
    );

    // Destellos principales
    const posiciones = [
        [0, -119],
        [119, 0],
        [0, 119],
        [-119, 0],
        [84, -84],
        [84, 84],
        [-84, 84],
        [-84, -84]
    ];

    posiciones.forEach(([x, y], i) => {
        destello(
            capas,
            `Destello del acero ${i + 1}`,
            x,
            y,
            i % 2 === 0 ? 9 : 6,
            BLANCO,
            {
                escalaInicial: [80, 80],
                escalaFinal: [120, 120],
                opacidadInicial: 40,
                opacidadFinal: 100,
                inicio,
                fin
            }
        );
    });
}

// ======================================================
// ANIMACIÓN 1: SOL DE CARGA
// ======================================================

function generarSolCarga() {
    const capas = [];
    const duracion = 240;

    crearSol(capas, {
        inicio: 0,
        fin: duracion,
        escalaInicial: 94,
        escalaFinal: 98,
        opacidadInicial: 100,
        opacidadFinal: 100
    });

    particulas(
        capas,
        30,
        ORO_CLARO,
        145,
        180,
        0,
        duracion
    );

    anillo(
        capas,
        'Anillo energético exterior',
        158,
        ORO,
        1.5,
        {
            opacidadInicial: 55,
            opacidadFinal: 80,
            escalaInicial: [95, 95],
            escalaFinal: [105, 105],
            inicio: 0,
            fin: duracion
        }
    );

    return crearDocumento(
        'Sol de carga',
        duracion,
        capas
    );
}

// ======================================================
// ANIMACIÓN 2: ACERO A SOL
// ======================================================

function generarAceroASol() {
    const capas = [];
    const duracion = 240;

    crearAcero(capas, {
        inicio: 0,
        fin: 125,
        escalaInicial: 100,
        escalaFinal: 8,
        opacidadInicial: 100,
        opacidadFinal: 0
    });

    // Fragmentos metálicos
    for (let i = 0; i < 20; i++) {
        const angulo = i * Math.PI * 2 / 20;
        const x = Math.cos(angulo) * 119;
        const y = Math.sin(angulo) * 119;

        destello(
            capas,
            `Fragmento de acero ${i + 1}`,
            x,
            y,
            8,
            i % 2 === 0 ? PLATA_CLARA : BLANCO,
            {
                escalaInicial: [100, 100],
                escalaFinal: [0, 0],
                opacidadInicial: 100,
                opacidadFinal: 0,
                posicionInicial: [x, y],
                posicionFinal: [
                    x * 1.35,
                    y * 1.35
                ],
                inicio: 0,
                fin: 120
            }
        );
    }

    // Destello central
    destello(
        capas,
        'Destello de transformación central',
        0,
        0,
        38,
        BLANCO,
        {
            escalaInicial: [0, 0],
            escalaFinal: [130, 130],
            opacidadInicial: 0,
            opacidadFinal: 100,
            inicio: 95,
            fin: 145
        }
    );

    // El sol crece y aparece progresivamente
    crearSol(capas, {
        inicio: 95,
        fin: 240,
        escalaInicial: 8,
        escalaFinal: 100,
        opacidadInicial: 0,
        opacidadFinal: 100
    });

    particulas(
        capas,
        26,
        ORO_CLARO,
        125,
        178,
        110,
        duracion
    );

    return crearDocumento(
        'Transformación de acero a sol',
        duracion,
        capas
    );
}

// ======================================================
// ANIMACIÓN 3: SOL A ACERO
// ======================================================

function generarSolAAcero() {
    const capas = [];
    const duracion = 240;

    // El sol se contrae y desaparece
    crearSol(capas, {
        inicio: 0,
        fin: 125,
        escalaInicial: 94,
        escalaFinal: 5,
        opacidadInicial: 100,
        opacidadFinal: 0
    });

    // Partículas solares
    for (let i = 0; i < 22; i++) {
        const angulo = i * Math.PI * 2 / 22;
        const x = Math.cos(angulo) * 100;
        const y = Math.sin(angulo) * 100;

        destello(
            capas,
            `Partícula de energía solar ${i + 1}`,
            x,
            y,
            7,
            ORO_CLARO,
            {
                escalaInicial: [100, 100],
                escalaFinal: [0, 0],
                opacidadInicial: 100,
                opacidadFinal: 0,
                posicionInicial: [x, y],
                posicionFinal: [
                    x * 1.4,
                    y * 1.4
                ],
                inicio: 0,
                fin: 120
            }
        );
    }

    // Destello de transición
    destello(
        capas,
        'Destello central de acero',
        0,
        0,
        35,
        BLANCO,
        {
            escalaInicial: [0, 0],
            escalaFinal: [120, 120],
            opacidadInicial: 0,
            opacidadFinal: 100,
            inicio: 95,
            fin: 145
        }
    );

    // El acero aparece progresivamente
    crearAcero(capas, {
        inicio: 100,
        fin: duracion,
        escalaInicial: 5,
        escalaFinal: 100,
        opacidadInicial: 0,
        opacidadFinal: 100
    });

    particulas(
        capas,
        24,
        PLATA_CLARA,
        130,
        180,
        110,
        duracion
    );

    return crearDocumento(
        'Transformación de sol a acero',
        duracion,
        capas
    );
}

// ======================================================
// ANIMACIÓN 4: ACERO CON BRILLO
// ======================================================

function generarAceroBrillo() {
    const capas = [];
    const duracion = 240;

    crearAcero(capas, {
        inicio: 0,
        fin: duracion,
        escalaInicial: 100,
        opacidadInicial: 100
    });

    // Destellos móviles
    for (let i = 0; i < 12; i++) {
        const angulo = i * Math.PI * 2 / 12;

        const x = Math.cos(angulo) * 119;
        const y = Math.sin(angulo) * 119;

        destello(
            capas,
            `Brillo móvil ${i + 1}`,
            x,
            y,
            11,
            BLANCO,
            {
                escalaInicial: [40, 40],
                escalaFinal: [145, 145],
                opacidadInicial: 0,
                opacidadFinal: 100,
                rotacionInicial: 0,
                rotacionFinal: 360,
                inicio: i * 12,
                fin: Math.min(duracion, i * 12 + 90)
            }
        );
    }

    // Reflejos luminosos adicionales
    const puntos = [
        [0, -132],
        [132, 0],
        [0, 132],
        [-132, 0],
        [93, -93],
        [93, 93],
        [-93, 93],
        [-93, -93]
    ];

    puntos.forEach(([x, y], i) => {
        destello(
            capas,
            `Reflejo luminoso ${i + 1}`,
            x,
            y,
            12,
            BLANCO,
            {
                escalaInicial: [0, 0],
                escalaFinal: [130, 130],
                opacidadInicial: 0,
                opacidadFinal: 100,
                inicio: i * 9,
                fin: Math.min(duracion, i * 9 + 65)
            }
        );
    });

    particulas(
        capas,
        22,
        PLATA_CLARA,
        145,
        185,
        0,
        duracion
    );

    anillo(
        capas,
        'Reflejo exterior luminoso',
        151,
        PLATA_CLARA,
        1.5,
        {
            opacidadInicial: 25,
            opacidadFinal: 70,
            escalaInicial: [98, 98],
            escalaFinal: [102, 102],
            inicio: 0,
            fin: duracion
        }
    );

    return crearDocumento(
        'Brillo metálico de acero',
        duracion,
        capas
    );
}

// ======================================================
// ESTRUCTURA JSON
// ======================================================

function crearDocumento(nombre, duracion, capas) {
    return {
        v: '5.7.4',
        fr: FPS,
        ip: 0,
        op: duracion,
        w: ANCHO,
        h: ALTO,
        nm: nombre,
        ddd: 0,
        assets: [],
        layers: capas,
        markers: []
    };
}

// ======================================================
// VALIDACIÓN Y GUARDADO
// ======================================================

function validarDocumento(nombre, documento) {
    if (
        !documento ||
        !Array.isArray(documento.layers) ||
        documento.w !== ANCHO ||
        documento.h !== ALTO ||
        documento.fr !== FPS ||
        documento.op <= documento.ip
    ) {
        throw new Error(
            `La animación ${nombre} tiene una estructura inválida.`
        );
    }

    for (const capa of documento.layers) {
        if (
            !capa.ks ||
            !Array.isArray(capa.shapes) ||
            !capa.ks.o ||
            !capa.ks.p ||
            !capa.ks.s
        ) {
            throw new Error(
                `La capa "${capa.nm}" de ${nombre} es inválida.`
            );
        }
    }
}

function guardarAnimacion(nombre, documento) {
    validarDocumento(nombre, documento);

    const ruta = path.join(
        CARPETA_SALIDA,
        `${nombre}.json`
    );

    fs.writeFileSync(
        ruta,
        JSON.stringify(documento, null, 2),
        'utf8'
    );

    console.log(
        `✓ ${nombre}.json generado correctamente (${documento.layers.length} capas)`
    );
}

// ======================================================
// GENERAR LAS CUATRO ANIMACIONES
// ======================================================

function generarTodasLasAnimaciones() {
    fs.mkdirSync(CARPETA_SALIDA, {
        recursive: true
    });

    identificadorCapa = 1;

    const animaciones = {
        'sol-carga': generarSolCarga(),
        'acero-a-sol': generarAceroASol(),
        'sol-a-acero': generarSolAAcero(),
        'acero-brillo': generarAceroBrillo()
    };

    console.log('\n========================================');
    console.log(' GENERADOR DE ANIMACIONES SIGECO-SOG');
    console.log('========================================\n');

    for (const [nombre, documento] of Object.entries(animaciones)) {
        guardarAnimacion(nombre, documento);
    }

    console.log('\n========================================');
    console.log(' Las cuatro animaciones fueron generadas.');
    console.log(` Carpeta: ${CARPETA_SALIDA}`);
    console.log('========================================\n');
}

try {
    generarTodasLasAnimaciones();
} catch (error) {
    console.error(
        '\nError al generar las animaciones:',
        error
    );

    process.exitCode = 1;
}
