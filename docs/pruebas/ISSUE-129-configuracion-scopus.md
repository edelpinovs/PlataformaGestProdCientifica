# Issue #129: configuración institucional de Scopus

Aprobación explícita de I6 en sesión del 6 de noviembre de 2026, después de explicar el cambio de esquema. La configuración pertenece a Producción y solo ADMINISTRADOR accede a la página y su Server Action.

## Uso

1. En Vercel, configurar SCOPUS_CLAVE_MAESTRA como secreto de servidor de 32 bytes en hexadecimal (64 caracteres). Generarla localmente en un gestor de secretos o con crypto.randomBytes(32).toString('hex'); no pegarla en el chat ni guardarla en el repositorio. Conservar copia segura bajo custodia de la administración del despliegue.
2. Volver a desplegar y abrir Producción → Administrar conexión.
3. Introducir la clave de Scopus y pulsar Comprobar y guardar clave. Una conexión fallida no sustituye la clave anterior.
4. Los escaneos manuales y el cron resuelven la clave institucional al procesar cada profesor. La entrada de servidor consultarIndiceHConfigurado usa la misma resolución; todavía no existe una pantalla consumidora de índice h.

La clave maestra necesita configurarse una sola vez en cada entorno. No debe cambiarse sin un proceso de recifrado: las claves existentes quedarían ilegibles. Si se pierde, restaurarla desde la custodia o registrar de nuevo la clave de Scopus con una nueva maestra; no hay recuperación automática. La rotación sin interrupción de la maestra queda fuera del alcance de esta entrega.

## Seguridad y migración

AES-256-GCM con nonce aleatorio, etiqueta de integridad y contexto autenticado. El formulario siempre abre vacío. El estado público solo incluye presencia, origen, fecha y disponibilidad de protección. Ninguna respuesta devuelve la clave, su cifrado ni errores del proveedor. No se usa SUPABASE_SECRET_KEY.

Precedencia: app si existe registro; variable SCOPUS_API_KEY como respaldo solo si no existe. Un fallo de lectura o descifrado no activa silenciosamente el respaldo. Las otras fuentes del escaneo pueden continuar.

Migración 20261106225350_configuracion_scopus generada con db:nueva-migracion, revisada y aplicada mediante db:migrar. Solo crea ConfiguracionScopus, activa RLS y revoca privilegios a anon y authenticated; sin escrituras de secretos ni modificaciones de tablas existentes. Comprobación de metadatos: RLS activo, SELECT denegado para ambos roles. Prisma del servidor conserva el acceso.

## Verificación

570 pruebas correctas; npm run lint y npm run typecheck correctos. npm run build correcto al repetir con acceso de red; el primer intento falló descargando Geist de Google Fonts.

Pruebas: cifrado e integridad, nonce distinto, precedencia, mensajes seguros, página y acción restringidas, conexión fallida sin reemplazo, metadatos sin secretos, inyección al motor e índice h. HTTP y Prisma simulados, secretos ficticios. No se realizó una conexión real con una clave de Scopus porque aún no está disponible.

Revisión visual pendiente en claro, oscuro y celular: la herramienta no inició (failed to write kernel assets, error 3). La migración ya está aplicada a la base compartida; requiere revisión independiente antes de integrar el PR.
