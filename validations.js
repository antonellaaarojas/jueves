/**
 * Módulo de Validaciones
 * =====================
 * 
 * Este módulo centraliza todas las validaciones de datos utilizadas en la aplicación.
 * Utiliza express-validator para definir reglas de validación para cada tipo de entidad
 * (usuarios, pacientes, doctores, turnos) que se aplican antes de procesar las solicitudes.
 * 
 * Las validaciones ayudan a:
 * 1. Garantizar la integridad de los datos
 * 2. Prevenir entradas maliciosas o incorrectas
 * 3. Proporcionar mensajes de error claros y descriptivos
 * 4. Evitar la duplicación de código de validación en los controladores
*/


// Importa el método body de express-validator para validar el cuerpo de las solicitudes
const { body } = require('express-validator');


// Importa los modelos necesarios para validaciones personalizadas que requieren consultas a la BD
const Paciente = require('../../models/patient');
const Doctor = require('../../models/doctor');

/* /**
 * Validaciones para usuarios
 * ------------------------
 * Valida los campos requeridos al crear o actualizar un usuario:
 * - Email con formato válido
 * - Contraseña con longitud mínima
 * - Nombre no vacío
 * - Rol dentro de los valores permitidos
*/ 

const userValidator = [  // Valida que el email tenga un formato válido
    body('email').isEmail().whithMessage('Email invalido'), //body('email'): Toma el valor de req.body.email.
    body('password').isLength({min: 6}).whithMessage('Min 6 caracteres'),
    // Valida que el nombre no esté vacío
  body('nombre').not().isEmpty().withMessage('Nombre requerido'),
  
  // Valida que el rol sea uno de los permitidos: admin o recepcion
  body('rol').isIn(['admin', 'recepcion']).withMessage('Rol invalido')
]

/**
 * Validaciones para inicio de sesión
 * --------------------------------
 * Valida los campos necesarios para el login de usuarios:
 * - Email con formato válido
 * - Contraseña no vacía
*/

const loginValidator = [
  // Valida que el email tenga un formato válido
  body('email')
    .isEmail()
    .withMessage('Ingresa un email valido'),
  
  // Valida que la contraseña no esté vacía 
  /* “Tomá el campo password del cuerpo de la petición. Verificá que NO esté vacío. Si está vacío, devolvé un error con el mensaje 'La contraseña es obligatoria'.” tambien se podria haber usado .notEmpty() */

  body('password')
    .not()
    .isEmpty()
    .withMessage('La contraseña es obligatoria')
];

/**
 * Validación para email
 * --------------------
 * Utilizada en operaciones como recuperación de contraseña
 * donde solo se necesita validar el email
*/

const emailValidator = [
  // Normaliza y valida el formato del email
  body('email')
    .normalizeEmail() // Normaliza el email (elimina espacios, convierte a minúsculas)
    .isEmail()        // Verifica que sea un formato de email válido
    .withMessage('Debes ingresar un email valido')
];


/**
 * Validación para cambio de contraseña
 * -----------------------------------
 * Valida que la nueva contraseña cumpla con los requisitos mínimos de seguridad
*/

const passwordValidator = [
  // Valida que la contraseña tenga al menos 6 caracteres
  body('password')
    .isLength({min: 6})
    .withMessage('La contraseña debe tener al menos 6 caracteres')
];


/*
 * Validaciones para pacientes
 * ------------------------
 * Valida los campos requeridos al crear o actualizar un paciente:
 * - Nombre y apellido no vacíos
 * - DNI válido (numérico con longitud mínima)
 * - Email con formato correcto
 * - Información de cobertura médica
*/

const patientValidator = [
  // Valida que el nombre no esté vacío
  body('nombre')
    .trim()      // Elimina espacios al inicio y final
    .notEmpty()  // Verifica que no esté vacío
    .withMessage('El nombre es obligatorio'),
  
  // Valida que el apellido no esté vacío
  body('apellido')
    .trim()
    .notEmpty()
    .withMessage('El apellido es obligatorio'),
  
  // Validación compleja del DNI: no vacío, numérico y con longitud mínima
  body('dni')
    .trim()
    .notEmpty().withMessage('El DNI es obligatorio')
    .isInt().withMessage('El DNI debe ser un numero')
    .isLength({ min: 7 }).withMessage('El DNI debe tener al menos 7 digitos'),
  
  // Valida formato de email
  body('email')
    .trim()
    .normalizeEmail()  // Normaliza el formato del email
    .isEmail()         // Verifica que sea un formato válido
    .withMessage('Debe ser un email valido'),
  
  // Valida que la cobertura médica tenga un nombre
  body('coberturaMedica.nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre de la cobertura medica es obligatorio')
]

/**
 * Validaciones para doctores
 * -----------------------
 * Valida los campos requeridos al crear o actualizar un doctor:
 * - Nombre y apellido no vacíos
 * - Especialidad y matrícula obligatorias
 * - Campo activo opcional pero debe ser booleano
*/

const doctorValidator = [
  // Valida que el nombre no esté vacío
  body('nombre')
    .trim() //“Antes de validar que esto sea un email, sacá los espacios de sobra al principio y al final.”
    .notEmpty()
    .withMessage('El nombre es obligatorio'),
  
  // Valida que el apellido no esté vacío
  body('apellido')
    .trim()
    .notEmpty()
    .withMessage('El apellido es obligatorio'),
  
  // Valida que la especialidad no esté vacía
  body('especialidad')
    .trim()
    .notEmpty()
    .withMessage('La especialidad es obligatoria'),
  
  // Valida que la matrícula no esté vacía
  body('matricula')
    .trim()
    .notEmpty()
    .withMessage('La matrícula es obligatoria'),
  
  // Valida que el campo activo sea booleano (opcional)
  body('activo')
    .optional()   // El campo es opcional (puede no estar presente)
    .isBoolean().withMessage('El campo activo debe ser true o false')
    .toBoolean()  // Convierte el valor a booleano
];


