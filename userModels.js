/**
 * Modelo de Usuario para el Sistema de Clínica Vortex
 * =================================================
 * Este modelo implementa la estructura de datos para los usuarios del sistema,
 * gestiona el cifrado de contraseñas y define los roles según la consigna:
 * - admin: acceso completo a todos los recursos
 * - recepcion: puede gestionar pacientes, doctores y turnos
*/

// Importación de dependencias necesarias
const mongoose = require('mongoose');              // ODM para MongoDB
const uniqueValidator = require('mongoose-unique-validator'); // Validación de campos únicos
const bcrypt = require('bcryptjs');                // Biblioteca para cifrado de contraseñas


/**
 * Definición del esquema de usuario
 * ----------------------------------
 * Estructura de datos que representa a un usuario del sistema con sus propiedades
 * y limitaciones (tipos de datos, campos requeridos, valores por defecto, etc.)
*/

const userSchema = new mongoose.Schema({
    // Datos básicos del usuario
    nombre: { 
        type: String, 
        required: true           // Campo obligatorio
    },
    email: { 
        type: String, 
        required: true,         // Campo obligatorio
        unique: true            // No se permiten duplicados
    },
    password: { 
        type: String, 
        required: true          // Campo obligatorio
        // La contraseña se cifrará automáticamente antes de guardar
    },
    // Roles disponibles según la consigna: admin o recepcion
    rol: { 
        type: String, 
        enum: ['admin', 'recepcion'],  // Solo se permiten estos valores
        required: true                // Campo obligatorio
    },
    // Estado del usuario (activo/inactivo)
    activo: { 
        type: Boolean, 
        default: true           // Por defecto los usuarios están activos
    }, 
    // Token para proceso de recuperación de contraseña
    resetPasswordToken: { 
        type: String             // Solo se establece durante recuperación
    },
}, {
    // Opciones adicionales del esquema
    timestamps: true           // Añade campos createdAt y updatedAt automáticamente
});

/**
 * Middleware para cifrado de contraseñas
 * ------------------------------------
 * Este middleware se ejecuta automáticamente antes de guardar cualquier usuario
 * y se encarga de cifrar la contraseña si esta ha sido modificada.
 * 
 * Esto cumple con el requisito de la consigna: "Implementar mecanismos seguros
 * para el manejo de contraseñas".
*/

userSchema.pre('save', async function (next) {
    // Verificamos si la contraseña ha sido modificada
    // Si no se modificó, no es necesario volver a cifrarla
    if (!this.isModified('password')) return next(); 

    // Ciframos la contraseña usando bcrypt con un factor de costo 10
    // El factor de costo determina cuán complejo es el cifrado (mayor es más seguro pero más lento)
    try {
      // El algoritmo bcrypt genera automáticamente un salt único para cada contraseña
      // y lo incorpora en el hash resultante, lo que protege contra ataques de diccionario
      this.password = await bcrypt.hash(this.password, 10);
      next();
    } catch (error) {
      // Si ocurre algún error durante el cifrado, lo pasamos al siguiente middleware
      next(error);
    }
});

/**
 * Método para generar un token JWT de autenticación
 * ------------------------------------------------
 * Este método permite generar un token JWT para un usuario
 * y almacenarlo en su lista de tokens activos.
 * 
 * NOTA: Este método está definido pero no parece estar en uso en el controlador,
 * ya que allí se genera el token directamente. Podría utilizarse para una
 * implementación futura de múltiples sesiones o revocación de tokens.
*/


/* Es un método de instancia (actúa sobre un usuario específico).

Recibe dos parámetros:

jwt: Librería para generar tokens (como jsonwebtoken).

secret: Clave secreta para firmar el token. */
userSchema.methods.generateAuthToken = async function(jwt, secret) {
    const user = this;

    // Creamos un nuevo token JWT con la información del usuario
    const token = jwt.sign(
        {
            // Identificador único del usuario
            userId: user._id.toString(),
            email: user.email,
            rol: user.rol // Importante para control de acceso basado en roles
        },
        secret, // Clave secreta para firmar el token
        {expiresIn: '24h'} // Tiempo de expiración: 24 horas
    );

    // Añadimos el token a la lista de tokens activos del usuario
    // Esto permitiría gestionar múltiples sesiones y cerrarlas individualmente
    user.tokens = user.tokens.concat({token});

    // Guardamos el usuario con el nuevo token
    await user.save();

    // Devolvemos el token generado
    return token;
}


/**
 * Método para comparar contraseñas
 * -------------------------------
 * Este método permite verificar si una contraseña proporcionada coincide
 * con la contraseña cifrada almacenada para este usuario.
 * Utiliza bcrypt.compare que es resistente a ataques de tiempo.
*/

/* userSchema.methods: Añade un método personalizado a todos los documentos (registros) del modelo User.

async function: Indica que contiene operaciones asíncronas (necesario para bcrypt.compare).

password: Parámetro que recibe la contraseña en texto plano a verificar.*/

userSchema.methods.comparePassword = async function(password) {
    // Compara la contraseña proporcionada con el hash almacenado

    return await bcrypt.compare(password, this.password);
};

/* 
bcrypt.compare: Función que compara de forma segura:

Primer argumento (password): La contraseña en texto plano que el usuario ingresó (ej: "123456").

Segundo argumento (this.password): El hash almacenado en la base de datos para ese usuario (ej: "
2
b
2b10$N9qo8uLO...HPQ6e").

await: Espera el resultado de la comparación (que es una Promesa).*/



/** --------------------------------------------------------
 * Plugin para validación de campos únicos
 * ---------------------------------------
 * Este plugin mejora los mensajes de error cuando se intenta guardar
 * un documento con un valor duplicado en un campo marcado como unique.
*/

userSchema.plugin(uniqueValidator, { message: 'Ya existe un usuario con ese {PATH}' });

/*{PATH}: Variable que el plugin reemplaza automáticamente por el nombre del campo conflictivo (ej: "email", "DNI").*/

// Exportamos el modelo para su uso en la aplicación
// El primer parámetro 'user' define el nombre de la colección en MongoDB
module.exports = mongoose.model('user', userSchema);
