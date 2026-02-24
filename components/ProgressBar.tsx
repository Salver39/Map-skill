"use client";

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercent?: boolean;
}

export default function ProgressBar({
  current,
  total,
  label,
  showPercent = true,
}: ProgressBarProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-sm text-gray-600 font-medium">{label}</span>
          )}
          {showPercent && (
            <span className="text-sm text-gray-500 tabular-nums">
              {current}/{total}
              <span className="text-gray-400 ml-1">({percent}%)</span>
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
