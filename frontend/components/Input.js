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
import { forwardRef } from 'react';

const Input = forwardRef(
  (
    {
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
    },
    ref
  ) => {
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

    // Support both controlled (value/onChange) and uncontrolled (react-hook-form) modes
    // Spread props first (contains react-hook-form's onChange, onBlur, name, ref)
    // Then override with explicit value/onChange if provided (controlled mode)
    const inputProps = {
      type,
      id,
      placeholder,
      required,
      disabled,
      minLength,
      maxLength,
      className: inputClasses,
      ...props, // Spread props first (react-hook-form props including ref, onChange, onBlur, name come here)
    };

    // Only override value/onChange if explicitly provided (controlled mode)
    // Otherwise, react-hook-form will handle it via register (already in ...props)
    if (value !== undefined) {
      inputProps.value = value;
    }
    if (onChange) {
      inputProps.onChange = onChange;
    }

    // Ensure name is set (either from props or explicit)
    // react-hook-form's name from register() takes precedence
    if (name && !inputProps.name) {
      inputProps.name = name;
    }

    // Merge refs: react-hook-form's ref (from ...props) takes precedence, but also support forwardRef
    // If both exist, react-hook-form's ref is used (it's in ...props.ref)
    // If only forwardRef ref exists, use it
    if (ref && !inputProps.ref) {
      inputProps.ref = ref;
    }

    const inputElement = <input {...inputProps} />;

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
);

Input.displayName = 'Input';

export default Input;
