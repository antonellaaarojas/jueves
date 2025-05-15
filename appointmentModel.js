/**
 * Modelo de Citas Médicas (Turnos)
 * ===============================
 * 
 * Este modelo representa las citas médicas o turnos en la clínica.
 * Establece relaciones con los modelos de Paciente y Doctor, y contiene
 * información sobre el horario y estado de cada cita.
*/
// Importa Mongoose para la definición del esquema y modelo
const mongoose = require('mongoose');

/**
 * Esquema de citas médicas (turnos)
 * ---------------------------------
 * Define la estructura de datos para las citas médicas, incluyendo
 * referencias a pacientes y doctores, fecha, hora y estado del turno.
 */
const appointmentSchema = new mongoose.Schema({
    /**
     * Referencia al paciente asociado con esta cita
    */
    paciente: {
        type: mongoose.Schema.Types.ObjectId,  // ID de referencia al modelo Paciente
        ref: 'Paciente',                       // Modelo al que se hace referencia
        required: [true, 'El paciente es obligatorio'] // Validación de obligatoriedad
    },
    
    /**
     * Referencia al doctor que atenderá la cita
     */
    doctor: {
        type: mongoose.Schema.Types.ObjectId,  // ID de referencia al modelo Doctor
        ref: 'Doctor',                        // Modelo al que se hace referencia
        required: [true, 'El doctor es obligatorio'] // Validación de obligatoriedad
    },
    
    /**
     * Fecha de la cita médica
    */

    fecha: {
        type: Date,                            // Tipo de dato fecha
        required: [true, 'La fecha del turno es obligatoria'] // Validación
    },
    
    /**
     * Hora de la cita en formato de cadena (por ejemplo, "14:30")
    */
    hora: {
        type: String,                          // Tipo de dato cadena
        required: [true, 'La hora del turno es obligatoria'] // Validación
    },
    
    /**
     * Estado actual de la cita'
    */
    estado: {
        type: String,                          // Tipo de dato cadena
        enum: ['pendiente', 'confirmado', 'cancelado', 'completado'], // Estados válidos
        default: 'pendiente'                  // Estado inicial predeterminado
    },
}, {
    /**
     * Opciones del esquema
     * -------------------
     * timestamps: Agrega automáticamente los campos createdAt y updatedAt
     * para registrar cuándo se creó y actualizó por última vez cada documento
    */
    timestamps: true
});

/**
 * Método estático: verificarDisponibilidad
 * -----------------------------------------
 * Este método verifica si un doctor está disponible en una fecha y hora específicas.
 * Busca citas existentes para el doctor en ese horario que no estén canceladas.
 * 
*/

appointmentSchema.statics.verificarDisponibilidad = async function(doctorId, fecha, hora) {

    /**"Agrego un método al modelo Turno que me diga si el doctor está libre en esa fecha y hora." */
    // Busca citas existentes para este doctor en la fecha y hora especificadas
    
    const turnosExistentes = await this.countDocuments({
        doctor: doctorId,                // Doctor especificado
        fecha: new Date(fecha),          // Convierte la fecha a objeto Date si no lo es ya
        hora: hora,                      // Hora especificada
        estado: { $ne: 'cancelado' }     // Excluye turnos que ya fueron cancelados
    });
    
    // Retorna true si no hay turnos existentes (doctor disponible)
    return turnosExistentes === 0;
};


/**
 * Crea y exporta el modelo 'appointment' basado en el esquema definido
 * Este modelo se utilizará para realizar operaciones CRUD en la colección
 * 'appointments' de la base de datos MongoDB
 */
module.exports = mongoose.model('appointment', appointmentSchema);