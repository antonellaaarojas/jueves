const User = require('../models/user');              // Modelo de usuarios
const bcrypt = require('bcryptjs');                 // Biblioteca para cifrar contraseñas
const jwt = require('jsonwebtoken');                // Biblioteca para generar y verificar tokens JWT
const HttpError = require('../utils/errors/http-error'); // Clase para manejo de errores HTTP
const { validationResult } = require('express-validator'); // Validación de datos de entrada

// Servicio para envío de correos electrónicos (recuperación de contraseña)
const emailService = require('../utils/emails/emailService');


/**
 * Registra un nuevo usuario en el sistema (exclusivo para administradores)
 * ----------------------------------------------------------------------
 * Esta función permite crear nuevos usuarios con roles específicos.
 * Según la consigna, solo los administradores pueden registrar usuarios,
 * lo que se controla mediante middleware de autorización en las rutas.
*/

const register = async (req, res, next) => {
  // Validamos los datos de entrada usando express-validator
  // Si hay errores en los campos (formato email, contraseña débil, etc.)

   /*EN CRIOLLO  "Che, fijate si hay algún error en los datos que mandó el usuario. Si hay alguno, no sigas con lo que venías haciendo, y en vez de eso, tirá un error con el mensaje 'Datos inválidos' y el código 422 para que lo maneje el sistema de errores."*/ 

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Datos inválidos, revisá los campos.', 422));
  }

  // Extraemos la información necesaria del cuerpo de la petición
  const { nombre, email, password, rol } = req.body;

  // Verificamos si ya existe un usuario con el mismo email
  // para evitar duplicados (email es campo único)

  /* Buscá en la colección de usuarios (User) uno solo que tenga el email que recibimos en el formulario (req.body.email)". */

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) { 
    return next(new HttpError('Error al verificar el usuario.'));
  }

  // Si ya existe un usuario con ese email, respondemos con error
  if (existingUser) {
    return next(new HttpError('Ya existe un usuario con ese email.', 422));
  }

  // Creamos un nuevo documento de usuario
  // NOTA: La contraseña se cifrará automáticamente mediante
  // el middleware pre-save definido en el modelo User
  const createdUser = new User({
    nombre,
    email,
    password, // Será cifrada antes de guardar en la BD
    rol,      // admin o recepcion (según la consigna)
    tokens: [] // Array para almacenar tokens de sesión
  });

  try {
    // Guardamos el usuario en la base de datos
    await createdUser.save();

    // Respondemos con código 201 (Created) y los datos básicos del usuario
    // IMPORTANTE: No incluimos la contraseña en la respuesta por seguridad

    /* res.status(...) establece el código de estado HTTP de la respuesta.

    El 201 significa:
    👉 "Created" → algo fue creado correctamente (en este caso, un usuario).

    Es el código correcto según la convención HTTP cuando se crea un nuevo recurso.

    🔹 .json({...})
    .json() envía una respuesta en formato JSON, que es como normalmente se comunican las APIs.*/

    res.status(201).json({
      mensaje: 'Usuario registrado',
      usuario: {
        id: createdUser.id,
        nombre: createdUser.nombre,
        email: createdUser.email,
        rol: createdUser.rol
      }
    });

  } catch (err) {
    return next(new HttpError('Error al registrar el usuario.', 500));
  }
};

/**
 * Inicia sesión y genera un token JWT
 * ---------------------------------
 * Este endpoint autentica al usuario mediante email y contraseña,
 * y genera un token JWT que se utilizará para las solicitudes posteriores.
 * El token contiene información del usuario (ID, email, rol) para autorización.
*/

