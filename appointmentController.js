/**
 * Importación de dependencias y modelos necesarios para el controlador de turnos
 * -----------------------------------------------------------------------------
 * express-validator: Para validar datos recibidos en las peticiones
 * mongoose: ODM para interactuar con la base de datos MongoDB
 * HttpError: Clase personalizada para manejo unificado de errores HTTP
 * Appointment, Paciente, Doctor: Modelos que representan las entidades en la BD
 */
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const HttpError = require('../utils/errors/http-error');
const Appointment = require('../models/appointment');
const Paciente = require('../models/patient');
const Doctor = require('../models/doctor');

/**
 * Obtener listado de turnos con filtros y paginación
 * --------------------------------------------------
 * Esta función permite listar todos los turnos existentes con posibilidad de
 * filtrar por paciente, doctor y fecha. También implementa paginación para
 * gestionar grandes volúmenes de datos de manera eficiente.
*/

const getAppointments = async (req, res, next) => {
    // Extraemos parámetros de consulta de la URL (ej: /turnos?paciente=123&doctor=456)
    // Valores por defecto: page=1, limit=10
    const { paciente, doctor, fecha, page = 1, limit = 10 } = req.query;

    // Convertimos los parámetros de paginación a números enteros
    // El segundo parámetro (10) indica que la conversión es a base decimal
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // Validamos que los parámetros de paginación sean números positivos
    // Si no son válidos, respondemos con un error 400 (Bad Request)
    if (isNaN(pageNumber) || pageNumber <= 0) {
        return next(new HttpError('Número de página inválido.', 400));
    }

    if (isNaN(limitNumber) || limitNumber <= 0) {
        return next(new HttpError('Número de resultados por página inválido.', 400));
    }

    // Objeto para construir los filtros de búsqueda en MongoDB
    // Iremos añadiendo condiciones según los parámetros recibidos
    const filter = {};

    try {
        // Si se proporcionó un ID de paciente, verificamos que exista en la BD
        if (paciente) {
            // Buscamos el paciente por su ID único en MongoDB
            const pacienteExistente = await Paciente.findById(paciente);
            // Si no existe, devolvemos un error 404 (Not Found)
            if (!pacienteExistente) {
                return next(new HttpError('Paciente no encontrado.', 404));
            }
            // Si existe, añadimos el filtro para buscar turnos de este paciente
            filter.paciente = paciente;
        }

        // Si se proporcionó un ID de doctor, verificamos que exista en la BD
        if (doctor) {
            // Buscamos el doctor por su ID único en MongoDB
            const doctorExistente = await Doctor.findById(doctor);
            // Si no existe, devolvemos un error 404 (Not Found)
            if (!doctorExistente) {
                return next(new HttpError('Doctor no encontrado.', 404));
            }
            // Si existe, añadimos el filtro para buscar turnos de este doctor
            filter.doctor = doctor;
        }

        // Si se proporcionó una fecha, procesamos para buscar turnos de ese día
        if (fecha) {
            // Convertimos el string de fecha a un objeto Date de JavaScript
            const fechaInput = new Date(fecha);
            // Verificamos que la fecha sea válida
            if (isNaN(fechaInput)) {
                return next(new HttpError('Formato de fecha inválido.', 400));
            }

            // Calculamos el día siguiente para crear un rango de búsqueda
            // que incluya todo el día solicitado (desde 00:00 hasta 23:59)
            const siguienteDia = new Date(fechaInput);
            siguienteDia.setDate(siguienteDia.getDate() + 1);

            // Añadimos un filtro de rango para la fecha usando operadores de MongoDB
            // $gte = greater than or equal (mayor o igual que)
            // $lt = less than (menor que)
            filter.fecha = { $gte: fechaInput, $lt: siguienteDia };
        }

        // Contamos el total de turnos que coinciden con nuestros filtros
        // para calcular el número total de páginas en la paginación
        const totalTurnos = await Appointment.countDocuments(filter);

        // Realizamos la consulta principal con los filtros aplicados
        const turnos = await Appointment.find(filter)
            // Populate reemplaza las referencias (IDs) con los datos reales
            // de los documentos relacionados (trae información del paciente y doctor)
            .populate([
                { path: 'paciente', select: 'nombre' }, // Solo traemos el nombre del paciente
                { path: 'doctor', select: 'nombre especialidad' } // Nombre y especialidad del doctor
            ])
            // Implementamos la paginación: saltamos los resultados de páginas anteriores
            .skip((pageNumber - 1) * limitNumber)
            // Limitamos la cantidad de resultados según el parámetro limit
            .limit(limitNumber)
            // Ordenamos los turnos por fecha (ascendente: del más antiguo al más reciente)
            .sort({ fecha: 1 });

        // Si no encontramos turnos con los filtros proporcionados, devolvemos un error 404
        if (turnos.length === 0) {
            return next(new HttpError('No se encontraron turnos.', 404));
        }

        // Enviamos la respuesta con los turnos encontrados y la información de paginación
        res.json({
            // Convertimos los documentos de MongoDB a objetos JavaScript planos
            // getters:true transforma los _id de MongoDB a id normales para mejor legibilidad
            turnos: turnos.map(t => t.toObject({ getters: true })),
            totalTurnos, // Total de turnos que coinciden con el filtro
            totalPaginas: Math.ceil(totalTurnos / limitNumber), // Calculamos el total de páginas
            paginaActual: pageNumber // Página actual solicitada
        });
    } catch (err) {
        // Manejo centralizado de errores: si ocurre cualquier problema en la consulta
        // devolvemos un error 500 (Internal Server Error)
        return next(new HttpError('Error al obtener los turnos.', 500));
    }
};

