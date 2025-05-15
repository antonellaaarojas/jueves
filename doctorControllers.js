/**
 * Controlador de Doctores - Gestión de médicos para la Clínica Vortex
 * ==============================================================
 * Este controlador maneja todas las operaciones relacionadas con los doctores:
 * - Listar doctores activos con filtro por especialidad (requerido en la consigna)
 * - Mostrar detalles de un doctor específico
 * - Agregar nuevos doctores al sistema
 * - Actualizar información y dar de baja a doctores
 */

// Importación de dependencias y modelos necesarios
const Doctor = require('../models/doctor');           // Modelo de doctores
const HttpError = require('../utils/errors/http-error'); // Manejo de errores HTTP
const { validationResult } = require('express-validator'); // Validación de datos de entrada

/**
 * Obtener listado de doctores activos con filtros y paginación
 * ----------------------------------------------------------
 * Esta función implementa el endpoint para "Listar todos los doctores activos"
 * de la consigna, incluyendo el filtro obligatorio por especialidad.
 * También permite filtrar por nombre y aplica paginación para manejar
 * grandes volúmenes de información.
*/

const getAllDoctors = async (req, res, next) => {
  // Extraemos los parámetros de consulta de la URL
  // Por ejemplo: /api/doctores?especialidad=cardiologia&page=2
  const { nombre, especialidad, page = 1, limit = 10 } = req.query;
  
  // Convertimos los parámetros de paginación a números enteros
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  // Validamos que los parámetros de paginación sean válidos
  if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber <= 0 || limitNumber <= 0) {
    return next(new HttpError('Parámetros de paginación inválidos', 400));
  }

  // Construimos el objeto de filtro para la consulta a MongoDB
  // Por defecto, solo mostramos doctores activos (no dados de baja)
  const filter = { activo: true };
  
  // Si se proporciona un nombre, buscamos coincidencias tanto en nombre como en apellido
  // usando expresiones regulares para búsqueda insensible a mayúsculas/minúsculas
  if (nombre) {
    filter.$or = [
      { nombre: new RegExp(nombre.trim(), 'i') },  // 'i' = case insensitive
      { apellido: new RegExp(nombre.trim(), 'i') } // Busca en ambos campos
    ];
  }
  
  // Filtro por especialidad (requerido según la consigna)
  if (especialidad) {
    filter.especialidad = new RegExp(especialidad.trim(), 'i');
  }

  try {
    // Contamos el total de doctores que coinciden con el filtro para calcular la paginación
    const totalDoctores = await Doctor.countDocuments(filter);
    
    // Obtenemos los doctores aplicando filtros, ordenación y paginación
    const doctores = await Doctor.find(filter)
      .sort({ apellido: 1, nombre: 1 })        // Ordenamos alfabéticamente
      .skip((pageNumber - 1) * limitNumber)    // Paginación: saltamos registros previos
      .limit(limitNumber);                     // Limitamos cantidad de resultados

    // Respondemos con los doctores y la información de paginación
    res.json({
      doctores,                                  // Lista de doctores
      totalDoctores,                             // Total de doctores encontrados
      totalPages: Math.ceil(totalDoctores / limitNumber), // Total de páginas
      currentPage: pageNumber                    // Página actual
    });
  } catch (err) {
    // Manejo de errores centralizado
    next(new HttpError('Error al obtener doctores', 500));
  }
};

/**
 * Mostrar el detalle de un doctor específico
 * ------------------------------------------
 * Esta función implementa el endpoint "Mostrar el detalle de un doctor" 
 * de la consigna, que permite consultar toda la información de un doctor
 * a partir de su ID único.
 */
const getDoctorById = async (req, res, next) => {
  // Extraemos el ID del doctor de los parámetros de la URL
  // Por ejemplo: /api/doctores/60d21b4667d0d8992e610c85
  const { doctorId } = req.params;

  try {
    // Buscamos al doctor en la base de datos por su ID único
    const doctor = await Doctor.findById(doctorId);

    // Si no encontramos un doctor con ese ID, devolvemos un error 404
    if (!doctor) {
      return next(new HttpError('Doctor no encontrado', 404));
    }

    // Si encontramos al doctor, respondemos con sus datos completos
    // Esto incluye: nombre, apellido, especialidad, horarios, etc.
    res.json({ doctor });
  } catch (err) {
    // Manejo de errores (p.ej. si el formato del ID es inválido)
    next(new HttpError('Error al obtener el doctor', 500));
  }
};

/**
 * Agregar un nuevo doctor al sistema
 * --------------------------------
 * Esta función implementa el endpoint "Agregar un nuevo doctor" 
 * de la consigna, permitiendo registrar médicos con su información
 * personal, profesional y horarios de atención.
*/

