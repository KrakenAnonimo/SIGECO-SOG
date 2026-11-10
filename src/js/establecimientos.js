
// Importa la conexión con Supabase para poder consultar la base de datos.
import { supabase } from './supabase.js';

// Consulta las categorías registradas en la base de datos y devuelve su información.
export async function obtenerCategorias() {
    const { data, error } = await supabase
        // Indica que la consulta se realiza sobre la tabla de categorías.
        .from('categorias')

        // Selecciona el identificador, nombre y descripción de cada categoría.
        .select('id, nombre, descripcion')

        // Organiza las categorías alfabéticamente por su nombre.
        .order('nombre');

    // Muestra el error en la consola si ocurre un problema durante la consulta.
    if (error) {
        console.error('Error al consultar categorías:', error.message);
        return [];
    }

    // Devuelve las categorías encontradas o una lista vacía si no hay datos.
    return data || [];
}

// Consulta los establecimientos activos y obtiene también el nombre de su categoría.
export async function obtenerEstablecimientos() {
    const { data, error } = await supabase
        // Indica que la consulta se realiza sobre la tabla de establecimientos.
        .from('establecimientos')

        // Selecciona los datos generales y la ubicación de cada establecimiento.
        // También obtiene el nombre de la categoría relacionada.
        .select(`
            id,
            nombre,
            descripcion,
            direccion,
            telefono,
            correo,
            latitud,
            longitud,
            categoria_id,
            categorias (
                nombre
            )
        `)

        // Muestra únicamente los establecimientos que se encuentran activos.
        .eq('estado', 'activo')

        // Organiza los establecimientos alfabéticamente por su nombre.
        .order('nombre');

    // Muestra el error en la consola si ocurre un problema durante la consulta.
    if (error) {
        console.error('Error al consultar establecimientos:', error.message);
        return [];
    }

    // Devuelve los establecimientos encontrados o una lista vacía si no hay datos.
    return data || [];
}
