/**
 * Rutas de Autenticación y Gestión de Usuarios
 * =============================================
 * 
 * Este módulo define todas las rutas relacionadas con la autenticación
 * y gestión de usuarios en la aplicación, incluyendo:
 * 
 * - Registro de nuevos usuarios (acceso restringido a administradores)
 * - Inicio de sesión
 * - Recuperación de contraseña
 * - Verificación de tokens
 * 
 * Las rutas están protegidas mediante middleware de autenticación
 * y control de acceso basado en roles cuando es necesario.
 */

// Importa Express y crea un enrutador
const express = require('express');
const router = express.Router();

// Importa los controladores de autenticación necesarios
const { 
  register,           // Registro de nuevos usuarios
  login,              // Inicio de sesión
  forgotPassword,     // Solicitud de recuperación de contraseña
  verifyResetToken,   // Verificación de token de recuperación
  resetPassword       // Restablecimiento de contraseña
} = require('../controllers/authController');

// Importa los validadores para las solicitudes
const { 
  userValidator,      // Validación para creación de usuarios
  loginValidator,     // Validación para inicio de sesión
  passwordValidator,  // Validación para cambio de contraseña
  emailValidator      // Validación para email
} = require('../utils/validators/validations');

// Importa los middleware de autenticación y control de acceso
const { 
  auth,               // Middleware de autenticación general
  checkRole           // Middleware de verificación de roles
} = require('../middleware/auth'); 



/**
 * Rutas Públicas - No requieren autenticación
 * ------------------------------------------
 * Estas rutas son accesibles para cualquier usuario sin necesidad
 * de estar autenticado o tener un token válido.
 */

/**
 * Ruta: POST /api/auth/login
 * ---------------------------
 * Permite a los usuarios iniciar sesión con sus credenciales.
 */
router.post('/login', loginValidator, login);

/**
 * Rutas para Recuperación de Contraseña
 * -------------------------------------
 */

/**
 * Ruta: POST /api/auth/forgot-password
 * ------------------------------------
 * Inicia el proceso de recuperación de contraseña enviando
 * un correo electrónico con un token de restablecimiento.
 */
router.post('/forgot-password', emailValidator, forgotPassword);

/**
 * Ruta: GET /api/auth/reset-password/:token
 * ----------------------------------------
 * Verifica si el token de restablecimiento es válido.
 */
router.get('/reset-password/:token', verifyResetToken);

/**
 * Ruta: POST /api/auth/reset-password/:token
 * -----------------------------------------
 * Permite al usuario establecer una nueva contraseña.o
 */
router.post('/reset-password/:token', passwordValidator, resetPassword);


/**
 * Rutas Protegidas - Solo para Administradores
 * ------------------------------------------
 * Estas rutas requieren autenticación y el rol de administrador.
 * Están protegidas por dos niveles de middleware:
 * 1. auth - Verifica que el usuario esté autenticado
 * 2. checkRole - Verifica que el usuario tenga rol de administrador
 */

/**
 * Ruta: POST /api/auth/register
 * -----------------------------
 * Permite a los administradores registrar nuevos usuarios en el sistema.
 * Esta es una operación restringida que solo pueden realizar administradores.
 *   - nombre: Nombre del nuevo usuario
 *   - email: Email del nuevo usuario
 *   - password: Contraseña del nuevo usuario
 *   - rol: Rol del nuevo usuario ('admin' o 'recepcion')
*/

router.post('/register', auth, checkRole(['admin']), userValidator, register);

/**
 * Rutas adicionales para gestión de usuarios (comentadas)
 * ------------------------------------------------------
 * Estas rutas están actualmente comentadas pero muestran la estructura
 * para futuras funcionalidades de gestión de usuarios por parte de administradores.
 */
/*
// Listar todos los usuarios (solo administradores)
router.get('/users', auth, checkRole(['admin']), getAllUsers);

// Obtener detalles de un usuario específico (solo administradores)
router.get('/users/:userId', auth, checkRole(['admin']), getUserById);

// Actualizar información de un usuario (solo administradores)
router.put('/users/:userId', auth, checkRole(['admin']), updateUser);

// Desactivar un usuario (solo administradores)
router.patch('/users/:userId/deactivate', auth, checkRole(['admin']), deactivateUser);
*/



/**
 * Exporta el enrutador configurado para ser montado en la aplicación principal
 * en la ruta base '/api/auth' (definida en app.js)
 */
module.exports = router;
