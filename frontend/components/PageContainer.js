/**
 * PageContainer Component - Simple container for padding and layout
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 * @param {boolean} props.centered - Center content vertically (default: false)
 */
export default function PageContainer({ children, centered = false }) {
  const containerClasses = centered
    ? 'flex items-center justify-center py-12 min-h-screen'
    : 'py-12';

  return <div className={containerClasses}>{children}</div>;
}
