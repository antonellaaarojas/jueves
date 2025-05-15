/**Aquí se define una nueva clase llamada HttpError, que hereda de la clase Error de JavaScript.
Esto significa que HttpError tendrá todas las características de un Error,
pero además le vas a agregar cosas específicas (como un código HTTP). */

/* Esta nueva clase va a heredar todo lo que hace la clase Error de JavaScript".

¿Qué es una clase "Error"?

Error es una clase que ya viene incluida en JavaScript. La usás todo el tiempo sin darte cuenta, por ejemplo:
*/

/* “Voy a crear un nuevo tipo de error, llamado HttpError, que se comporta como los errores normales, pero le voy a agregar cosas nuevas como .code (el código HTTP).” */

class HttpError extends Error {

    /* Este es el constructor de la clase. Cada vez que hagas new HttpError(...), esta función se ejecuta.message: es el mensaje de error que vas a mostrar (ejemplo: 'Usuario no encontrado')
    errorCode: es el número del código HTTP (ej: 404, 500, 403...) */
    
    constructor (message, errorCode) {

        /* Cuando estás en una clase que hereda de otra, y querés usar el constructor de la clase "padre" (Error), tenés que llamar a super().
        Esto le dice a JavaScript:
        “Pasale este mensaje al constructor del Error original para que se configure correctamente.” */
        super(message);

        /* Esta línea agrega una nueva propiedad llamada code al objeto que se está creando (en este caso, un HttpError). */

        /* En el contexto de una clase, this se refiere al objeto que estás creando en ese momento. Por ejemplo:*/

        /* Cuando se llama a este constructor, se crea un objeto error.
        Y dentro del constructor, this representa a ese objeto error. */

        /* “Este objeto (this) va a tener una propiedad llamada code, y le voy a asignar el valor que me pasaron como errorCode.” */

        
        this.code = errorCode;
    }
}


/* 💡 ¿Por qué se hace esto?
En Express (y en general en Node.js), los errores se pueden lanzar con throw new Error(...). Pero eso no te da control sobre el código de estado HTTP (como 404, 500, 403, etc.). Para eso, se crea esta clase personalizada llamada HttpError. */

/* Sin esta clase, cada vez que tenés un error tendrías que hacer algo como: 

   const error = new Error('Algo salió mal');
    error.code = 500;
    next(error);




    Con HttpError simplemente hacés:

    next(new HttpError('Algo salió mal', 500));

*/




// Exporta la clase para ser utilizada en toda la aplicación
module.exports = HttpError;