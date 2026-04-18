import Link from 'next/link';
import Navbar from '@/components/navbar';

export const metadata = {
  title: 'Términos y Condiciones | ServiTrust Panamá',
  description: 'Términos y condiciones de uso de la plataforma ServiTrust Panamá.',
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">← Inicio</Link>

        <header className="mb-8 mt-2">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-2">Términos y Condiciones</h1>
          <p className="text-sm text-stone-500">Última actualización: abril 2026</p>
        </header>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-10 text-sm text-amber-900">
          <strong>⚠️ Documento preliminar.</strong> Este texto es un borrador inicial para la fase beta de ServiTrust. Antes del lanzamiento público comercial se revisará con asesoría legal panameña. Si encuentras algo que deba aclararse, escríbenos en{' '}
          <Link href="/feedback" className="underline font-semibold">feedback</Link>.
        </div>

        <article className="prose prose-stone max-w-none space-y-8 text-stone-700 leading-relaxed">

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">1. Quiénes somos</h2>
            <p>
              ServiTrust Panamá ("la Plataforma", "nosotros") es un marketplace digital que conecta a personas y empresas en Panamá que requieren servicios profesionales ("Clientes") con profesionales independientes o empresas que ofrecen dichos servicios ("Proveedores").
            </p>
            <p className="mt-2">
              <strong>Datos del operador:</strong> [PENDIENTE — debes agregar razón social, RUC, dirección fiscal y contacto legal aquí].
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">2. Naturaleza del servicio</h2>
            <p>
              ServiTrust actúa exclusivamente como <strong>intermediario tecnológico</strong>. No somos parte del contrato de prestación de servicios entre Clientes y Proveedores. No somos empleador de los Proveedores. No garantizamos la calidad, idoneidad, puntualidad o resultado del trabajo contratado — aunque hacemos esfuerzos razonables para verificar identidades y certificaciones.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">3. Uso de la plataforma</h2>
            <p>Para usar ServiTrust debes:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Ser mayor de 18 años o contar con autorización de tu representante legal.</li>
              <li>Proporcionar información veraz, actualizada y completa en tu registro.</li>
              <li>Mantener la confidencialidad de tus credenciales de acceso.</li>
              <li>No usar la plataforma para actividades ilegales, fraudulentas o que dañen a terceros.</li>
              <li>No publicar contenido ofensivo, discriminatorio o que infrinja derechos de terceros.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">4. Registro como Proveedor</h2>
            <p>
              Los Proveedores se comprometen a:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Contar con las licencias, permisos y seguros requeridos por la ley panameña para ejercer su oficio.</li>
              <li>Cumplir con las normas tributarias aplicables (ITBMS, impuesto sobre la renta, etc.).</li>
              <li>Ofrecer servicios con profesionalismo y cumplir lo acordado en el chat con el Cliente.</li>
              <li>No solicitar pagos fuera de la plataforma una vez integrados los pagos protegidos.</li>
            </ul>
            <p className="mt-2">
              La "verificación" de un perfil significa que nuestro equipo revisó identidad y documentación básica. <strong>No constituye garantía</strong> sobre la calidad del servicio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">5. Precios y pagos</h2>
            <p>
              Los precios publicados en los paquetes son fijados por cada Proveedor y pueden ajustarse de común acuerdo en el chat antes de contratar. En la fase actual de la plataforma, los pagos se realizan <strong>directamente entre Cliente y Proveedor</strong>, por los medios que acuerden.
            </p>
            <p className="mt-2">
              ServiTrust no procesa actualmente transacciones financieras. Cuando se active esta función, se publicará un anexo adicional con las reglas de custodia (escrow), reembolsos y comisiones.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">6. Reseñas y contenido generado</h2>
            <p>
              Las reseñas son opiniones personales de los Clientes sobre su experiencia. Solo pueden publicar reseñas los Clientes con un trabajo efectivamente completado. Nos reservamos el derecho de moderar, ocultar o eliminar contenido que:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Sea falso, engañoso o difamatorio.</li>
              <li>Contenga insultos, amenazas o discriminación.</li>
              <li>Incluya datos personales de terceros sin consentimiento.</li>
              <li>Viole la ley panameña o derechos de propiedad intelectual.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">7. Suspensión y cancelación de cuentas</h2>
            <p>
              Podemos suspender o eliminar cuentas que incumplan estos Términos, cometan fraude, reciban reclamos reiterados o pongan en riesgo la seguridad de la comunidad. El usuario puede solicitar la eliminación de su cuenta en cualquier momento contactando a soporte.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">8. Limitación de responsabilidad</h2>
            <p>
              ServiTrust no será responsable por daños indirectos, lucro cesante, pérdida de datos o daños que resulten de:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Incumplimientos, negligencia o dolo de Clientes o Proveedores.</li>
              <li>Interrupciones de la plataforma por causas técnicas o de fuerza mayor.</li>
              <li>Contenido publicado por terceros.</li>
              <li>Decisiones tomadas por los usuarios basadas en información de la plataforma.</li>
            </ul>
            <p className="mt-2">
              La plataforma se provee "tal cual" y "según disponibilidad", sin garantías expresas o implícitas más allá de las exigidas por ley.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">9. Propiedad intelectual</h2>
            <p>
              El software, la marca, el diseño y los contenidos creados por ServiTrust son propiedad de sus titulares. Los usuarios conservan los derechos sobre el contenido que suben (fotos, descripciones, reseñas) pero otorgan a ServiTrust una licencia no exclusiva, gratuita y mundial para mostrarlo en la plataforma.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">10. Modificaciones</h2>
            <p>
              Podemos actualizar estos Términos cuando sea necesario. Los cambios sustanciales se notificarán en la plataforma y por email (si tienes cuenta). El uso continuado tras la notificación implica aceptación.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">11. Ley aplicable y jurisdicción</h2>
            <p>
              Estos Términos se rigen por las leyes de la República de Panamá. Cualquier controversia se resolverá ante los tribunales competentes de Panamá, salvo que la ley imponga otra jurisdicción.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-3">12. Contacto</h2>
            <p>
              Para reclamos, dudas o solicitudes legales puedes escribirnos desde{' '}
              <Link href="/feedback" className="text-teal-700 underline font-medium">nuestra página de feedback</Link>
              {' '}o al correo [PENDIENTE — agregar email oficial de contacto legal].
            </p>
          </section>

        </article>

        <div className="mt-12 pt-6 border-t border-stone-200 text-sm text-stone-500 flex flex-wrap gap-4">
          <Link href="/privacidad" className="hover:text-teal-700 underline">Política de Privacidad</Link>
          <Link href="/acerca" className="hover:text-teal-700 underline">Sobre ServiTrust</Link>
          <Link href="/feedback" className="hover:text-teal-700 underline">Envíanos feedback</Link>
        </div>
      </main>
    </div>
  );
}
