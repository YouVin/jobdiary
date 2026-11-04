import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'text'

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'diary-button-primary',
  secondary: 'diary-button-secondary',
  text: 'diary-button-text',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return <button type="button" className={'diary-button ' + VARIANT_CLASS[variant] + ' ' + className} {...props} />
}
