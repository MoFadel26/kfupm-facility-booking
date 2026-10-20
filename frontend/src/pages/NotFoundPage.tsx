import { Link, useLocation } from 'react-router-dom'
import { ArrowLeftIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const { pathname } = useLocation()

  return (
    <div className="py-16">
      <h1 className="text-2xl text-brand-ink sm:text-[1.75rem]">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        No page exists at <span className="font-medium text-foreground">{pathname}</span>.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">
          <ArrowLeftIcon weight="bold" /> Back to overview
        </Link>
      </Button>
    </div>
  )
}
