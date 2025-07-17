interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
}

const LoadingSpinner = ({ size = 'medium', className = '' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 ${sizeClasses[size]} ${className}`} />
  )
}

export default LoadingSpinner