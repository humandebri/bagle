'use client';

import * as React from 'react';

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked = false,
  onCheckedChange,
  disabled = false,
  className = '',
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      className={`w-4 h-4 text-[#887c5d] bg-white border-gray-300 rounded focus:ring-[#887c5d] focus:ring-2 ${className}`}
    />
  );
}