/**
 * Middleware de Autenticación y Control de Acceso
 * ===============================================
 * Este módulo implementa dos middleware cruciales para la seguridad:
 * 
 * 1. Autenticación basada en JWT (JSON Web Tokens)
 * 2. Control de acceso basado en roles (RBAC)
 *
 * Estos middleware pueden encadenarse para proteger rutas que requieren:
 * - Autenticación general (cualquier usuario autenticado)
 * - Autorización específica (usuarios con roles particulares)
*/

// Importa la biblioteca jsonwebtoken para verificar tokens JWT
const jwt = require('jsonwebtoken');

// Importa el modelo de usuario y el manejador de errores HTTP personalizado
const User = require('../models/user');
const HttpError = require('../utils/errors/http-error');


/**
 * Middleware de autenticación basado en JWT
 * ------------------------------------------
 * Verifica que el usuario esté autenticado correctamente mediante un token JWT válido.
 * Este middleware debe usarse en todas las rutas que requieran un usuario autenticado.
*/

/**
 * Middleware de autenticación
  Proceso de autenticación:

 * 1. Extrae el token JWT del encabezado Authorization
 * 2. Verifica la validez del token con la clave secreta
 * 3. Busca el usuario en la base de datos usando el ID del token
 * 4. Verifica que el usuario esté activo
 * 5. Adjunta el usuario y token al objeto de solicitud para uso posterior
*/

const auth = async (req, res, next) => {
    try {
        /* “Che, fijate si el cliente mandó un header de autorización. Si no lo mandó, no puedo autenticar a nadie. Tiro error.” */

        /* 🧠 ¿Qué es req.headers.authorization?
            Es un encabezado HTTP que normalmente viene así:
            Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
            Ese Bearer + token es lo que se necesita para saber quién sos. */

        if(!req.headers.authorization) { //verifica que el encabezado authorizacion exista
            throw new Error("Falta token de autorizacion");
        }

        //extrae el token del encabezado(quita el prefijo 'bearer')
        const token = req.headers.authorization.replace('Bearer ', '');

        //verifica y decodifica el token usando la clave secreta 
        // si el token no es valido o ha expirado lanzará una excepcion

        /* “Usando la clave secreta, verificá que el token sea válido (no trucho ni vencido), y leé la info que tiene adentro (por ejemplo, el ID del usuario).” */

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto123')


        //“Buscá en la base de datos un usuario que tenga ese ID que venía en el token, y que esté activo.”
        // solo considera usuarios activos 

        const user = await User.findOne({
            _id: decoded.userId,  /* Qué hace:

                        Verifica que el token esté firmado correctamente (no alterado).

                        Comprueba que no haya expirado.

                        Decodifica el payload (datos dentro del token).

                        Clave secreta: Usa process.env.JWT_SECRET o un valor por defecto (solo para desarrollo). */
            activo: true  /* Qué hace: Busca un usuario con:

                                _id: Coincide con el userId del token.

                                activo: true: Solo usuarios no desactivados.

                                Importante: Si el usuario fue eliminado o desactivado, no se encontrará. */
        });

        // si no encuentra el usuario lanza una excepcion /*  */
        if(!user) {
            throw new Error("Usuario no encontrado o inactivo")
        }

        // adjunta el token y el usuario al objeto de solicitud 
        // para que esten disponibles en los siguientes middlewares y controladores

        req.token = token;
        req.user = user;

        // pasa al siguiente middleware o controlador
        next()
    } catch(error) {
        // si ocurre cualquier error durante la autenticacion, envia una respuesta de error 401(no autorizado)
        next(new HttpError('Por favor autenticate correctamente', 401));
    }
}

// Middleware para verificacion de roles 

// Este mdwl debe usarse DESPUES del de autenticacion
/**Implementa un sistema de control de acceso basado en roles donde:
 * - Cada usuario tiene asignado un rol (admin, recepcionista, etc.)
 * - Cada ruta puede requerir uno o más roles específicos para acceder
 *  
*/


const checkRole = (roles) => {
    // // Retorna un middleware que tiene acceso a los roles permitidos mediante closure
    /* Un closure es una función que "recuerda" variables de su contexto padre, incluso después de que ese contexto haya terminado. */
    /* Qué hace:
        Es una función que recibe un array de roles permitidos (ej: ['admin', 'recepcion']).
        Retorna: Otro middleware personalizado. */

        /* Qué hace:
        Retorna una función (el middleware real) que:
        Recibe req, res, next (como cualquier middleware de Express).
        Recuerda el parámetro roles gracias al closure. */

        /*b. Código Reutilizable, No necesitas escribir un middleware diferente para cada rol.
        checkRole es una fábrica de middlewares. */
        
     return (req, res, next) => {

        /*verifico que exista un usuario adjunto a la solicitud ASUMIENDO que el middleware de autenticacion
        se haya ejecutado antes*/

        if(!req.user) {
            return next(new HttpError('No tienes permiso para esto', 403))
        }

        // verifica  si el rol del usuario está incluido en los roles permitidos
        if(!roles.includes(req.user.rol)) {
            return next(new HttpError('No tienes permiso para acceder a este recuerso', 403))
        }

        // Si el usuario tiene un rol autorizado, permite continuar
        next();
    }
}

/**
 * Exporta los middleware de autenticación y control de acceso
 * para ser utilizados en la configuración de rutas
 */
module.exports = { auth, checkRole };