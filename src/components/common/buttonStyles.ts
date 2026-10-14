import { clsx } from 'clsx';

const BASE_BUTTON = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-body font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50';
const BUTTON_VARIANTS = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover',
  secondary: 'border border-card-border bg-card text-text-primary hover:bg-column',
  danger: 'bg-status-rejected text-on-brand hover:opacity-90',
  dangerOutline: 'border border-status-rejected text-status-rejected hover:bg-status-rejected/10',
};

export function buttonClassName(variant: keyof typeof BUTTON_VARIANTS = 'primary', className?: string): string {
  return clsx(BASE_BUTTON, BUTTON_VARIANTS[variant], className);
}
