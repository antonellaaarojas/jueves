//Archivo principal de la aplicacion - configuracion de API REST 

//Aquí se definen los middleware principales, rutas y manejo de errores global.

// Arquitectura modular con rutas separadas por entidad (usuarios, pacientes, doctores, turnos)

// Manejo adecuado de errores y respuestas del servidor

//importacion de dependecias principales 
const express = require('express'); //framework web para nodejs
const bodyParser = require('body-parser'); //middleware para parsear json en las solicitudes

const authRoutes = require('./routes/authRoutes');           // Rutas de autenticación y usuarios
const patientRoutes = require('./routes/patientsRoutes');    // Rutas de pacientes
const doctorRoutes = require('./routes/doctorRoutes');       // Rutas de doctores
const appointmentRoutes = require('./routes/appointmentRoutes'); // Rutas de turnos


//importacion del manejador centralizado de errores HTTP 
const HttpError = require('./utils/errors/http-error');

// Creación e inicialización de la aplicación Express
const app = express();


/**
 * Middleware para procesar los cuerpos de las solicitudes
 * ------------------------------------------------------
 * Configura el middleware bodyParser para analizar automáticamente
 * los cuerpos de las solicitudes entrantes en formato JSON.
 * Esto permite acceder a req.body en los controladores.
*/

app.use(bodyParser.json());


//configuracion de rutas
app.use('/api/auth', authRoutes);          // Endpoints para autenticación y usuarios
app.use('/api/patients', patientRoutes);    // Endpoints para gestión de pacientes
app.use('/api/doctors', doctorRoutes);      // Endpoints para gestión de doctores
app.use('/api/appointment', appointmentRoutes); // Endpoints para gestión de turnos


/**
 * Middleware para manejo de rutas no encontradas
 * --------------------------------------------
 * Este middleware se ejecuta cuando ninguna de las rutas anteriores
 * coincide con la solicitud. Genera un error 404 (Not Found) que será
 * procesado por el middleware de manejo de errores global.
*/

app.use((req, res, next) => {  //Este middleware es un capturador universal para rutas que no existen en mi aplicación
    next(new HttpError('Ruta no encontrada', 404));
})

/**
 * Flujo de ejecución del middleware:
 * 
    Se activa cuando:
    Una solicitud HTTP llega a tu servidor pero no coincide con ninguna ruta definida anteriormente (ej: GET /ruta-inexistente).

    Crea un error HTTP 404:
    Usa tu clase HttpError para generar un error estandarizado con:

    Mensaje: "Ruta no encontrada"

    Código de estado: 404 (Not Found)

    Pasa el error al siguiente middleware:
    next() envía el error al manejador global de errores (que normalmente tienes definido después).


   ---- ¿Por qué es importante este middleware? -----

    Evita respuestas genéricas de Express:
    Sin él, Express respondería con un HTML de error poco útil para una API.

    Mejora la experiencia del cliente:
    Devuelve una respuesta JSON clara (ej: para frontends o apps móviles):


   ------ Detalles clave ------
    Debe ir al final de todas las rutas:
    Si lo pones antes de tus rutas, todas las solicitudes serán 404.

    Usa next() para delegar el error:
    No usa res.status(404).json() directamente porque:

    Permite que tu manejador global de errores procese TODOS los errores igual.

    Centraliza la lógica de formato de respuestas.

    Personalización avanzada:
    Puedes mejorar el mensaje con detalles:
*/




/**
 * Exportación de la aplicación configurada
 * -----------------------------------------
 * La aplicación se exporta para ser utilizada por el archivo server.js,
 * que se encarga de configurar el puerto y conectar a la base de datos MongoDB.
 */
module.exports = app;