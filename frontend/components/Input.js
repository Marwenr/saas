/**
 * Input Component - Reusable input field with consistent styling
 * @param {Object} props
 * @param {string} props.type - Input type (text, email, password, tel, etc.)
 * @param {string} props.id - Input ID
 * @param {string} props.name - Input name
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.required - Required field
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.className - Additional CSS classes
 * @param {number} props.minLength - Minimum length
 * @param {number} props.maxLength - Maximum length
 * @param {string} props.label - Label text
 * @param {React.ReactNode} props.labelSuffix - Additional content after label (e.g., required asterisk)
 */
export default function Input({
  type = 'text',
  id,
  name,
  value,
  onChange,
  placeholder = '',
  required = false,
  disabled = false,
  className = '',
  minLength,
  maxLength,
  label,
  labelSuffix,
  ...props
}) {
  const inputClasses = `
    w-full px-4 py-3 
    border border-purple-200 dark:border-purple-800 
    rounded-lg 
    bg-white dark:bg-neutral-900/50 
    text-purple-900 dark:text-purple-100 
    placeholder-[#a0a0a0] dark:placeholder-[#a0a0a0]
    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 
    transition-all 
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}
  `
    .trim()
    .replace(/\s+/g, ' ');

  const inputElement = (
    <input
      type={type}
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      minLength={minLength}
      maxLength={maxLength}
      className={inputClasses}
      {...props}
    />
  );

  if (label) {
    return (
      <div>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-purple-900 dark:text-purple-200 mb-2"
        >
          {label} {labelSuffix}
        </label>
        {inputElement}
      </div>
    );
  }

  return inputElement;
}
