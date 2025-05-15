/**
 * Configuración de conexión a MongoDB - Usando Mongoose
 * ====================================================
 * Este módulo maneja la conexión con la base de datos MongoDB usando
 * Mongoose, una biblioteca de modelado de objetos para MongoDB y Node.js.
 * 
 * La conexión se configura utilizando una URL desde las variables de entorno,
 * siguiendo las mejores prácticas de seguridad y configuración.
*/

// Importa la biblioteca Mongoose para manejar la conexión y modelado de MongoDB
const mongoose = require('mongoose');


/**
 * Función asíncrona para establecer conexión con MongoDB
 
 * Esta función:
 * 1. Intenta conectar a MongoDB usando la URL proporcionada en las variables de entorno
 * 2. Maneja errores de conexión de forma adecuada
 * 3. Termina el proceso con código de error si no puede conectar
 *
 * En un entorno de producción, se podría mejorar con reintentos de conexión
 * y más opciones de configuración como tiempos de espera o pool size.
*/

const connectDB = async () => {
    try {
      // Establece la conexión con MongoDB usando la URL desde variables de entorno

      await mongoose.connect(process.env.MONGODB_URL);

      // La función devuelve la promesa resuelta si la conexión es exitosa

    }catch (err) {

      // Manejo de errores de conexión
      console.error('MongoDB connection error:', err);


      process.exit(1);  //Si falla, mostramos el error y detenemos la app inmediatamente con process.exit(1).

      /*📌 ¿Por qué detener la app?
      Porque si no te pudiste conectar a la base de datos, no tiene sentido que siga funcionando el servidor. No podrías hacer login, guardar pacientes, nada. */



      /*  
        Ocurre un error al conectar con MongoDB.

        Se muestra el error en consola para debugging.
        
        Se fuerza la salida con process.exit(1).
        Consecuencias:

        Ningún otro código se ejecuta después.

        Si usas PM2/docker/kubernetes, estos sistemas sabrán que la app falló.
      */
    }
}
