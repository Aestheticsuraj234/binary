import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}

/** A label and an input, wired together for screen readers. */
export function FormField({
  name,
  label,
  type = 'text',
  autoComplete,
  placeholder,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="h-10"
        required
      />
    </div>
  );
}
