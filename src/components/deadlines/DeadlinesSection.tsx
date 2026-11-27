import type { DeadlineSnapshot } from "@/types/database";

export interface DeadlinesSectionProps {
  deadlines: DeadlineSnapshot[];
}

/**
 * Renders the sidebar Important Deadlines card with extended strikethrough
 * formatting, conference date accenting, and explicit IST (UTC+5:30) label.
 */
export function DeadlinesSection({ deadlines }: DeadlinesSectionProps) {
  const visibleDeadlines = deadlines.filter((d) => d.isVisible);

  return (
    <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-lg">
      <div className="border-b pb-3 mb-4 flex items-baseline justify-between gap-2">
        <h3 className="text-xl font-bold text-gray-900">Important Deadlines</h3>
        <span className="text-[11px] font-medium text-gray-500">
          IST (UTC+5:30)
        </span>
      </div>
      <ul className="space-y-4 text-base text-gray-600">
        {visibleDeadlines.map((item) => (
          <li
            key={item.id}
            className={`grid grid-cols-2 gap-2 items-start ${
              item.isConferenceDate ? "pt-2 border-t border-gray-50" : ""
            }`}
          >
            <span
              className={`leading-tight ${
                item.isConferenceDate ? "font-medium" : ""
              }`}
            >
              {item.title}:
            </span>
            {item.isExtended && item.originalDate ? (
              <div className="text-right">
                <p className="text-sm text-gray-500 line-through">
                  {item.originalDate}
                </p>
                <p className="font-semibold text-gray-900">{item.displayDate}</p>
              </div>
            ) : (
              <strong
                className={`text-right ${
                  item.isConferenceDate ? "text-orange-600" : "text-gray-800"
                }`}
              >
                {item.displayDate}
              </strong>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
