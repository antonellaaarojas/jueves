const nodemailer = require('nodemailer');

//configurando transporter de correo

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'pruebaclinicaa@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'jomosbtlxwuvcqho'
    }
 });

 //envio de correo para recuperar contraseña

 const enviarEmailRecuperacion = async(email, nombre, resetToken, host, protocol) => {
    //crear enlace para resetear contraseña
    const resetURL = `${protocol}://${host}/api/auth/reset-password/${resetToken}`;

    //configurar correo

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