const login = async (req, res, next) => {
  // Validamos los datos de entrada (formato de email, contraseña, etc.)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Datos inválidos. Revisá tus credenciales.', 422));
  }

  // Extraemos email y contraseña del cuerpo de la petición
  const { email, password } = req.body;

  // Buscamos al usuario por su email en la base de datos
  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    return next(new HttpError('Error al buscar el usuario', 500));
  }

  // Si no existe usuario con ese email, respondemos con error
  // Usamos código 403 (Forbidden) para no dar pistas sobre qué campo es incorrecto
  if (!existingUser) {
    return next(new HttpError('Credenciales inválidas.', 403));
  }

  // Verificamos si la contraseña es correcta comparando con el hash almacenado
  // bcrypt.compare compara la contraseña plana con la contraseña cifrada

  let isValidPassword;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(new HttpError('Error al verificar credenciales', 500));
  }

  // Si la contraseña no coincide, respondemos con error
  if (!isValidPassword) {
    return next(new HttpError('Credenciales inválidas', 403));
  }

  // Si las credenciales son correctas, generamos un token JWT
  let token;
  try {
    // Creamos el token con la información del usuario
    // Esta información estará disponible en las solicitudes autenticadas
    token = jwt.sign(
      {
        userId: existingUser.id,  // ID del usuario para identificación
        email: existingUser.email, // Email para referencia
        rol: existingUser.rol      // Rol para autorización (admin/recepcion)
      },
      process.env.JWT_SECRET || 'secreto123', // Clave secreta para firmar el token
      { expiresIn: '1d' }                     // Tiempo de expiración: 1 día
    );

    // Respondemos con los datos del usuario y el token
    // Este token debe ser incluido en el header Authorization de las siguientes peticiones
    res.json({
      userId: existingUser.id,
      email: existingUser.email,
      rol: existingUser.rol,
      token
    });
  } catch (err) {
    return next(new HttpError('Error al generar token.', 500));
  }
};

/**
 * Inicia el proceso de recuperación de contraseña
 * ----------------------------------------------
 * Esta función implementa el primer paso del proceso de recuperación:
 * 1. Verifica que el usuario existe
 * 2. Genera un token especial de recuperación 
 * 3. Envía un email con un enlace que contiene el token
 * 
 * La consigna solicita específicamente un "enlace único y seguro, enviado por correo"
*/
const forgotPassword = async (req, res, next) => {
  // Obtenemos el email del usuario que quiere recuperar su contraseña
  const { email } = req.body;
  
  // Buscamos al usuario por su email y verificamos que esté activo
  let user;
  try {
    user = await User.findOne({ email, activo: true });
  } catch (err) {
    return next(new HttpError('Error al buscar usuario', 500));
  }

  // Si no encontramos un usuario activo con ese email, respondemos con error
  if (!user) {
    return next(new HttpError('No existe usuario con ese email', 404));
  }

  // Generamos un token JWT especial para recuperación de contraseña
  // Este token tiene una duración limitada (1 hora) por seguridad
  let token;
  try {
    token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        action: 'password-reset' // Propósito específico del token 
      },
      process.env.JWT_SECRET || 'secreto123',
      { expiresIn: '1h' } // Tiempo de expiración: 1 hora
    );
  } catch (err) {
    return next(new HttpError('Error al generar el token de recuperación', 500));
  }
  
  // Guardamos el token en el usuario para poder validarlo después
  // y asegurarnos que solo se use una vez
  user.resetPasswordToken = token;

  try {
    // Guardamos el usuario actualizado con el token
    await user.save();
    
    // Enviamos un correo electrónico con las instrucciones y el enlace
    // El enlace contendrá el token para validar la solicitud
    await emailService.enviarEmailRecuperacion(
      user.email,
      user.nombre,
      token,
      req.get('host'),  // Dominio del servidor
      req.protocol      // Protocolo (http/https)
    );

    // Respondemos sin dar detalles específicos (seguridad)
    res.json({ mensaje: 'Se ha enviado un correo con instrucciones para recuperar tu contraseña' });
  } catch (err) {
    // Si hay error al enviar el correo, limpiamos el token para evitar problemas
    user.resetPasswordToken = undefined;
    await user.save();

    return next(new HttpError('Error al enviar correo de recuperación', 500));
  }
};

/**
 * Verifica la validez del token de restablecimiento de contraseña
 * -------------------------------------------------------------
 * Este paso intermedio verifica si un token de recuperación es válido.
 * Se usa cuando el usuario hace clic en el enlace de recuperación
 * enviado a su correo electrónico, antes de mostrar el formulario
 * donde ingresará su nueva contraseña.
 */