/**
 * Obtener detalle de un turno específico por su ID
 * ---------------------------------------------
 * Esta función busca y devuelve la información completa de un turno
 * específico, incluyendo datos del paciente y doctor asociados.
 * Es útil para ver todos los detalles de una cita médica.
 */
const getAppointmentById = async (req, res, next) => {
    // Extraemos el ID del turno de los parámetros de la URL (ej: /turnos/123)
    const turnoId = req.params.id;

    let turno;
    try {
        // Buscamos el turno por su ID y utilizamos populate para traer
        // información relacionada del paciente y doctor en la misma consulta
        turno = await Appointment.findById(turnoId)
            .populate([
                // Traemos nombre y apellido del paciente
                { path: 'paciente', select: 'nombre apellido' },
                // Traemos nombre y especialidad del doctor
                { path: 'doctor', select: 'nombre especialidad' }
            ]);
    } catch (err) {
        // Si hay un error en la consulta (por ejemplo, ID con formato inválido)
        return next(new HttpError('Error al buscar el turno.', 500));
    }

    // Si no encontramos ningún turno con ese ID
    if (!turno) {
        return next(new HttpError('Turno no encontrado.', 404));
    }

    // Devolvemos el turno encontrado, transformando el documento MongoDB
    // a un objeto JavaScript plano para mejor manejo en el frontend
    res.json({ turno: turno.toObject({ getters: true }) });
};

/**
 * Crear un nuevo turno médico
 * -------------------------
 * Esta función permite crear un nuevo turno (cita médica) verificando
 * la disponibilidad del doctor y validando la existencia del paciente
 * y doctor. También controla la cantidad máxima de turnos diarios.
 */
const createAppointment = async (req, res, next) => {
    // Validamos los datos de entrada usando express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return next(new HttpError('Datos inválidos, por favor verifique.', 422));
    }

    // Extraemos los datos necesarios del cuerpo de la petición
    // Si no se especifica estado, por defecto será 'confirmado'
    const { paciente, doctor, fecha, hora, estado = 'confirmado' } = req.body;

    // Variables para almacenar los objetos completos de paciente y doctor
    let patientObj, doctorObj;

    try {
        // Verificamos que el paciente exista en la base de datos
        patientObj = await Paciente.findById(paciente);
        if (!patientObj) {
            return next(new HttpError('Paciente no encontrado.', 404));
        }

        // Verificamos que el doctor exista en la base de datos
        doctorObj = await Doctor.findById(doctor);
        if (!doctorObj) {
            return next(new HttpError('Doctor no encontrado.', 404));
        }
    } catch (err) {
        // Error al consultar la base de datos
        return next(new HttpError('Error al buscar paciente o doctor.', 500));
    }

    // Combinamos fecha y hora para crear un objeto Date completo
    const inputDate = new Date(`${fecha}T${hora}`);
    
    // Calculamos el inicio del día (00:00:00)
    const startOfDay = new Date(inputDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Calculamos el fin del día (23:59:59)
    const endOfDay = new Date(inputDate);
    endOfDay.setHours(23, 59, 59, 999);

    try {
        // Contamos cuántos turnos confirmados tiene el doctor en ese día
        // para evitar sobrecarga de agenda
        const dailyCount = await Appointment.countDocuments({
            doctor,
            fecha: { $gte: startOfDay, $lte: endOfDay },
            estado: 'confirmado'
        });

        // Si el doctor ya tiene 8 o más turnos en ese día, no permitimos crear otro
        // Esto es una medida para controlar la sobrecarga de trabajo
        if (dailyCount >= 8) {
            return next(new HttpError('El doctor ya tiene 8 turnos confirmados en esta fecha.', 400));
        }
    } catch (err) {
        return next(new HttpError('Error al verificar la disponibilidad del doctor.', 500));
    }

    // Creamos un nuevo documento de turno con los datos proporcionados
    const nuevoTurno = new Appointment({
        paciente: patientObj._id,  // Guardamos la referencia al paciente
        doctor: doctorObj._id,     // Guardamos la referencia al doctor
        fecha: inputDate,          // Fecha y hora del turno
        hora,                     // Hora como string separado (para facilitar consultas)
        estado                    // Estado del turno (por defecto 'confirmado')
    });

    try {
        // Guardamos el nuevo turno en la base de datos
        await nuevoTurno.save();

        // Respondemos con código 201 (Created) y los datos del nuevo turno
        res.status(201).json({ appointment: nuevoTurno });
    } catch (err) {
        return next(new HttpError('No se pudo crear el turno.', 500));
    }
};

