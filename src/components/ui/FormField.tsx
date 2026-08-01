import { forwardRef, type InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, id, className = "", ...rest }, ref) => {
    const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        <input
          id={fieldId}
          ref={ref}
          className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            ${error ? "border-rose-400" : "border-slate-300"} ${className}`}
          {...rest}
        />
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    );
  }
);
FormField.displayName = "FormField";

export function SelectField({
  label,
  error,
  id,
  children,
  ...rest
}: {
  label: string;
  error?: string;
  id?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={fieldId}
        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 bg-white
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          ${error ? "border-rose-400" : "border-slate-300"}`}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
