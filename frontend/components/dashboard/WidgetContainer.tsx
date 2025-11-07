import { ReactNode, useState } from 'react';

interface WidgetContainerProps {
  title: string;
  icon?: ReactNode;
  accentColorClass?: string;
  headerExtras?: ReactNode;
  children: ReactNode;
  defaultCollapsed?: boolean;
  collapsedSummary?: ReactNode;
  className?: string;
}

export default function WidgetContainer({
  title,
  icon,
  accentColorClass = 'border-blue-500',
  headerExtras,
  children,
  defaultCollapsed = false,
  collapsedSummary,
  className = '',
}: WidgetContainerProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <div
      className={`
        bg-white rounded-xl p-4
        hover:shadow-lg transition-shadow
        border-l-4 ${accentColorClass}
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-gray-800">
          {icon && <span className="text-xl leading-none">{icon}</span>}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {headerExtras}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="text-gray-400 hover:text-gray-700 transition-transform"
            aria-label={collapsed ? `${title} 위젯 펼치기` : `${title} 위젯 접기`}
          >
            <span className={`inline-block transform transition-transform ${collapsed ? '' : 'rotate-180'}`}>
              ⌃
            </span>
          </button>
        </div>
      </div>

      {collapsed ? (
        collapsedSummary ? (
          <div className="mt-3 text-xs text-gray-500">{collapsedSummary}</div>
        ) : (
          <div className="mt-3 text-xs text-gray-400">펼쳐서 자세히 보기</div>
        )
      ) : (
        <div className="mt-3">{children}</div>
      )}
    </div>
  );
}
