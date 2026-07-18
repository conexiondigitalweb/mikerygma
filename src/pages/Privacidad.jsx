import { LegalLayout } from '@/components/LegalLayout'

const UPDATED_AT = '18 de julio de 2026'

export function Privacidad() {
  return (
    <LegalLayout title="Política de Privacidad" updatedAt={UPDATED_AT}>
      <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
        <strong>Aviso de versión beta:</strong> MiKerygma se encuentra actualmente en fase beta. Esta Política de
        Privacidad es una <strong>versión beta</strong> del documento definitivo y puede ajustarse a medida que el
        servicio evolucione.
      </p>

      <h2>1. Responsable del tratamiento de datos</h2>
      <p>
        El tratamiento de los datos personales recolectados por MiKerygma está a cargo de{' '}
        <strong>Doiler Alfonso Sanjuán Sánchez</strong>, identificado con cédula de ciudadanía No.{' '}
        <strong>91.476.604</strong>, de nacionalidad colombiana, quien opera este servicio como persona natural bajo
        el nombre comercial <strong>"La Gracia que Transforma"</strong> — no una persona jurídica registrada.
      </p>
      <p>Contacto para asuntos de privacidad y ejercicio de derechos de datos: lagraciaquetransforma@gmail.com</p>

      <h2>2. Qué datos recolectamos</h2>
      <ul>
        <li>
          <strong>Datos de registro:</strong> nombre completo y correo electrónico. La autenticación (incluida la
          contraseña, cuando se usa) es gestionada por Supabase Auth; MiKerygma no almacena contraseñas en texto
          plano.
        </li>
        <li>
          <strong>Datos de perfil ministerial:</strong> rol (pastor, líder, creador de contenido, otro),
          denominación (incluido el campo libre para "Otra"), país y nombre de la iglesia.
        </li>
        <li>
          <strong>ADN Pastoral (opcional):</strong> centro teológico, estilo de enseñanza, tono preferido, nivel de
          confrontación, tipo de aplicación, forma de cierre, audiencia principal, frases o enfoques a evitar, e
          instrucciones pastorales permanentes.
        </li>
        <li>
          <strong>Historial de uso:</strong> los pasajes, temas, situaciones o transcripciones de YouTube que el
          usuario ingresa, el contenido generado (sermones, devocionales, publicaciones para redes, oraciones), y
          cualquier estado, etiqueta, nota o marca de favorito que el usuario agregue en su Biblioteca Ministerial.
        </li>
        <li>
          <strong>Datos de plan:</strong> plan actual, fechas del ciclo de facturación y cantidad de generaciones
          usadas. MiKerygma <strong>no almacena datos de tarjetas ni información bancaria</strong>, porque los pagos
          se coordinan manualmente por WhatsApp fuera de la plataforma (ver Términos y Condiciones).
        </li>
      </ul>

      <h2>3. Proveedores externos que procesan datos por cuenta nuestra</h2>
      <p>Para operar, MiKerygma se apoya en los siguientes proveedores externos (encargados del tratamiento):</p>
      <ul>
        <li>
          <strong>Anthropic</strong> (API de Claude, Estados Unidos): procesa el contenido que el usuario ingresa
          (pasajes, temas, situaciones, transcripciones) y las preferencias de ADN Pastoral necesarias para generar
          el contenido solicitado.
        </li>
        <li>
          <strong>Supabase:</strong> almacenamiento de la base de datos y autenticación de usuarios.
        </li>
        <li>
          <strong>Resend:</strong> envío de correos transaccionales (ej. confirmación de cuenta).
        </li>
        <li>
          <strong>Bolls Bible API</strong> (bolls.life): consulta de datos léxicos públicos del griego/hebreo
          bíblico — recibe referencias bíblicas, no datos personales del usuario.
        </li>
      </ul>
      <p>
        MiKerygma no controla las políticas de privacidad de estos terceros y recomienda al usuario revisarlas si lo
        desea. El uso de estos proveedores es necesario para el funcionamiento del servicio.
      </p>

      <h2>4. Para qué usamos estos datos</h2>
      <ul>
        <li>Prestar el servicio: generar contenido, gestionar la cuenta y el plan del usuario.</li>
        <li>Personalizar el contenido generado según el ADN Pastoral y la denominación del usuario.</li>
        <li>Comunicarnos con el usuario sobre su cuenta, su plan y soporte.</li>
        <li>Mejorar el servicio, con datos agregados que no identifican directamente al usuario.</li>
      </ul>

      <h2>5. Cumplimiento con la Ley 1581 de 2012 (Colombia)</h2>
      <p>
        MiKerygma trata los datos personales de acuerdo con la Ley 1581 de 2012 y sus decretos reglamentarios. Como
        titular de sus datos, el usuario tiene derecho a:
      </p>
      <ul>
        <li>Conocer, actualizar y rectificar sus datos personales.</li>
        <li>Solicitar prueba de la autorización otorgada para el tratamiento de sus datos.</li>
        <li>Ser informado sobre el uso que se le ha dado a sus datos.</li>
        <li>
          Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.
        </li>
        <li>
          Revocar la autorización y/o solicitar la eliminación de sus datos, cuando no exista un deber legal o
          contractual que impida su eliminación.
        </li>
        <li>Acceder de forma gratuita a sus datos personales.</li>
      </ul>
      <p>
        Para ejercer cualquiera de estos derechos, el usuario puede escribir a{' '}
        <strong>lagraciaquetransforma@gmail.com</strong> indicando su solicitud. Se dará respuesta{' '}
        <strong>dentro de los 15 días hábiles</strong> siguientes a la recepción de la solicitud.
      </p>

      <h2>6. No venta de datos a terceros</h2>
      <p>
        MiKerygma no vende, alquila ni comercializa los datos personales de sus usuarios a terceros. Los datos solo
        se comparten con los proveedores externos estrictamente necesarios para operar el servicio (ver sección 3).
      </p>

      <h2>7. Publicidad y medición con Meta Pixel</h2>
      <p>
        MiKerygma usa el <strong>Meta Pixel</strong> (Facebook/Instagram) con fines publicitarios y de medición de
        campañas. Esto implica el uso de cookies y tecnologías similares de Meta, que pueden recopilar datos de
        navegación en MiKerygma para mostrar anuncios relevantes en Facebook e Instagram y medir la efectividad de
        esas campañas.
      </p>
      <p>
        El usuario puede gestionar sus preferencias de anuncios directamente en la configuración de su cuenta de
        Facebook o Instagram. Meta procesa estos datos bajo sus propias políticas de privacidad, independientes de
        esta Política.
      </p>

      <h2>8. Conservación y seguridad de la información</h2>
      <p>
        Los datos se conservan mientras la cuenta del usuario esté activa, y hasta{' '}
        <strong>6 meses adicionales</strong> después de que el usuario elimine su cuenta, para fines de respaldo y
        soporte, salvo que la ley exija un plazo distinto. MiKerygma toma medidas razonables para proteger los datos
        personales, aunque ningún sistema es completamente infalible.
      </p>

      <h2>Cambios a esta política</h2>
      <p>
        Esta Política de Privacidad puede actualizarse mientras MiKerygma esté en fase beta. La fecha de "Última
        actualización" en la parte superior de este documento refleja la versión vigente.
      </p>
    </LegalLayout>
  )
}

export default Privacidad
