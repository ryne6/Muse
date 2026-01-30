import * as React from 'react'
import { Input as LobeInput } from '@lobehub/ui'
import { cn } from '@/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <LobeInput
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md [&:hover]:!border-[1px]',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
