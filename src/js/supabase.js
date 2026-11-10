
// Importa la herramienta que permite conectar JavaScript con Supabase.
import { createClient } from '@supabase/supabase-js';

// Obtiene la dirección del proyecto Supabase desde las variables de entorno.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// Obtiene la clave pública que permite acceder a Supabase desde la aplicación.
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Comprueba que existan los datos necesarios para realizar la conexión.
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan las variables de conexión de Supabase.');
}

// Crea y exporta la conexión para que los demás archivos puedan consultar la base de datos.
export const supabase = createClient(
    supabaseUrl,
    supabaseKey
);
