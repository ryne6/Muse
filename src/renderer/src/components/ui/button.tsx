import { Button as LobeButton, type ButtonProps as LobeButtonProps } from '@lobehub/ui'
import { cn } from '@/utils/cn'

type ShadcnVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link'

type ShadcnSize = 'default' | 'sm' | 'lg' | 'icon'

export interface ButtonProps extends Omit<LobeButtonProps, 'variant' | 'size'> {
  variant?: ShadcnVariant
  size?: ShadcnSize
}

function Button({ variant, size, className, ...rest }: ButtonProps) {
  const lobeProps: Omit<LobeButtonProps, 'size'> & { size?: LobeButtonProps['size'] } = { ...rest }

  // Map variant
  switch (variant) {
    case 'destructive':
      lobeProps.danger = true
      break
    case 'outline':
      lobeProps.variant = 'outlined'
      break
    case 'ghost':
      lobeProps.type = 'text'
      break
    case 'secondary':
      lobeProps.variant = 'filled'
      break
    case 'link':
      lobeProps.type = 'link'
      break
  }

  // Map size
  let extraClass = ''
  switch (size) {
    case 'sm':
      lobeProps.size = 'small'
      break
    case 'lg':
      lobeProps.size = 'large'
      break
    case 'icon':
      lobeProps.size = 'small'
      extraClass = 'h-9 w-9 p-0'
      break
  }

  return (
    <LobeButton
      className={cn(extraClass, className)}
      {...lobeProps}
    />
  )
}

export { Button }