/**
 * Validaciones para turnos (citas médicas)
 * --------------------------------------
 * Validaciones complejas que incluyen:
 * - Referencias a pacientes y doctores existentes (validación contra la BD)
 * - Validación de fecha y hora (formato y lógica de negocio)
 * - Validación de estado dentro de valores permitidos
*/

const turnoValidator = [
  /**
   * Validación del paciente
   * - Verifica que se proporcione un ID de paciente
   * - Consulta la base de datos para confirmar que existe
   */

  body('paciente')
    .notEmpty().withMessage('El ID del paciente es obligatorio.')

    // Validación personalizada para verificar que el paciente existe en la BD
    .custom(async (id) => {  //async (id) significa que vas a recibir el valor del campo paciente (el ID) y que puedo usar await dentro.

      const existePaciente = await Paciente.findById(id); //await Paciente.findById(id) intenta buscar ese ID en la base de datos.


      if (!existePaciente) { // Si no lo encuentra, lanza un error
        throw new Error('ID de paciente inválido.');
      }

      /* Con este código estás evitando crear turnos para pacientes que no existen, lo cual es una excelente validación de integridad. */
    }),

  /**
   * Validación del doctor
   * - Verifica que se proporcione un ID de doctor
   * - Consulta la base de datos para confirmar que existe
   */
  body('doctor')
    .notEmpty().withMessage('El ID del doctor es obligatorio.')
    // Validación personalizada para verificar que el doctor existe en la BD

    .custom(async (id) => { // Cuando uso una validación asíncrona con .custom(), Express Validator espera que lances errores con throw o devuelvas una Promise rechazada si la validación falla. Y eso es justo lo que hace este código:

      const existeDoctor = await Doctor.findById(id);
      if (!existeDoctor) {
        throw new Error('ID de doctor inválido.');
      }

        /** ¿Por qué no necesita try-catch?
        Porque Express Validator maneja internamente los errores que ocurran dentro del .custom(). Si hay un error como:

        Paciente.findById falla por una mala conexión

        Se lanza un throw new Error(...)

        O incluso una Promise se rechaza

        Express Validator lo captura automáticamente y lo procesa como parte de su flujo de validación. */
    }),



  /** -----------------------------------------------------
   * Validación de la fecha
   * - Verifica que la fecha no esté vacía
   * - Verifica que la combinación de fecha y hora sea válida
   * - Verifica que la fecha y hora sean futuras (no se pueden programar turnos en el pasado)
   */

  body('fecha') //Se refiere al campo "fecha" que viene en el cuerpo del request

    .notEmpty().withMessage('La fecha es obligatoria.')

    // Validación personalizada para lógica compleja de fechas

    .custom(async (fecha, { req }) => { /* Es la función de validación personalizada que se le pasa a .custom(), y express-validator le da dos argumentos automáticamente:

        El valor del campo que estás validando, en este caso "fecha".

        Un objeto con más información, como req (el request completo).
        */

        /** { req }	Es un objeto que contiene req, y lo estás desestructurando directamente

                    Es como escribir:

                    (fecha, context) => {
                    const req = context.req;
                    ...
                    }
                    Pero más corto.
 */

      // La hora es necesaria para validar la fecha completa

      //Verifica que en el body venga también la propiedad hora.
      if (!req.body.hora) throw new Error('La hora es obligatoria para validar la fecha completa.');
      
      // Combina fecha y hora en un objeto Date
      const fechaHora = new Date(`${fecha}T${req.body.hora}`); //Combina el valor de fecha con la hora para crear un objeto Date 

      const ahora = new Date();  //Guarda la fecha y hora actual del momento en que se ejecuta esta validación.

      // Verifica que la fecha y hora sean válidas

      /* isNaN es una función global de JavaScript que significa "is Not a Number" (no es un número).
      Sirve para verificar si un valor NO es un número válido. */

      /* Esto verifica si la fecha no es válida.

        Si fechaHora no es una fecha válida, entonces .getTime() devuelve NaN (no es un número).

        Por eso con isNaN() confirmamos si la fecha es inválida.

        Si es inválida, se lanza un error con el mensaje "Formato de fecha u hora inválido." */

      if (isNaN(fechaHora.getTime())) {
        throw new Error('Formato de fecha u hora inválido.');
      }


      // Verifica que la fecha y hora sean futuras
      if (fechaHora <= ahora) {
        throw new Error('El turno debe ser programado en el futuro.');
      }
    }),



  /**
   * Validación de la hora
   * - Verifica que la hora tenga un formato válido (HH:MM)
   * usando expresión regular para validar el formato 24 horas
   */
  
  body('hora')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('La hora debe tener un formato válido (HH:MM).'),
  
  /**
   * Validación del estado del turno
   * - Campo opcional
   * - Si está presente, debe ser uno de los estados válidos
   */
  body('estado')
    .optional()
    .isIn(['pendiente', 'confirmado', 'cancelado', 'completado'])
    .withMessage('Estado inválido. Debe ser "pendiente", "confirmado", "cancelado" o "completado".')
];
