const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const { patientValidator } = require('../utils/validators/validations');
const {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient
} = require('../controllers/patientController');



//las rutas de pacientes requieren autenticacion y son accesibles para usuarios con rol 'admin' o 'recepcion'

//listar 
router.get('/', auth, checkRole(['admin', 'recepcion']), getAllPatients);

//obtener un paciente
router.get('/:patientId', auth, checkRole(['admin', 'recepcion']), getPatientById);

//crear nuevo paciente 
router.post('/', auth, checkRole(['admin', 'recepcion']), patientValidator, createPatient);

//actualizar paciente 
router.put('/:patientId', auth, checkRole(['admin', 'recepcion']), patientValidator, updatePatient);

//eliminar un paciente 
router.delete('/:patientId', auth, checkRole(['admin', 'recepcion']), deletePatient);

module.exports = router;

