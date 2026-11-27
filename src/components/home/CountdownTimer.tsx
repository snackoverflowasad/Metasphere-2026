"use client";

import { useEffect, useState } from "react";
import { getCountdownParts, type CountdownParts } from "@/lib/dates/ist";

export interface CountdownTimerProps {
  targetDateIso: string;
  isArchived?: boolean;
}

const ZERO_COUNTDOWN: CountdownParts = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  isLive: false,
};

function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Displays the conference start countdown computed against the IST
 * (`Asia/Kolkata`) conference start timestamp, avoiding SSR hydration drift.
 */
export function CountdownTimer({
  targetDateIso,
  isArchived = false,
}: CountdownTimerProps) {
  const [parts, setParts] = useState<CountdownParts>(ZERO_COUNTDOWN);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => {
      setParts(getCountdownParts(targetDateIso, Date.now()));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [targetDateIso]);

  return (
    <div className="sticky top-24 sm:top-28">
      <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-md">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xs uppercase tracking-tighter text-orange-500 font-bold whitespace-nowrap">
              {isArchived ? "Edition Status:" : "Starts In:"}
            </h3>
            <p className="text-[10px] text-gray-400 whitespace-nowrap">
              IST (UTC+5:30)
            </p>
          </div>

          <div id="countdown-container" className="flex items-center gap-2">
            {mounted && parts.isLive ? (
              <p className="text-sm font-bold text-orange-500">
                {isArchived ? "Archived Edition" : "Event is Live!"}
              </p>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <span id="days" className="text-xl font-bold text-gray-900">
                    {padTwo(parts.days)}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase">
                    D
                  </span>
                </div>
                <span className="text-gray-300 font-light">:</span>
                <div className="flex items-center gap-1">
                  <span id="hours" className="text-xl font-bold text-gray-900">
                    {padTwo(parts.hours)}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase">
                    H
                  </span>
                </div>
                <span className="text-gray-300 font-light">:</span>
                <div className="flex items-center gap-1">
                  <span id="minutes" className="text-xl font-bold text-gray-900">
                    {padTwo(parts.minutes)}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase">
                    M
                  </span>
                </div>
                <span className="text-gray-300 font-light">:</span>
                <div className="flex items-center gap-1">
                  <span id="seconds" className="text-xl font-bold text-gray-900">
                    {padTwo(parts.seconds)}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase">
                    S
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
