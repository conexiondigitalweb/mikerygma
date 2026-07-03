import { Badge } from '@/components/ui/badge'

export function GenerationCounter({ used, limit }) {
  const isUnlimited = limit === -1
  const remaining = isUnlimited ? null : Math.max(limit - used, 0)
  const lowOnGenerations = !isUnlimited && remaining <= 1

  return (
    <div className="flex items-center gap-2">
      <Badge variant={lowOnGenerations ? 'destructive' : 'secondary'} className="text-sm">
        {isUnlimited ? 'Generaciones ilimitadas' : `${remaining} de ${limit} generaciones restantes`}
      </Badge>
    </div>
  )
}
