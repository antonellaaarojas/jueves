const nodemailer = require('nodemailer');

//configurando transporter de correo

const transporter = nodemailer.createTransport({ //Configura cómo se va a enviar el correo (en este caso, usando Gmail y unas credenciales).
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'pruebaclinicaa@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'jomosbtlxwuvcqho'
    }
 });

 //envio de correo para recuperar contraseña

 const enviarEmailRecuperacion = async(email, nombre, resetToken, host, protocol) => {
    //crear enlace para resetear contraseña
     /* “Armá un enlace (link) al que el usuario va a hacer clic para cambiar su contraseña. Ese link debe llevar al backend, 
     a la ruta que va a permitirle resetear la contraseña, usando un token único que verifica que el pedido es válido.”*/

     /* protocol: puede ser "http" o "https" dependiendo del entorno (por ejemplo, https si está desplegado en producción
     host: es la URL del servidor donde corre tu backend (por ejemplo, midominio.com o localhost:5000).
     resetToken: es un token único que se genera para validar que ese usuario realmente pidió recuperar la contraseña. Es como un código temporal de verificación.*/
     
    const resetURL = `${protocol}://${host}/api/auth/reset-password/${resetToken}`;

    //configurar correo

     /*Es un objeto que le dice a nodemailer:
     A quién enviar el mail
     Qué asunto va a tener
     Y qué contenido se va a ver (en este caso, un mensaje en HTML con un link para recuperar la contraseña)*/

    const mailOptions = {
        to: email, 
        subject: 'Recuperacion de contraseña - Clinica vortex',
        html: `
        <h1>Clínica Vortex - Recuperación de Contraseña</h1>
        <p>Hola ${nombre},</p>
        <p>Has solicitado restablecer tu contraseña.</p>
        <p>Hace clic en el siguiente enlace para crear una nueva contraseña:</p>
        <a href="${resetURL}">Restablecer contraseña</a>
        <p>Este enlace expira en 1 hora.</p>
        <p>Si no solicitaste cambiar tu contraseña, ignora este correo.</p>`
    };

    //envio el correo
    return transporter.sendMail(mailOptions);
 }
 
 module.exports = { transporter,enviarEmailRecuperacion }
