export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div
      className={`${sizes[size]} border-2 border-dark-700 border-t-primary-500 rounded-full animate-spin ${className}`}
    />
  )
}