const createDoctor = async (req, res, next) => {
  // Validamos los datos de entrada usando express-validator
  // Esto garantiza que la información sea correcta y completa
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Datos inválidos, revise los campos', 422));
  }

  // Extraemos todos los datos del doctor del cuerpo de la petición
  const {
    nombre,
    apellido,
    especialidad,
    matricula,          // Identificador profesional único del médico
    telefono,
    email,
    horarioAtencion,    // Array con los horarios disponibles del doctor
    maxTurnosDiarios,   // Límite de turnos diarios para evitar sobrecargas
    observaciones
  } = req.body;

  try {
    // Verificamos que no exista otro doctor con la misma matrícula profesional
    // La matrícula es un identificador único por médico
    const doctorExistente = await Doctor.findOne({ matricula });
    if (doctorExistente) {
      return next(new HttpError('Ya existe un doctor con esa matrícula', 422));
    }

    // Creamos una nueva instancia del modelo Doctor con los datos recibidos
    const nuevoDoctor = new Doctor({
      nombre,
      apellido,
      especialidad,
      matricula,
      telefono,
      email,
      horarioAtencion,   // Array con días y horas de atención
      maxTurnosDiarios,  // Control de sobrecarga de agenda (valor por defecto en el modelo)
      observaciones
    });

    // Guardamos el nuevo doctor en la base de datos
    await nuevoDoctor.save();

    // Respondemos con código 201 (Created) y los datos del doctor creado
    res.status(201).json({
      mensaje: 'Doctor registrado correctamente',
      doctor: nuevoDoctor
    });
  } catch (err) {
    // Manejo de errores durante la creación
    next(new HttpError('Error al crear el doctor', 500));
  }
};

/**
 * Actualizar información de un doctor y posibilidad de inhabilitarlo
 * ----------------------------------------------------------------
 * Esta función implementa el endpoint "Actualizar información de un doctor"
 * de la consigna, incluyendo la posibilidad específica de "dar de baja o 
 * inhabilitar a un doctor", también mencionada en la consigna.
 */
const updateDoctor = async (req, res, next) => {
    // Obtenemos el ID del doctor a actualizar de los parámetros de la URL
    const { doctorId } = req.params;

    // Validamos los datos de entrada recibidos en el cuerpo de la petición
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return next(new HttpError('Datos inválidos, revise los campos', 422));
    }

    // Extraemos todos los campos que se pueden actualizar
    const {
        nombre,
        apellido,
        especialidad,
        matricula,
        telefono,
        email,
        horarioAtencion,
        activo,              // Campo para habilitar/inhabilitar al doctor
        maxTurnosDiarios,
        observaciones
    } = req.body;

    try {
        // Buscamos el doctor que se desea actualizar
        const doctor = await Doctor.findById(doctorId);

        // Si no existe el doctor, devolvemos un error 404
        if(!doctor) {
            return next(new HttpError('Doctor no encontrado', 404));
        }

        // Verificamos si se está cambiando la matrícula, y en ese caso
        // nos aseguramos que no exista otro doctor con la misma matrícula
        if (matricula && matricula !== doctor.matricula) {
            const doctorExistente = await Doctor.findOne({ matricula });
            if (doctorExistente) {
                return next(new HttpError('Ya existe un doctor con esa matrícula', 422));
            }
        }

        // Si el doctor está siendo dado de baja (cambiando activo a false)
        // verificamos que no tenga turnos pendientes o confirmados a futuro
        // Esto implementa la validación de la consigna: "No eliminar doctores que tengan turnos asignados"

        if (doctor.activo && activo === false) { //“Si el doctor estaba activo y ahora me estás diciendo que lo pase a inactivo…”
            const fechaActual = new Date(); //“Guardá la fecha de hoy para saber qué es futuro.”

            /* “Buscá en la base de datos cuántos turnos hay con este doctor, cuya fecha sea después de hoy y estén en estado pendiente o confirmado.” */
            const turnosFuturos = await Turno.countDocuments({
                doctor: doctorId,
                fecha: { $gt: fechaActual },             // Fechas futuras
                estado: { $in: ['pendiente', 'confirmado'] } // Estados activos
            });

            // “Si hay aunque sea 1 turno en esas condiciones, entonces no permitas darlo de baja y devolvé un error con mensaje claro.”
            if (turnosFuturos > 0) {
              return next(new HttpError('No se puede dar de baja al doctor porque tiene turnos pendientes', 422));
            }
        }

        // Actualizamos los campos proporcionados, manteniendo los valores
        // originales para aquellos campos que no se incluyeron en la petición
        doctor.nombre = nombre || doctor.nombre;
        doctor.apellido = apellido || doctor.apellido;
        doctor.especialidad = especialidad || doctor.especialidad;
        doctor.matricula = matricula || doctor.matricula;
        doctor.telefono = telefono || doctor.telefono;
        doctor.email = email || doctor.email;

        // Actualizamos el horario de atención si se proporcionó
        // Solo reemplazamos si el array no está vacío
        if (horarioAtencion && horarioAtencion.length > 0) {
            doctor.horarioAtencion = horarioAtencion;
        }

        // Actualizamos el estado activo si se proporcionó
        // Esto permite dar de baja (inhabilitar) al doctor sin eliminarlo
        // como se solicita específicamente en la consigna
        if (activo !== undefined) {
         doctor.activo = activo;
        }
        
        // Actualizamos el límite de turnos diarios y observaciones
        doctor.maxTurnosDiarios = maxTurnosDiarios || doctor.maxTurnosDiarios;
        doctor.observaciones = observaciones || doctor.observaciones;

        // Guardamos los cambios en la base de datos
        await doctor.save();

        // Enviamos la respuesta con el doctor actualizado
        res.json({
          mensaje: 'Doctor actualizado correctamente',
          doctor  // Incluimos todos los datos del doctor actualizado
        });
    } catch (err) {
        // Manejo centralizado de errores
        next(new HttpError('Error al actualizar el doctor', 500));
    }
};


module.exports = {
  getAllDoctors,     // Listado con filtro por especialidad y paginación
  getDoctorById,     // Ver detalles de un doctor específico
  createDoctor,      // Registrar un nuevo doctor en el sistema
  updateDoctor       // Modificar información o inhabilitar un doctor
};