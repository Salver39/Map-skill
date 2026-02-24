"use client";

import LikertScale from "./LikertScale";

interface QuestionCardProps {
  itemId: string;
  statement: string;
  levelTarget: number;
  value: number | undefined;
  index: number;
  onChange: (itemId: string, value: number) => void;
}

export default function QuestionCard({
  itemId,
  statement,
  levelTarget,
  value,
  index,
  onChange,
}: QuestionCardProps) {
  return (
    <div
      className={`
        p-4 sm:p-5 rounded-2xl border transition-colors duration-150
        ${value !== undefined ? "border-brand-200 bg-brand-50/30" : "border-gray-200 bg-white"}
      `}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] leading-relaxed text-gray-800 mb-3">
            {statement}
          </p>
          <div className="flex items-center justify-between gap-2">
            <LikertScale
              value={value}
              onChange={(v) => onChange(itemId, v)}
              itemId={itemId}
            />
            <span className="hidden lg:inline-flex text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
              L{levelTarget}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
