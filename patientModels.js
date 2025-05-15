/**
 * Modelo de Paciente
 * ================
 * Este modelo representa a los pacientes que son atendidos en la clínica.
 * Almacena información personal y de cobertura médica de cada paciente,
 * permitiendo su identificación única mediante DNI.
 * 
 * Se utiliza el plugin mongoose-unique-validator para garantizar
 * que no existan pacientes duplicados en el sistema y mostrar mensajes
 * de error personalizados cuando se intente registrar un DNI duplicado.
 */

// Importa Mongoose para la definición del esquema y modelo
const mongoose = require('mongoose');

// Importa el validador de campos únicos para mejorar los mensajes de error
const uniqueValidator = require('mongoose-unique-validator');

/**
 * Esquema de paciente
 * -----------------
 * Define la estructura de datos para los pacientes, incluyendo
 * información personal y de cobertura médica.
 */
const patientSchema = new mongoose.Schema({
    /**
     * Nombre del paciente
     */
    nombre: {
        type: String, 
        required: [true, 'El nombre es obligatorio']
    },
    
    /**
     * Apellido del paciente*/
    apellido: { 
        type: String, 
        required: [true, 'El apellido es obligatorio'] 
    },
    
    /**
     * Documento Nacional de Identidad del paciente*/
    dni: { 
        type: String, 
        required: [true, 'El DNI es obligatorio'],
        unique: true // Asegura que no haya dos pacientes con el mismo DNI
    },
    
    /**
     * Información sobre la cobertura médica del paciente
     */
    coberturaMedica: {
        nombre: { 
            type: String, 
            required: true 
        }
    }
}, {
});

/**
 * Plugin de validación de campos únicos
 * --------------------------------------
 * Mejora los mensajes de error cuando se intenta crear un paciente
 * con un DNI que ya existe en la base de datos.
 * 
 * El mensaje personalizado sustituye {PATH} con el nombre del campo
 * que tiene el valor duplicado (por ejemplo, "Ya existe un paciente con ese DNI").
 */
patientSchema.plugin(uniqueValidator, { message: 'Ya existe un paciente con ese {PATH}' });

/**
 * Crea y exporta el modelo 'Paciente' basado en el esquema definido
 * Este modelo se utilizará para realizar operaciones CRUD en la colección
 * 'pacientes' de la base de datos MongoDB
*/

module.exports = mongoose.model('Paciente', patientSchema);