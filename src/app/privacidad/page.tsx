import Link from 'next/link';
import Navbar from '@/components/navbar';

export const metadata = {
  title: 'Política de Privacidad | ServiTrust Panamá',
  description: 'Cómo tratamos tus datos personales en ServiTrust Panamá.',
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">← Inicio</Link>

        <header className="mb-8 mt-2">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-2">Política de Privacidad</h1>
          <p className="text-sm text-stone-500">Última actualización: abril 2026</p>
        </header>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-10 text-sm text-amber-900">
          <strong>⚠️ Documento preliminar.</strong> Borrador alineado con la{' '}
          <strong>Ley 81 de 2019 de Protección de Datos Personales de Panamá</strong>. Se revisará con asesoría legal antes del lanzamiento público.
        </div>

        <article className="prose prose-stone max-w-none space-y-8 text-stone-700 leading-relaxed">

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">1. Responsable del tratamiento</h2>
            <p>
              El responsable del tratamiento de tus datos personales es ServiTrust Panamá. <strong>Datos de contacto:</strong> [PENDIENTE — agregar razón social, RUC, dirección fiscal y email del encargado de protección de datos].
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">2. Qué datos recopilamos</h2>
            <p>Recopilamos los siguientes datos personales, según el uso que hagas de la plataforma:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Datos de cuenta:</strong> nombre, email, teléfono, contraseña (cifrada).</li>
              <li><strong>Datos de perfil:</strong> foto, biografía, cédula o RUC, certificaciones, experiencia, corregimiento, redes sociales (si las agregas).</li>
              <li><strong>Datos del servicio:</strong> categorías, precios, fotos, horarios, área de cobertura.</li>
              <li><strong>Comunicaciones:</strong> mensajes del chat entre cliente y proveedor, reseñas, feedback enviado.</li>
              <li><strong>Datos técnicos:</strong> dirección IP, navegador, dispositivo, eventos de uso (búsquedas, clics, vistas).</li>
              <li><strong>Ubicación aproximada:</strong> corregimiento/provincia que indiques (no GPS en tiempo real).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">3. Para qué los usamos</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Crear y gestionar tu cuenta.</li>
              <li>Conectarte con proveedores o clientes según tu búsqueda.</li>
              <li>Facilitar la comunicación por chat y el agendamiento.</li>
              <li>Verificar identidades y prevenir fraude.</li>
              <li>Mejorar la plataforma (analítica de uso agregada y anónima).</li>
              <li>Enviar notificaciones transaccionales (nuevos mensajes, confirmaciones, recordatorios).</li>
              <li>Cumplir obligaciones legales, fiscales o requerimientos de autoridades competentes.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">4. Base legal del tratamiento</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Consentimiento:</strong> al registrarte y aceptar esta política.</li>
              <li><strong>Ejecución de contrato:</strong> para brindarte los servicios de la plataforma.</li>
              <li><strong>Obligación legal:</strong> conservación de registros fiscales y contables.</li>
              <li><strong>Interés legítimo:</strong> prevenir fraude, mejorar el producto, seguridad.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">5. Con quién compartimos tus datos</h2>
            <p>Tus datos se comparten únicamente con:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Otros usuarios de la plataforma:</strong> los datos de tu perfil público son visibles para clientes y proveedores (nombre, foto, zona, rating, reseñas, certificaciones). Tu cédula completa y contacto privado no se muestran públicamente.</li>
              <li><strong>Proveedores de infraestructura:</strong> Supabase (base de datos, autenticación, almacenamiento), Vercel (hosting), Resend (email). Firman acuerdos de tratamiento de datos.</li>
              <li><strong>Analítica anónima:</strong> Vercel Analytics (sin cookies, sin identificar usuarios).</li>
              <li><strong>Autoridades competentes:</strong> cuando exista un requerimiento legal válido.</li>
            </ul>
            <p className="mt-2">
              <strong>Nunca vendemos tus datos</strong> a terceros ni los cedemos para marketing externo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">6. Tus derechos (Ley 81 de 2019)</h2>
            <p>Como titular de tus datos, tienes derecho a:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Acceder</strong> a los datos que tenemos sobre ti.</li>
              <li><strong>Rectificar</strong> datos inexactos o incompletos.</li>
              <li><strong>Cancelar</strong> o eliminar tu cuenta y datos asociados.</li>
              <li><strong>Oponerte</strong> a usos específicos.</li>
              <li><strong>Portabilidad:</strong> solicitar una copia exportable de tus datos.</li>
              <li>Retirar tu consentimiento en cualquier momento.</li>
              <li>Presentar reclamos ante la Autoridad Nacional de Transparencia y Acceso a la Información (ANTAI).</li>
            </ul>
            <p className="mt-2">
              Para ejercer estos derechos, escríbenos a <strong>[PENDIENTE — email del encargado de datos]</strong> o usa la sección{' '}
              <Link href="/perfil" className="text-teal-700 underline font-medium">Mi Perfil</Link>{' '}
              → Cuenta. Respondemos en un plazo máximo de 15 días hábiles.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">7. Cuánto tiempo conservamos los datos</h2>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Cuenta activa:</strong> mientras uses la plataforma.</li>
              <li><strong>Cuenta eliminada:</strong> 30 días de gracia y luego borrado seguro, excepto registros que la ley exija conservar (ej: transacciones por razones fiscales — hasta 5 años).</li>
              <li><strong>Reseñas y chats:</strong> se conservan de forma anonimizada para mantener el historial público de otros usuarios.</li>
              <li><strong>Logs técnicos:</strong> 90 días máximo.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">8. Seguridad</h2>
            <p>
              Aplicamos medidas técnicas y organizativas para proteger tus datos: cifrado en tránsito (HTTPS/TLS), cifrado en reposo en la base de datos, autenticación segura, control de accesos por roles, políticas de seguridad a nivel de fila (RLS), respaldos regulares y monitoreo de eventos sospechosos. Ningún sistema es 100% infalible, pero nos comprometemos a notificarte sin dilación si detectamos una brecha que afecte tus datos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">9. Menores de edad</h2>
            <p>
              La plataforma está dirigida a mayores de 18 años. No recopilamos intencionalmente datos de menores. Si eres padre, madre o tutor y detectas que un menor ha creado una cuenta sin autorización, escríbenos para eliminarla.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">10. Cookies y tecnologías similares</h2>
            <p>
              Usamos cookies estrictamente necesarias (sesión, autenticación, preferencias) y almacenamiento local del navegador (por ejemplo, para recordar tus búsquedas recientes). No usamos cookies de publicidad ni de rastreo entre sitios.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">11. Transferencias internacionales</h2>
            <p>
              Algunos proveedores de infraestructura (Supabase, Vercel) alojan datos en servidores fuera de Panamá (EE. UU.). Nos aseguramos de que cuenten con estándares equivalentes de protección y acuerdos contractuales que garanticen el cumplimiento.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">12. Cambios a esta política</h2>
            <p>
              Si actualizamos esta política, publicaremos la nueva versión aquí con la fecha de modificación y te notificaremos por email si los cambios son sustanciales.
            </p>
          </section>

        </article>

        <div className="mt-12 pt-6 border-t border-stone-200 text-sm text-stone-500 flex flex-wrap gap-4">
          <Link href="/terminos" className="hover:text-teal-700 underline">Términos y Condiciones</Link>
          <Link href="/acerca" className="hover:text-teal-700 underline">Sobre ServiTrust</Link>
          <Link href="/feedback" className="hover:text-teal-700 underline">Envíanos feedback</Link>
        </div>
      </main>
    </div>
  );
}
