import React from 'react';
import { Link } from 'react-router-dom';
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  href,
  type = 'button',
  disabled = false
}: ButtonProps) {
  // Style maps
  const variantStyles = {
    primary: 'bg-gold hover:bg-opacity-90 text-white',
    secondary: 'bg-soft-gold hover:bg-opacity-90 text-navy-ink',
    outline: 'bg-transparent border border-gold text-gold hover:bg-gold hover:text-white'
  };
  const sizeStyles = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  const baseStyles = 'rounded-card font-medium transition-all focus:outline-none focus:ring-2 focus:ring-gold focus:ring-opacity-50';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';
  const buttonStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`;
  // If href is provided, render as Link
  if (href) {
    return <Link to={href} className={buttonStyles}>
        {children}
      </Link>;
  }
  // Otherwise render as button
  return <button type={type} className={buttonStyles} onClick={onClick} disabled={disabled}>
      {children}
    </button>;
}