/**
 * Editar un turno existente
 * -----------------------
 * Esta función permite modificar un turno existente, controlando que
 * no se generen conflictos con otros turnos y manteniendo la integridad
 * de los datos. Utiliza transacciones de MongoDB para garantizar que
 * todas las operaciones se completen correctamente o ninguna se aplique.
 */
const editAppointment = async (req, res, next) => {
    // Obtenemos el ID del turno a editar de los parámetros de la URL
    const { id } = req.params;
    // Extraemos los datos a actualizar del cuerpo de la petición
    const { paciente, doctor, fecha, hora, estado } = req.body;

    // Definimos qué campos se pueden actualizar para seguridad
    const camposPermitidos = ['paciente', 'doctor', 'fecha', 'estado'];
    // Filtramos los campos que realmente se están intentando actualizar
    const actualizaciones = Object.keys(req.body).filter(campo => camposPermitidos.includes(campo));

    // Verificamos que todos los campos enviados sean válidos
    if (!actualizaciones.every(campo => camposPermitidos.includes(campo))) {
        return next(new HttpError('Actualizaciones inválidas para el turno.', 400));
    }

    // Variable para almacenar el turno encontrado
    let turno;
    try {
        // Buscamos el turno por ID y cargamos datos de paciente y doctor
        turno = await Appointment.findById(id).populate('paciente').populate('doctor');
        if (!turno) {
            // Si no existe el turno, devolvemos error 404
            return next(new HttpError('Turno no encontrado.', 404));
        }
    } catch (err) {
        // Error al consultar la base de datos
        return next(new HttpError('Error al buscar el turno.', 500));
    }

    // Si se proporcionó una nueva fecha, la combinamos con la hora
    // Si no, mantenemos la fecha actual del turno
    const nuevaFecha = fecha ? new Date(`${fecha}T${hora}`) : turno.fecha;
    // Si se proporcionó un nuevo doctor usamos su ID, si no, mantenemos el actual
    const idDoctor = doctor || turno.doctor._id;

    // Iniciamos una sesión de transacción para asegurar la integridad de los datos
    // Las transacciones permiten que todas las operaciones se completen o ninguna
    const sesion = await mongoose.startSession();
    sesion.startTransaction();
    try {
        // Validamos que no haya otro turno del mismo doctor en la misma fecha y hora
        // utilizamos $ne (not equal) para excluir el turno actual de la búsqueda
        const turnoExistente = await Appointment.findOne({
            doctor: idDoctor,
            fecha: nuevaFecha,
            _id: { $ne: turno._id } // Excluimos el turno que estamos editando
        });

        // Si encontramos un turno que se solaparía, cancelamos la transacción
        if (turnoExistente) {
            await sesion.abortTransaction();
            sesion.endSession();
            return next(new HttpError('El doctor ya tiene un turno en esa fecha y hora.', 400));
        }

        // Calculamos el inicio del día (00:00:00) para la nueva fecha
        const inicioDelDia = new Date(nuevaFecha);
        inicioDelDia.setHours(0, 0, 0, 0);

        // Calculamos el fin del día (23:59:59) para la nueva fecha
        const finDelDia = new Date(nuevaFecha);
        finDelDia.setHours(23, 59, 59, 999);

        // Contamos cuántos turnos tiene el doctor en ese día (excluyendo el actual)
        // para controlar la sobrecarga de agenda
        const cantidadDelDia = await Appointment.countDocuments({
            doctor: idDoctor,
            fecha: { $gte: inicioDelDia, $lte: finDelDia },
            _id: { $ne: turno._id } // Excluimos el turno que estamos editando
        });

        // Límite de 10 turnos por día por doctor
        if (cantidadDelDia >= 10) {
            await sesion.abortTransaction();
            sesion.endSession();
            return next(new HttpError('El doctor ya tiene 10 turnos en ese día.', 422));
        }

        // Procesamos el cambio de paciente si se proporcionó uno diferente al actual
        // Comparamos IDs con el método equals() para asegurar comparación correcta de ObjectId
        if (paciente && !turno.paciente._id.equals(paciente)) {
            // Verificamos que el nuevo paciente exista en la base de datos
            const nuevoPaciente = await Paciente.findById(paciente);
            if (!nuevoPaciente) {
                // Si no existe, cancelamos toda la transacción
                await sesion.abortTransaction();
                sesion.endSession();
                return next(new HttpError('Paciente no encontrado.', 404));
            }

            // Eliminamos la referencia al turno del paciente anterior
            // $pull es un operador de MongoDB que elimina elementos de un array
            await Paciente.updateOne(
                { _id: turno.paciente._id },      // Buscamos al paciente actual
                { $pull: { turnos: turno._id } }, // Eliminamos este turno de su lista
                { session: sesion }              // Usamos la sesión de transacción
            );

            // Añadimos la referencia al turno en el nuevo paciente
            // $push es un operador de MongoDB que añade elementos a un array
            await nuevoPaciente.updateOne(
                { $push: { turnos: turno._id } }, // Añadimos este turno a su lista
                { session: sesion }              // Usamos la sesión de transacción
            );

            // Actualizamos la referencia al paciente en el turno
            turno.paciente = nuevoPaciente._id;
        }

        // Procesamos el cambio de doctor si se proporcionó uno diferente al actual
        if (doctor && !turno.doctor._id.equals(doctor)) {
            // Verificamos que el nuevo doctor exista y esté activo
            const nuevoDoctor = await Doctor.findById(doctor);
            // Importante: validamos que el doctor esté activo para no asignar turnos
            // a doctores que han sido dados de baja o inhabilitados
            if (!nuevoDoctor || nuevoDoctor.activo !== 'activo') {
                // Si no existe o está inactivo, cancelamos toda la transacción
                await sesion.abortTransaction();
                sesion.endSession();
                return next(new HttpError('Doctor no encontrado o inactivo.', 400));
            }

            // Eliminamos la referencia al turno del doctor anterior
            await Doctor.updateOne(
                { _id: turno.doctor._id },       // Buscamos al doctor actual
                { $pull: { turnos: turno._id } }, // Eliminamos este turno de su lista
                { session: sesion }              // Usamos la sesión de transacción
            );

            // Añadimos la referencia al turno en el nuevo doctor
            await nuevoDoctor.updateOne(
                { $push: { turnos: turno._id } }, // Añadimos este turno a su lista
                { session: sesion }              // Usamos la sesión de transacción
            );

            // Actualizamos las referencias en el turno
            turno.doctor = nuevoDoctor._id;
            // También actualizamos la especialidad para mantener consistencia
            turno.especialidad = nuevoDoctor.especialidad;
        }

        // Actualizamos los campos simples que no requieren lógica especial
        // Si se proporcionó una nueva fecha, actualizamos el campo
        if (actualizaciones.includes('fecha')) {
            turno.fecha = nuevaFecha; // Ya procesamos la fecha combinada con hora antes
        }

        // Si se proporcionó un nuevo estado, actualizamos el campo
        // Los estados posibles son: pendiente, confirmado, cancelado, completado
        if (actualizaciones.includes('estado')) {
            turno.estado = estado;
        }

        // Guardamos los cambios en el turno dentro de la transacción
        // Esto asegura que si hay algún error, la transacción se abortará y no se aplicarán cambios
        await turno.save({ session: sesion });

        // Si llegamos aquí sin errores, confirmamos todos los cambios
        // de la transacción para que se apliquen permanentemente
        // Esto es el paso final antes de responder al cliente
        await sesion.commitTransaction();
        sesion.endSession();

        // Respondemos con el turno actualizado (código 200 = OK)
        // Esto indica que la operación se completó con éxito
        res.status(200).json({ turno });
    } catch (err) {
        // Si ocurrió cualquier error durante el proceso, revertimos todos los cambios
        // (ningún cambio se aplicará a la base de datos)
        // Esto es importante para mantener la integridad de los datos
        await sesion.abortTransaction();
        sesion.endSession();
        return next(new HttpError('No se pudo editar el turno. Intente nuevamente.', 500));
    }
};

/**
 * Exportamos todas las funciones del controlador para que estén disponibles
 * para las rutas de la API. Cada una maneja un endpoint específico:
 * - getAppointments: Listar turnos con filtros y paginación
 * - getAppointmentById: Ver detalle de un turno específico
 * - createAppointment: Crear un nuevo turno
 * - editAppointment: Actualizar un turno existente
 */
module.exports = {  getAppointments, getAppointmentById, createAppointment, editAppointment };