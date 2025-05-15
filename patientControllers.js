/**
 * Controlador de Pacientes - Gestión de pacientes para la Clínica Vortex
 * ==============================================================
 * Este controlador maneja todas las operaciones relacionadas con los pacientes:
 * - Listar pacientes con filtros de nombre, DNI y cobertura médica
 * - Mostrar detalles de un paciente específico
 * - Agregar nuevos pacientes al sistema
 * - Actualizar información de pacientes
 * - Eliminar pacientes
 * 
 * Requisitos de la consigna: "Listar todos los pacientes (filtros obligatorio por: 
 * nombre, DNI, cobertura médica)"
*/

// Importación de dependencias y modelos necesarios
const Patient = require('../models/patient');         // Modelo de pacientes
const HttpError = require('../utils/errors/http-error'); // Manejo de errores HTTP
const { validationResult } = require('express-validator'); // Validación de datos de entrada

/**
 * Listar todos los pacientes con filtros y paginación
 * ------------------------------------------------
 * Esta función implementa el endpoint para "Listar todos los pacientes"
 * de la consigna, incluyendo los filtros obligatorios por: nombre, DNI y 
 * cobertura médica. También aplica paginación para manejar grandes 
 * volúmenes de datos de manera eficiente.
*/

const getAllPatients = async(req, res, next) => {
    // Extraemos los parámetros de consulta de la URL
    // Por ejemplo: /api/pacientes?dni=12345678&page=2
    const { nombre, dni, coberturaMedica, page = 1, limit = 10 } = req.query;
    
    // Convertimos los parámetros de paginación a números enteros
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // Validamos que los parámetros de paginación sean válidos
    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber <= 0 || limitNumber <= 0) {
        return next(new HttpError('Parámetros de paginación inválidos', 400));
    }

    // Construimos el objeto de filtro para la consulta a MongoDB
    const filter = {};
    
    // Filtro por nombre o apellido (búsqueda flexible)
    // NOTA: El mismo campo de búsqueda se usa para nombre o apellido
    // para mayor comodidad del usuario

    if (nombre) {
        filter.$or = [
            { nombre: new RegExp(nombre.trim(), 'i') },  // 'i' = case insensitive
            { apellido: new RegExp(nombre.trim(), 'i') } // Busca en ambos campos
        ];

        /* REGEXP es un constructor de expresiones regulares en JavaScript. Se utiliza para crear patrones de búsqueda que permiten hacer coincidencias flexibles con cadenas de texto
        nombre.trim() elimina los espacios en blanco al principio y final del string que ingresó el usuario.
        'i' es una flag (bandera) que significa "case-insensitive", es decir, no distingue entre mayúsculas y minúsculas. */
    }
    
    // Filtro por DNI (búsqueda exacta)
    if (dni) filter.dni = dni;
    
    // Filtro por cobertura médica (búsqueda flexible)
    if (coberturaMedica) {
        // Usamos una expresión regular para buscar coincidencias parciales
        filter.coberturaMedica = new RegExp(coberturaMedica.trim(), 'i');
    }

    try {
        // Contamos el total de pacientes que coinciden con el filtro para la paginación
        const totalPatients = await Patient.countDocuments(filter);
        
        // Obtenemos los pacientes aplicando filtros, ordenación y paginación
        const patients = await Patient.find(filter)
            .sort({ apellido: 1, nombre: 1 })       // Ordenamos alfabéticamente
            .skip((pageNumber - 1) * limitNumber)   // Paginación: saltamos registros previos
            .limit(limitNumber);                    // Limitamos cantidad de resultados

        // Respondemos con los pacientes y la información de paginación
        res.json({
            patients,                                 // Lista de pacientes
            totalPatients,                           // Total de pacientes encontrados
            totalPages: Math.ceil(totalPatients / limitNumber), // Total de páginas
            currentPage: pageNumber                  // Página actual
        });
    } catch (err) {
        // Manejo de errores centralizado
        next(new HttpError('Error al obtener pacientes', 500));
    }
}

/**
 * Mostrar el detalle de un paciente específico
 * -------------------------------------------
 * Esta función implementa el endpoint "Mostrar el detalle de un paciente"
 * de la consigna, que permite consultar toda la información de un paciente
 * a partir de su ID único.
 */
const getPatientById = async (req, res, next) => {
  try {
    // Buscamos al paciente en la base de datos por su ID único
    // El ID viene en los parámetros de la URL (ej: /api/pacientes/60d21b4667d0d8992e610c85)
    //req.params es un objeto que contiene los parámetros de ruta (URL) definidos en tu backend.

    const patient = await Patient.findById(req.params.patientId);
    
    // Si no encontramos un paciente con ese ID, devolvemos un error 404
    if (!patient) return next(new HttpError('Paciente no encontrado', 404));
    
    // Si encontramos al paciente, respondemos con sus datos completos
    // Esto incluye: nombre, apellido, DNI, cobertura médica, etc.
    res.json({ patient });
  } catch (err) {
    // Manejo de errores (p.ej. si el formato del ID es inválido)
    next(new HttpError('Error al obtener el paciente', 500));
  }
};

/**
 * Agregar un nuevo paciente al sistema
 * ----------------------------------
 * Esta función implementa el endpoint "Agregar un nuevo paciente"
 * de la consigna, permitiendo registrar pacientes con su información
 * personal y datos de cobertura médica.
 */

