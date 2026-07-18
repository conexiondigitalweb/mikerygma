import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

// Envuelve Input con un botón de mostrar/ocultar (Eye/EyeOff) — usado en
// TODOS los campos de contraseña de la app (login, registro, restablecer
// contraseña) en vez de repetir el toggle en cada formulario.
function PasswordInput({ className, ...props }) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // tabIndex={-1}: el toggle es un atajo visual, no debe interrumpir el
        // tab order entre el campo de contraseña y el siguiente control del formulario.
        tabIndex={-1}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export { PasswordInput }
