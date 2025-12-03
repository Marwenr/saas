/**
 * Card Component - Reusable card with purple theme
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.header - Optional header content
 * @param {React.ReactNode} props.footer - Optional footer content
 */
export default function Card({ children, className = '', header, footer }) {
  return (
    <div
      className={`
        bg-white dark:bg-black/40
        border border-purple-200 dark:border-purple-800/50
        rounded-xl p-8
        shadow-lg shadow-purple-500/10 dark:shadow-purple-900/30
        backdrop-blur-md
        transition-all duration-200
        ${className}
      `
        .trim()
        .replace(/\s+/g, ' ')}
    >
      {header && (
        <div className="mb-6 pb-4 border-b border-purple-100 dark:border-purple-800/50">
          {header}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div className="mt-6 pt-4 border-t border-purple-100 dark:border-purple-800/50">
          {footer}
        </div>
      )}
    </div>
  );
}
