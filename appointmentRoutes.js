/**
 * Rutas para Gestión de Turnos Médicos
 * ====================================
 * 
 * Este módulo define todas las rutas relacionadas con la gestión de turnos
 * médicos (citas) en la clínica, incluyendo:
 * 
 * - Listado de turnos con filtros y paginación
 * - Detalles de un turno específico
 * - Creación de nuevos turnos
 * - Actualización del estado de turnos (confirmar, cancelar, etc.)
 * 
 * Todas las rutas están protegidas y requieren autenticación y
 * los roles adecuados (administrador o recepcionista).
*/

// Importa Express y crea un enrutador
const express = require('express');
const router = express.Router();

// Importa los controladores de turnos con sus funciones
const { 
    getAppointments,     // Listar turnos con filtros y paginación
    getAppointmentById,  // Obtener detalles de un turno específico
    createAppointment,   // Crear un nuevo turno
    editAppointment      // Actualizar información de un turno existente
} = require('../controllers/appointmentController');

// Importa middleware de autenticación y control de acceso
const { auth, checkRole } = require('../middleware/auth');

// Importa validadores específicos para turnos
const { turnoValidator, estadoValidator } = require('../utils/validators/validations');

// Importa funcionalidades de express-validator para validaciones adicionales si son necesarias
const { body } = require('express-validator');

/**
 * Ruta: GET /api/appointment
 * -------------------------
 * Lista todos los turnos con soporte para filtrado y paginación.
*/

router.get('/', auth, checkRole(['admin', 'recepcion']), getAppointments);

/**
 * Ruta: GET /api/appointment/:turnoId
 * ----------------------------------
 * Obtiene los detalles completos de un turno específico.
*/

router.get('/:turnoId', auth, checkRole(['admin', 'recepcion']), getAppointmentById);

/**
 * Ruta: POST /api/appointment
*/

router.post('/', auth, checkRole(['admin', 'recepcion']), turnoValidator, createAppointment);

/**
 * Ruta: PATCH /api/appointment/:turnoId/estado
 * -------------------------------------------
 * Actualiza el estado de un turno existente (confirmar, cancelar, completar) */

router.patch('/:turnoId/estado', auth, checkRole(['admin', 'recepcion']), estadoValidator, editAppointment);

/**
 * Exporta el enrutador configurado para ser montado en la aplicación principal
 * en la ruta base '/api/appointment' (definida en app.js)
 */
module.exports = router;