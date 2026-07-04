import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { PLANS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export function UpgradePrompt({
  feature,
  requiredPlan = 'mensajero',
  variant = 'inline',
  message,
  open,
  onOpenChange,
  className,
}) {
  const planLabel = PLANS[requiredPlan]?.name ?? requiredPlan

  if (variant === 'inline') {
    return (
      <p className={cn('flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <Lock className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span>{message ?? `Disponible en el Plan ${planLabel}`}</span>
        <Link to="/pricing" className="font-medium text-primary hover:underline">
          Ver planes
        </Link>
      </p>
    )
  }

  if (variant === 'overlay') {
    return (
      <div
        className={cn(
          'absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/80 p-4 text-center',
          className
        )}
      >
        <div className="max-w-sm space-y-3">
          <Lock className="mx-auto h-6 w-6 text-primary" />
          <p className="text-sm font-medium text-foreground">
            {message ?? `${feature} está disponible en el Plan ${planLabel}.`}
          </p>
          <Button size="sm" asChild>
            <Link to="/pricing">Ver planes</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-center sm:flex-row sm:text-left',
          className
        )}
      >
        <p className="text-sm text-foreground">{message ?? feature}</p>
        <Button size="sm" asChild className="w-full shrink-0 sm:w-auto">
          <Link to="/pricing">Ver planes</Link>
        </Button>
      </div>
    )
  }

  if (variant === 'modal') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desbloquea {feature}</DialogTitle>
            <DialogDescription>
              Esta función está disponible en el Plan {planLabel}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Ahora no
            </Button>
            <Button asChild>
              <Link to="/pricing">Ver planes</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return null
}
