// Importa la conexión con Supabase para poder consultar la base de datos.
import { supabase } from "./supabase.js";

// Consulta las categorías registradas en la base de datos.
export async function obtenerCategorias() {
  const { data, error } = await supabase
    .from("categorias")
    .select("id, nombre, descripcion")
    .order("nombre");

  if (error) {
    console.error("Error al consultar categorías:", error.message);
    return [];
  }

  return data || [];
}

// Consulta los establecimientos activos junto con sus imágenes y catálogo.
export async function obtenerEstablecimientos() {
  const { data, error } = await supabase
    .from("establecimientos")
    .select(
      `
            id,
            nombre,
            descripcion,
            direccion,
            telefono,
            correo,
            latitud,
            longitud,
            categoria_id,
            mensaje_imagen,
            imagen_path,
            horario_atencion,



            categorias (
                nombre
            ),

            imagenes_establecimiento (
                id,
                tipo,
                ruta_archivo,
                texto_alternativo,
                orden
            ),

            productos (
                id,
                nombre,
                descripcion,
                precio,
                imagen_url,
                estado
            )
        `,
    )
    .eq("estado", "activo")
    .order("nombre");

  if (error) {
    console.error("Error al consultar establecimientos:", error.message);
    return [];
  }

  // Organiza las imágenes y los productos de cada establecimiento.
  const establecimientos = (data || []).map((establecimiento) => {
    const imagenes = establecimiento.imagenes_establecimiento || [];

    const productos = establecimiento.productos || [];

    return {
      ...establecimiento,

      // Ordena las imágenes según el orden establecido.
      imagenes_establecimiento: imagenes.sort(
        (a, b) => (a.orden || 0) - (b.orden || 0),
      ),

      // Conserva únicamente los productos activos.
      productos: productos.filter((producto) => producto.estado === "activo"),
    };
  });

  return establecimientos;
}

// Obtiene la URL pública de una imagen almacenada en Supabase Storage.
export function obtenerUrlImagen(rutaArchivo) {
  if (!rutaArchivo) {
    return null;
  }

  const { data } = supabase.storage
    .from("sigeco-imagenes")
    .getPublicUrl(rutaArchivo);

  return data?.publicUrl || null;
}
