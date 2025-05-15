/**
 * Modelo de Doctor
 * ==============
 * 
 * Este modelo representa a los profesionales médicos que atienden en la clínica.
 * Almacena información personal, profesional y de disponibilidad horaria
 * de cada doctor, permitiendo gestionar sus turnos y especialidades.
 * 
 * El modelo incluye validaciones para campos obligatorios y únicos,
 * como la matrícula profesional, que identifica de manera única a cada
 * profesional médico en el sistema.
 */

// Importa Mongoose para la definición del esquema y modelo
const mongoose = require('mongoose');

/**
 * Esquema de doctor
 * ---------------
 * Define la estructura de datos para los doctores, incluyendo
 * información personal, profesional y horarios de atención.
 */
const doctorSchema = new mongoose.Schema({
    /**
     * Nombre del doctor
     */
    nombre: { 
        type: String, 
        required: [true, 'El nombre es obligatorio'] 
    },
    
    /**
     * Apellido del doctor
     */
    apellido: { 
        type: String, 
        required: [true, 'El apellido es obligatorio'] 
    },
    
    /**
     * Especialidad médica del doctor
     */
    especialidad: { 
        type: String, 
        required: [true, 'La especialidad es obligatoria'],
        index: true // Índice para mejorar búsquedas por especialidad
    },
    
    /**
     * Matrícula profesional del doctor
     */
    matricula: { 
        type: String, 
        required: [true, 'La matrícula es obligatoria'],
        unique: true // Asegura que no haya duplicados de matrículas
    },
    
    /**
     * Teléfono de contacto del doctor*/
    telefono: { 
        type: String 
    },
    
    /**
     * Correo electrónico del doctor
    */
    email: { 
        type: String 
    },
    /**
     * Horarios de atención del doctor
    */

    horarioAtencion: [{ 
        // Día de la semana con validación de valores permitidos
        dia: { 
            type: String, 
            enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
        },
        // Hora de inicio de atención (formato HH:MM)
        horaInicio: { 
            type: String 
        },
        // Hora de fin de atención (formato HH:MM)
        horaFin: { 
            type: String 
        }
    }],
    
    /**
     * Estado de actividad del doctor en el sistema
     */
    activo: { 
        type: Boolean, 
        default: true // Para inhabilitar doctores sin eliminarlos de la base de datos
    },
    
    /**
     * Número máximo de turnos diarios que puede atender el doctor
     */
    maxTurnosDiarios: { 
        type: Number, 
        default: 20 // Valor predeterminado para control de sobrecarga de trabajo
    },
    
    /**
     * Observaciones o notas adicionales sobre el doctor
     * @type {String}
     * @optional
     */
    observaciones: { 
        type: String 
    }
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
 * Crea y exporta el modelo 'Doctor' basado en el esquema definido
 * Este modelo se utilizará para realizar operaciones CRUD en la colección
 * 'doctors' de la base de datos MongoDB
 */
module.exports = mongoose.model('Doctor', doctorSchema);
