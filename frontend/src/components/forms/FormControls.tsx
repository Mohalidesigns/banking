import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { useId } from 'react'
import { cx } from '@/utils/cx'

/**
 * Form controls per DS §8.15 / Spec §17.2: 8px radius, gray-300 border,
 * shadow-sm, navy focus border + ring, label above (12–14px/500),
 * help text and error message below. Required fields get an asterisk.
 */

const controlBase =
  'w-full rounded-lg border bg-card px-3 py-2.5 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-tertiary disabled:cursor-not-allowed disabled:bg-page disabled:text-ink-tertiary'
const controlStates = (invalid?: boolean) =>
  invalid
    ? 'border-error focus:border-error focus:ring-2 focus:ring-error/40'
    : 'border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/30'

interface FieldWrapperProps {
  id: string
  label?: ReactNode
  help?: ReactNode
  error?: string
  required?: boolean
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
  className?: string
}

function FieldWrapper({ id, label, help, error, required, children, className }: FieldWrapperProps) {
  const helpId = help ? `${id}-help` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
          {required && (
            <span className="ml-0.5 text-error" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only">(required)</span>}
        </label>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {help && !error && (
        <p id={helpId} className="text-xs text-ink-secondary">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label?: ReactNode
  help?: ReactNode
  error?: string
  id?: string
}

export function TextInput({ label, help, error, id, required, className, ...rest }: TextInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <FieldWrapper id={inputId} label={label} help={help} error={error} required={required}>
      {({ describedBy, invalid }) => (
        <input
          id={inputId}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cx(controlBase, controlStates(invalid), 'outline-none', className)}
          {...rest}
        />
      )}
    </FieldWrapper>
  )
}

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label?: ReactNode
  help?: ReactNode
  error?: string
  id?: string
}

export function TextArea({ label, help, error, id, required, className, rows = 4, ...rest }: TextAreaProps) {
  const autoId = useId()
  const areaId = id ?? autoId
  return (
    <FieldWrapper id={areaId} label={label} help={help} error={error} required={required}>
      {({ describedBy, invalid }) => (
        <textarea
          id={areaId}
          rows={rows}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cx(controlBase, controlStates(invalid), 'resize-y outline-none', className)}
          {...rest}
        />
      )}
    </FieldWrapper>
  )
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label?: ReactNode
  help?: ReactNode
  error?: string
  id?: string
  options: SelectOption[]
  placeholder?: string
}

export function Select({
  label,
  help,
  error,
  id,
  options,
  placeholder,
  required,
  className,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <FieldWrapper id={selectId} label={label} help={help} error={error} required={required}>
      {({ describedBy, invalid }) => (
        <select
          id={selectId}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={cx(controlBase, controlStates(invalid), 'cursor-pointer appearance-none outline-none', className)}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldWrapper>
  )
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  label: ReactNode
  help?: ReactNode
  error?: string
  id?: string
}

export function Checkbox({ label, help, error, id, required, className, ...rest }: CheckboxProps) {
  const autoId = useId()
  const boxId = id ?? autoId
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <div className="flex items-start gap-2">
        <input
          id={boxId}
          type="checkbox"
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${boxId}-error` : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-primary shadow-sm"
          {...rest}
        />
        <label htmlFor={boxId} className="cursor-pointer text-sm text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-error" aria-hidden="true">
              *
            </span>
          )}
        </label>
      </div>
      {help && !error && <p className="pl-6 text-xs text-ink-secondary">{help}</p>}
      {error && (
        <p id={`${boxId}-error`} role="alert" className="pl-6 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

export interface ToggleProps {
  label: ReactNode
  help?: ReactNode
  id?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function Toggle({ label, help, id, checked, onCheckedChange, disabled, className }: ToggleProps) {
  const autoId = useId()
  const toggleId = id ?? autoId
  const labelId = `${toggleId}-label`
  return (
    <div className={cx('flex items-center justify-between gap-4', className)}>
      <div>
        <span id={labelId} className="text-sm font-medium text-ink">
          {label}
        </span>
        {help && <p className="text-xs text-ink-secondary">{help}</p>}
      </div>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        onClick={() => onCheckedChange(!checked)}
        disabled={disabled}
        className={cx(
          'relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40',
          checked ? 'bg-success' : 'bg-gray-300',
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  )
}
