# Configuración inicial

## Conexión con Supabase

El proyecto es HTML estático y utiliza módulos ES del navegador; no requiere npm ni un bundler. Antes de probar la autenticación:

1. Revisa en `js/supabaseConfig.js` que `SUPABASE_URL` sea la URL del proyecto y que `SUPABASE_PUBLIC_KEY` sea su clave publicable o la clave `anon` heredada.
2. Confirma en el panel del proyecto que ambos valores pertenezcan al mismo proyecto.
3. No coloques una clave `service_role` ni otro secreto en este frontend.
4. En la configuración de autenticación de Supabase, verifica que el registro por correo esté habilitado y revisa la opción de confirmación de correo. La interfaz muestra un aviso para confirmar el correo cuando Supabase no devuelve una sesión después del registro.

La aplicación mantiene el formulario disponible sin esas credenciales, pero muestra que la autenticación no está configurada y no finge que una operación se haya realizado. El cliente de Supabase se crea de forma centralizada en `js/supabaseClient.js` cuando se requiere y usa `@supabase/supabase-js` v2 desde `esm.sh`.

### Comprobar el endpoint de salud

El endpoint `/auth/v1/health` requiere una clave de API. Una petición `fetch` sin encabezado `apikey` responde `401` con `No API key found`; eso significa que la petición no envió una clave y no demuestra que la URL o la clave configurada en la aplicación sean incorrectas. Para probarlo desde la consola del navegador, usa la URL del proyecto y pega localmente la clave publicable (no compartas el valor):

```js
const response = await fetch("https://TU_PROYECTO.supabase.co/auth/v1/health", {
  headers: { apikey: "PEGA_AQUI_TU_CLAVE_PUBLICABLE" },
});
console.log("Estado HTTP:", response.status);
console.log("Respuesta:", await response.text());
```

`js/supabaseClient.js` pasa la URL y la clave al SDK, que añade el encabezado de API a las llamadas de autenticación. Si el endpoint responde correctamente pero el registro o el inicio de sesión fallan, revisa el error de esa llamada específica en la pestaña Network/Red y confirma que el navegador esté cargando estos archivos actualizados.

## Decisiones pendientes

- No se encontró documentación ni esquema de base de datos en el repositorio. El registro solo envía correo y contraseña a Supabase Auth; no se solicitan nombre, metadatos de perfil ni rol, y no se escriben contraseñas en tablas propias.
- No se definió aquí una política de contraseña: la interfaz valida campos obligatorios y coincidencia; Supabase aplica los requisitos configurados en el proyecto.
- No hay una página de dashboard existente. Después del inicio de sesión se conserva la sesión y se informa el éxito, sin navegar a una ruta inventada.
- No se implementó recuperación de contraseña porque no se encontró una configuración ni un flujo de destino para probar.

## Prueba manual

1. Sirve la carpeta con un servidor web local que soporte módulos ES; no abras las páginas como archivos `file://`.
2. Completa la URL y la clave pública en `js/supabaseConfig.js`.
3. En `registro.html`, crea una cuenta con un correo que puedas consultar y una contraseña que cumpla las reglas configuradas en Supabase.
4. Si está habilitada la confirmación, abre el correo recibido y confirma la cuenta. El registro solo indica sesión activa cuando Supabase devuelve una.
5. En `login.html`, inicia sesión con esa cuenta y comprueba que aparece el mensaje de sesión activa.

La autenticación no se considera probada hasta completar estos pasos contra el proyecto real de Supabase. No se modificaron tablas, políticas RLS, funciones ni triggers.