const createPatient = async (req, res, next) => {

  // Validamos los datos de entrada usando express-validator
  // Esto garantiza que la información sea correcta y completa
  /* validationResult(req) recoge todos los errores generados por esas reglas.*/

  const errors = validationResult(req);

  /*EN CRIOLLO  "Che, fijate si hay algún error en los datos que mandó el usuario. Si hay alguno, no sigas con lo que venías haciendo, y en vez de eso, tirá un error con el mensaje 'Datos inválidos' y el código 422 para que lo maneje el sistema de errores."*/ 

  if (!errors.isEmpty()) {
    return next(new HttpError('Datos inválidos', 422));
  }


  // Extraemos los datos del paciente del cuerpo de la petición
  const { nombre, apellido, dni, coberturaMedica } = req.body;

  try {
    // Verificamos que no exista otro paciente con el mismo DNI
    // El DNI es un identificador único por paciente

    const existingPatient = await Patient.findOne({ dni });
    if (existingPatient) {
      return next(new HttpError('Ya existe un paciente con ese DNI', 422));
    }

    // Creamos una nueva instancia del modelo Patient con los datos recibidos
    const newPatient = new Patient({
      nombre, 
      apellido, 
      dni,                 // Identificador único del paciente
      coberturaMedica      // Datos de la cobertura médica del paciente
    });
    
    // Guardamos el nuevo paciente en la base de datos
    await newPatient.save();

    // Respondemos con código 201 (Created) y los datos del paciente creado
    res.status(201).json({ 
      message: 'Paciente creado correctamente', 
      patient: newPatient 
    });
  } catch (err) {
    // Manejo de errores durante la creación
    next(new HttpError('Error al crear paciente', 500));
  }
};

/**
 * Actualizar información de un paciente
 * -------------------------------------
 * Esta función implementa el endpoint "Actualizar información de un paciente"
 * de la consigna, permitiendo modificar los datos de un paciente existente
 * con las validaciones necesarias para mantener la integridad de los datos.
 */
const updatePatient = async (req, res, next) => {

  // Validamos los datos de entrada usando express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Datos inválidos', 422));
  }

  // Extraemos los datos actualizados del cuerpo de la petición
  const { nombre, apellido, dni, coberturaMedica } = req.body;
  
  // Obtenemos el ID del paciente a actualizar de los parámetros de la URL
  const { patientId } = req.params;

  try {
    // Buscamos al paciente que se desea actualizar

    const patient = await Patient.findById(patientId);

    if (!patient) return next(new HttpError('Paciente no encontrado', 404));

    // Verificación especial para el DNI: si se está modificando, debemos
    // asegurarnos que no exista otro paciente con el mismo DNI

    if (dni && dni !== patient.dni) {
      const existingPatient = await Patient.findOne({ dni });
      if (existingPatient) return next(new HttpError('Ya existe un paciente con ese DNI', 422));
    }

    // Actualizamos los campos proporcionados, manteniendo los valores
    // originales para aquellos campos que no se incluyeron en la petición

    /* El operador || ("o lógico") devuelve el primer valor "verdadero" que encuentra Entonces: 
    Se lee como:
    "Asigná nombre si existe (es decir, si no es undefined, null, vacío, etc).
    Si nombre no fue enviado o está vacío, dejá patient.nombre como estaba."
    */
    patient.nombre = nombre || patient.nombre;
    patient.apellido = apellido || patient.apellido;
    patient.dni = dni || patient.dni;
    patient.coberturaMedica = coberturaMedica || patient.coberturaMedica;

    // Guardamos los cambios en la base de datos
    await patient.save();
    
    // Respondemos con los datos actualizados del paciente
    res.json({ 
      message: 'Paciente actualizado correctamente', 
      patient 
    });
  } catch (err) {
    // Manejo de errores durante la actualización
    next(new HttpError('Error al actualizar paciente', 500));
  }
};

/**
 * Eliminar un paciente del sistema
 * ------------------------------
 * Esta función implementa el endpoint "Eliminar un paciente" de la consigna,
 * permitiendo eliminar completamente a un paciente del sistema. En un escenario
 * real, podría ser preferible implementar un borrado lógico (similar a lo que
 * se hace con los doctores) para mantener el historial.
 */
const deletePatient = async (req, res, next) => {

  try {
    // Buscamos al paciente que se desea eliminar por su ID

    const patient = await Patient.findById(req.params.patientId);
    
    // Si no encontramos un paciente con ese ID, devolvemos un error 404
    if (!patient) return next(new HttpError('Paciente no encontrado', 404));

    // NOTA: En un sistema de salud real, podría ser conveniente verificar
    // si el paciente tiene turnos activos o historial clínico antes de permitir
    // su eliminación, similar a la validación que se hace con los doctores.
    
    // Eliminamos el paciente de la base de datos
    // deleteOne() es el método recomendado para eliminar documentos individuales
    await patient.deleteOne(); 
    
    // Respondemos con un mensaje de éxito (código 200 por defecto)
    res.json({ message: 'Paciente eliminado correctamente' });
  } catch (err) {
    // Manejo de errores durante la eliminación
    next(new HttpError('Error al eliminar paciente', 500));
  }
};

module.exports = { 
  getAllPatients,    // Listado con filtros obligatorios y paginación
  getPatientById,    // Ver detalles de un paciente específico
  createPatient,     // Registrar un nuevo paciente en el sistema
  updatePatient,     // Modificar información de un paciente existente
  deletePatient      // Eliminar un paciente del sistema
};