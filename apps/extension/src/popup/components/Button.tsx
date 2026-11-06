import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'compact'

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'diary-button-primary',
  secondary: 'diary-button-secondary',
  compact: 'diary-button-compact',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button type="button" className={'diary-button ' + VARIANT_CLASS[variant] + ' ' + className} {...props} />
}
