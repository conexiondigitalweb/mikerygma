import { LegalLayout } from '@/components/LegalLayout'

const UPDATED_AT = '18 de julio de 2026'

export function Terminos() {
  return (
    <LegalLayout title="Términos y Condiciones" updatedAt={UPDATED_AT}>
      <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
        <strong>Aviso de versión beta:</strong> MiKerygma se encuentra actualmente en fase beta. Estos Términos y
        Condiciones son una <strong>versión beta</strong> del documento legal definitivo y pueden ajustarse a medida
        que el servicio evolucione. Algunos puntos quedan marcados explícitamente como pendientes de definir.
      </p>

      <h2>1. Identidad del responsable del servicio</h2>
      <p>
        MiKerygma es operado por <strong>Doiler Alfonso Sanjuán Sánchez</strong>, identificado con cédula de
        ciudadanía No. <strong>91.476.604</strong>, de nacionalidad colombiana, quien presta este servicio como
        persona natural bajo el nombre comercial <strong>"La Gracia que Transforma"</strong>.
      </p>
      <p>
        "La Gracia que Transforma" no es una persona jurídica ni una sociedad registrada — es el nombre comercial
        bajo el cual Doiler Alfonso Sanjuán Sánchez ofrece este y otros servicios. Toda referencia en este documento
        a "La Gracia que Transforma", "MiKerygma", "nosotros" o "el responsable" se entiende hecha a Doiler Alfonso
        Sanjuán Sánchez en su calidad de persona natural.
      </p>
      <p>Contacto: lagraciaquetransforma@gmail.com</p>

      <h2>2. Descripción del servicio</h2>
      <p>
        MiKerygma es un copiloto ministerial que usa inteligencia artificial (a través de la API de Anthropic) para
        asistir a pastores, líderes y creadores de contenido cristiano hispanohablantes en la preparación de
        sermones, devocionales, contenido para redes sociales y oraciones, a partir de un pasaje bíblico, un tema,
        una situación pastoral o la transcripción de un video de YouTube.
      </p>
      <p>
        El servicio también puede incluir notas de apoyo sobre el idioma bíblico original (griego/hebreo) ancladas a
        fuentes léxicas públicas, y una revisión automatizada de coherencia teológica interna del contenido generado.
        Todo el contenido es producido con apoyo de inteligencia artificial y está sujeto al descargo de
        responsabilidad de la sección 3.
      </p>

      <h2>3. Descargo de responsabilidad teológico y pastoral</h2>
      <p>
        <strong>
          El contenido generado por MiKerygma es producido por un modelo de inteligencia artificial y constituye
          ÚNICAMENTE una herramienta de apoyo a la preparación de mensajes. No sustituye el discernimiento pastoral
          del usuario, su responsabilidad doctrinal ante su congregación o comunidad de fe, ni la revisión,
          corrección y aprobación del contenido antes de predicarlo, publicarlo o compartirlo.
        </strong>
      </p>
      <p>
        MiKerygma no garantiza la ausencia total de errores interpretativos, imprecisiones teológicas, anacronismos
        o afirmaciones que no reflejen fielmente la doctrina de la denominación o tradición del usuario. La revisión
        teológica automatizada integrada en el servicio es una capa adicional de control de calidad, no una
        validación doctrinal exhaustiva ni un sustituto del criterio humano.
      </p>
      <p>
        <strong>
          El usuario es el único responsable del contenido final que efectivamente predica, enseña, publica o
          comparte con terceros
        </strong>
        , y debe verificar toda cita bíblica contra su propia Biblia antes de usarla en público — incluyendo los
        casos en que el pasaje se entregue parafraseado en lugar de citado textualmente, señalados explícitamente por
        la aplicación cuando ocurren.
      </p>

      <h2>4. Cuentas de usuario y uso aceptable</h2>
      <ul>
        <li>El servicio está dirigido a personas mayores de edad.</li>
        <li>El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
        <li>La información de registro y de perfil debe ser veraz.</li>
        <li>
          No está permitido usar MiKerygma para generar contenido ilegal, difamatorio, discriminatorio, o que
          incite al odio o la violencia.
        </li>
        <li>No está permitido intentar vulnerar, sobrecargar o realizar ingeniería inversa de la plataforma.</li>
        <li>
          No está permitido revender el acceso a MiKerygma ni el contenido generado como si fuera un servicio propio
          de generación de contenido con IA.
        </li>
      </ul>
      <p>
        El incumplimiento de estas condiciones puede resultar en la suspensión o terminación de la cuenta, conforme
        a la sección 9.
      </p>

      <h2>5. Planes, precios y proceso de pago</h2>
      <p>MiKerygma ofrece tres planes: Gratis (3 generaciones/mes), Mensajero (USD 9/mes, 15 generaciones/mes) y Proclamador (USD 19/mes, 40 generaciones/mes).</p>
      <p>
        <strong>MiKerygma no cuenta actualmente con una pasarela de pago automática integrada.</strong> La
        activación y renovación de los planes Mensajero y Proclamador se coordina de forma manual:
      </p>
      <ul>
        <li>El usuario solicita la activación o renovación de su plan por WhatsApp.</li>
        <li>
          El pago se realiza por transferencia bancaria o Nequi, a los datos que se comparten directamente por ese
          mismo canal.
        </li>
        <li>
          Una vez confirmado el pago, el plan se activa manualmente en la plataforma <strong>el mismo día</strong>.
        </li>
        <li>
          Los ciclos de facturación se renuevan mensualmente desde la fecha de activación de cada plan. Si un plan
          pago no se renueva a tiempo, la cuenta desciende automáticamente al Plan Gratis y el usuario es notificado
          dentro de la aplicación.
        </li>
      </ul>

      <h2>6. Política de no reembolso</h2>
      <p>
        Dado que todo usuario puede probar MiKerygma gratuitamente mediante el Plan Gratis antes de decidir pagar por
        un plan superior, los pagos ya realizados por un periodo de suscripción <strong>no son reembolsables</strong>
        , salvo error de cobro comprobado.
      </p>
      <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        [PLACEHOLDER AJUSTABLE] Esta política de reembolsos es provisional para la fase beta y puede modificarse
        antes de la salida a producción definitiva.
      </p>

      <h2>7. Propiedad intelectual</h2>
      <p>
        El contenido generado a partir del uso que el usuario hace de MiKerygma (sermones, devocionales, publicaciones
        y oraciones) queda a disposición del usuario para su uso pastoral y ministerial. La plataforma, su código,
        diseño, marca "MiKerygma" y el nombre comercial "La Gracia que Transforma" son propiedad de Doiler Alfonso
        Sanjuán Sánchez. El modelo de inteligencia artificial subyacente es propiedad de Anthropic y se usa bajo los
        términos de su API.
      </p>

      <h2>8. Disponibilidad del servicio</h2>
      <p>
        MiKerygma se encuentra en fase beta. El servicio se ofrece "tal cual" ("as is"), sin garantía de
        disponibilidad continua (uptime), y sus funcionalidades, límites de plan y precios pueden cambiar mientras
        dure esta fase.
      </p>

      <h2>9. Terminación de cuenta</h2>
      <p>
        El usuario puede solicitar la eliminación de su cuenta en cualquier momento escribiendo a
        lagraciaquetransforma@gmail.com. El responsable del servicio puede suspender o terminar cuentas que
        incumplan estos Términos, especialmente lo dispuesto en la sección 4.
      </p>

      <h2>10. Ley aplicable</h2>
      <p>
        Estos Términos se rigen por las leyes de la República de Colombia. Cualquier controversia relacionada con
        el uso de MiKerygma se intentará resolver primero por contacto directo a
        lagraciaquetransforma@gmail.com, y en su defecto, ante los jueces y autoridades competentes de Colombia.
      </p>

      <h2>Modificaciones a estos Términos</h2>
      <p>
        Estos Términos pueden actualizarse mientras MiKerygma esté en fase beta. La fecha de "Última actualización"
        en la parte superior de este documento refleja la versión vigente.
      </p>
    </LegalLayout>
  )
}

export default Terminos
