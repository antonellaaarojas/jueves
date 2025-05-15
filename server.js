/**
 * Archivo de inicialización del servidor - Punto de entrada de la aplicación
 * ===================================================================
 * Este archivo es responsable de:
 * 1. Cargar variables de entorno desde el archivo .env
 * 2. Inicializar la conexión a la base de datos MongoDB
 * 3. Iniciar el servidor HTTP en el puerto especificado
 *
 * El patrón de diseño seguido separa la configuración de Express (en app.js)
 * de la inicialización del servidor, siguiendo buenas prácticas de modularidad.
*/

// Carga las variables de entorno desde el archivo .env
require('dotenv').config();

// Importa la aplicación Express configurada en app.js
const app = require('./app');


// Importa la función para conectar a MongoDB
const connectDB = require('./db/mongoose'); 


/**
 * Configuración del puerto para el servidor
 * -----------------------------------------
 * Usa el puerto definido en las variables de entorno (.env)
 * o el puerto 3000 como valor predeterminado si no está definido
 */
const PORT = process.env.PORT || 3000;

/**
 * Inicialización de la conexión a MongoDB y del servidor HTTP
 * ----------------------------------------------------------
 * Sigue un patrón asíncrono donde:
 * 1. Primero se establece la conexión con MongoDB
 * 2. Una vez conectado, se inicia el servidor HTTP
 * 3. Si hay errores en la conexión, se manejan adecuadamente
 *
 * Este enfoque garantiza que el servidor solo inicie si la conexión
 * a la base de datos se establece correctamente.
*/


connectDB().then(() => {
    console.log('Conexion a mongo exitosa'); 

    //inicia el servidor http en el puerto configurado 

    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}).catch(err => {
    // Manejo de errores en la conexión a MongoDB

    console.error('Error al conectar a la base de datos:', err);
    
    // No se inicia el servidor si hay problemas con la base de datos
} )
