import * as React from 'react'
import { Button as LobeButton } from '@lobehub/ui'
import { cn } from '@/utils/cn'

// Map shadcn variants to Lobe UI variants
type ShadcnVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
type ShadcnSize = 'default' | 'sm' | 'lg' | 'icon'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ShadcnVariant
  size?: ShadcnSize
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', children, ...props }, ref) => {
    // Size classes for Tailwind (Lobe UI uses different sizing)
    const sizeClasses = {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 px-3 text-xs',
      lg: 'h-10 px-8',
      icon: 'h-9 w-9 p-0',
    }

    // Variant classes
    const variantClasses = {
      default: '',
      destructive: 'bg-red-500 hover:bg-red-600 text-white',
      outline: 'border border-input bg-transparent hover:bg-accent',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'bg-transparent hover:bg-accent',
      link: 'bg-transparent underline-offset-4 hover:underline text-primary',
    }

    return (
      <LobeButton
        ref={ref}
        className={cn(sizeClasses[size], variantClasses[variant], className)}
        {...props}
      >
        {children}
      </LobeButton>
    )
  }
)
Button.displayName = 'Button'

export { Button }
