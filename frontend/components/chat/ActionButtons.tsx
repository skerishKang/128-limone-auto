interface ActionButton {
  id: string;
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface ActionButtonsProps {
  buttons: ActionButton[];
  className?: string;
}

export default function ActionButtons({ buttons, className = '' }: ActionButtonsProps) {
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {buttons.map((button) => (
        <button
          key={button.id}
          onClick={button.action}
          disabled={button.disabled}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
            ${variantStyles[button.variant || 'secondary']}
            ${button.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {button.icon && <span className="w-4 h-4">{button.icon}</span>}
          {button.label}
        </button>
      ))}
    </div>
  );
}
