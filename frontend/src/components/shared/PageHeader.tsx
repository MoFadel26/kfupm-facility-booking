import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  action,
  badge,
}: {
  title: string
  description?: string
  action?: ReactNode
  badge?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  )
}
