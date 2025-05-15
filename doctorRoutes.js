/**
 * Rutas para Gestión de Doctores
 * =============================
 * 
 * Este módulo define todas las rutas relacionadas con la gestión de
 * doctores en la clínica, incluyendo:
 * 
 * - Listado de doctores con filtros por especialidad
 * - Detalle de un doctor específico
 * - Creación de nuevos doctores
 * - Actualización de información de doctores existentes
 * 
 * Todas las rutas de doctores requieren autenticación y son accesibles 
 * únicamente por usuarios con rol 'admin' o 'recepcion'. */

// Importa Express y crea un enrutador
const express = require('express');
const router = express.Router();

// Importa los controladores de doctores con sus funciones
const { 
  getAllDoctors,     // Listar todos los doctores con posibilidad de filtrar
  getDoctorById,     // Obtener detalles de un doctor específico
  createDoctor,      // Crear un nuevo doctor
  updateDoctor,      // Actualizar información de un doctor existente
} = require('../controllers/doctorController');

// Importa middleware de autenticación y control de acceso
const { auth, checkRole } = require('../middleware/auth');

// Importa el validador específico para doctores
const { doctorValidator } = require('../utils/validators/validations');

/**
 * Importante: Todas las rutas de doctores están protegidas
 * Requieren autenticación (token JWT válido) y permisos adecuados
 * (rol 'admin' o 'recepcion') para acceder a cualquier endpoint.
/*
 * Ruta: GET /api/doctors
 * ----------------------
 * Lista todos los doctores con posibilidad de filtrar por especialidad.
*/

router.get('/', auth, checkRole(['admin', 'recepcion']), getAllDoctors);

/**
 * Ruta: GET /api/doctors/:doctorId
 * -------------------------------
 * Obtiene los detalles completos de un doctor específico.
 @response
 *   - doctor: Objeto con la información completa del doctor, incluyendo horarios y especialidad
*/

router.get('/:doctorId', auth, checkRole(['admin', 'recepcion']), getDoctorById);

/**
 * Ruta: POST /api/doctors
 * ----------------------
 * Crea un nuevo doctor en el sistema.
*/

router.post('/', auth, checkRole(['admin', 'recepcion']), doctorValidator, createDoctor);

/**
 * Ruta: PUT /api/doctors/:doctorId
 * ------------------------------
 * Actualiza la información de un doctor existente.
*/

router.put('/:doctorId', auth, checkRole(['admin', 'recepcion']), updateDoctor);


module.exports = router;