const verifyResetToken = async (req, res, next) => {
  // Obtenemos el token de los parámetros de la URL
  const { token } = req.params;
  try {
    // Verificamos si el token JWT es válido y no ha expirado
    // jwt.verify desencripta el token y extrae su contenido
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'secreto123');
    
    // Comprobamos que el token es específicamente para reseteo de contraseña
    // Esto evita que se use un token normal de autenticación para este propósito
    if (!decodedToken || decodedToken.action !== 'password-reset') {
      return next(new HttpError('Token inválido', 400));
    }
    
    // Verificamos que el usuario existe y tiene este token asignado
    // y que además está activo en el sistema
    const user = await User.findOne({
      _id: decodedToken.userId,
      resetPasswordToken: token, // El token debe coincidir exactamente con el almacenado
      activo: true               // Usuario debe estar activo
    });

    // Si no encontramos un usuario que cumpla todas las condiciones
    if (!user) {
      return next(new HttpError('Token inválido o usuario no encontrado', 400));
    }

    // Si el token es válido, respondemos con éxito
    // Esto permitirá mostrar el formulario para ingresar la nueva contraseña
    res.json({ mensaje: 'Token válido', userId: user._id });
  } catch (err) {
    // Si el token está expirado o es inválido, jwt.verify lanzará una excepción
    return next(new HttpError('Token inválido o expirado', 400));
  }
};

/**
 * Restablece la contraseña del usuario usando el token
 * --------------------------------------------------
 * Este es el paso final del proceso de recuperación de contraseña.
 * Recibe el token y la nueva contraseña, verifica que todo sea válido,
 * y actualiza la contraseña del usuario en la base de datos.
 */
const resetPassword = async (req, res, next) => {
  // Validamos los datos de entrada (requisitos de contraseña)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Datos inválidos, revisá los campos', 422));
  }

  // Obtenemos el token y la nueva contraseña
  const { token } = req.params;
  const { password } = req.body;
  
  try {
    // Verificamos que el token sea válido y no haya expirado
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'secreto123');
    
    // Comprobamos que el token es específicamente para reseteo de contraseña
    if (!decodedToken || decodedToken.action !== 'password-reset') {
      return next(new HttpError('Token inválido', 400));
    }
    
    // Buscamos al usuario por ID, token y estado activo
    // Requerimos que el resetPasswordToken coincida exactamente
    // para evitar ataques de adivinación
    const user = await User.findOne({
      _id: decodedToken.userId,
      resetPasswordToken: token,
      activo: true
    });

    // Si no encontramos un usuario que cumpla todas las condiciones
    if (!user) {
      return next(new HttpError('Token inválido o usuario no encontrado', 400));
    }

    // Actualizamos la contraseña y eliminamos el token de recuperación
    // NOTA: La contraseña se cifrará automáticamente mediante el middleware
    // pre-save definido en el modelo User antes de guardarse en la BD
    user.password = password;         // Nueva contraseña (será cifrada)
    user.resetPasswordToken = undefined; // Invalidamos el token para que no se use nuevamente

    // Guardamos los cambios en la base de datos
    await user.save();

    // Respondemos con mensaje de éxito
    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    // Si el token está expirado o es inválido, jwt.verify lanzará una excepción
    return next(new HttpError('Token inválido o expirado. Error: ' + err.message, 400));
  }
};

/**
 * Exportación de los controladores de autenticación
 * ------------------------------------------------
 * Todas estas funciones implementan los requisitos de la consigna:
 * - Sistema de autenticación con JWT
 * - Manejo seguro de contraseñas con bcrypt (en el modelo User)
 * - Recuperación de contraseña con enlace único enviado por correo
 */
module.exports = { 
  register,          // Registrar nuevo usuario (solo admin)
  login,             // Iniciar sesión y generar JWT
  forgotPassword,    // Solicitar recuperación de contraseña
  verifyResetToken,  // Verificar validez del token de recuperación
  resetPassword      // Cambiar contraseña con token
};