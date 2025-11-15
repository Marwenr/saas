/**
 * Container component - Reusable wrapper with paddings and max-width
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to wrap
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.fullWidth - If true, removes max-width constraint
 */
export default function Container({ children, className = '', fullWidth = false }) {
  const baseClasses = 'mx-auto px-4 sm:px-6 lg:px-8';
  const widthClasses = fullWidth ? '' : 'max-w-7xl';
  const combinedClasses = `${baseClasses} ${widthClasses} ${className}`.trim();

  return (
    <div className={combinedClasses}>
      {children}
    </div>
  );
}

