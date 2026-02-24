"use client";

interface LikertScaleProps {
  value: number | undefined;
  onChange: (value: number) => void;
  itemId: string;
}

const labels = [
  "Совсем нет",
  "Скорее нет",
  "Частично",
  "Скорее да",
  "Полностью",
];

export default function LikertScale({ value, onChange, itemId }: LikertScaleProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2" role="radiogroup" aria-label="Оценка">
      {[1, 2, 3, 4, 5].map((score) => {
        const isSelected = value === score;
        return (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${score} — ${labels[score - 1]}`}
            tabIndex={isSelected || (value === undefined && score === 1) ? 0 : -1}
            onClick={() => onChange(score)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                if (score < 5) onChange(score + 1);
              }
              if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                if (score > 1) onChange(score - 1);
              }
            }}
            className={`
              relative flex flex-col items-center justify-center
              w-12 h-12 sm:w-14 sm:h-14
              rounded-xl text-sm font-semibold
              transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
              ${
                isSelected
                  ? "bg-brand-600 text-white shadow-md scale-110"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
              }
            `}
            id={`${itemId}-${score}`}
          >
            {score}
          </button>
        );
      })}
      <div className="hidden sm:flex ml-2 text-xs text-gray-400 min-w-[80px]">
        {value ? labels[value - 1] : ""}
      </div>
    </div>
  );
}
