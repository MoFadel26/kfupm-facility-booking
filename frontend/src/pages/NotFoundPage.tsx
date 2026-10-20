import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const { pathname } = useLocation()

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-primary">
        404
      </span>
      <h1 className="mt-4 text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
        Page not found
      </h1>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
        No page exists at <span className="font-mono text-foreground">{pathname}</span>.
      </p>
      <Button asChild className="mt-6 h-9 px-4 text-xs font-semibold shadow-xs">
        <Link to="/">
          <ArrowLeft className="size-3.5 mr-1.5" /> Back to Overview
        </Link>
      </Button>
    </div>
  )
}
