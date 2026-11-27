"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import type { TrackSnapshot } from "@/types/database";

export interface TrackModalButtonProps {
  tracks: TrackSnapshot[];
}

const TRACK_TITLE_COLORS = [
  "text-blue-600",
  "text-purple-600",
  "text-green-600",
  "text-orange-600",
];

const TRACK_BULLET_COLORS = [
  "text-blue-500",
  "text-purple-500",
  "text-green-500",
  "text-orange-500",
];

/**
 * Interactive "View Tracks" button and scrollable Conference Tracks modal,
 * preserving the legacy `#trackModal` interaction with full keyboard Escape
 * support and accessible dialog attributes.
 */
export function TrackModalButton({ tracks }: TrackModalButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("overflow-hidden");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("overflow-hidden");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center space-x-2 bg-white px-6 py-3 rounded-lg font-semibold text-gray-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-200 cursor-pointer"
      >
        <Calendar className="w-5 h-5" />
        <span>View Tracks</span>
      </button>

      {open && (
        <div
          id="trackModal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trackModalTitle"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 sm:pt-28 bg-black/40 backdrop-blur-sm"
        >
          <div
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{ height: "600px", maxHeight: "80vh" }}
          >
            <div className="p-6 border-b bg-white flex justify-between items-center">
              <h2
                id="trackModalTitle"
                className="text-2xl font-bold text-gray-800"
              >
                Conference Tracks
              </h2>
              <button
                type="button"
                aria-label="Close Conference Tracks"
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-black text-3xl p-2 leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto p-6 bg-gray-50 flex-1 min-h-0">
              <div className="space-y-6 pb-6">
                {tracks.map((track, idx) => {
                  const titleColor =
                    TRACK_TITLE_COLORS[idx % TRACK_TITLE_COLORS.length];
                  const bulletColor =
                    TRACK_BULLET_COLORS[idx % TRACK_BULLET_COLORS.length];
                  return (
                    <div
                      key={track.id}
                      className="bg-white shadow-sm p-6 rounded-2xl border border-gray-200 text-left"
                    >
                      <h3 className={`text-lg font-bold mb-4 ${titleColor}`}>
                        {track.name}
                      </h3>
                      <ul className="space-y-3 text-gray-700 text-sm">
                        {track.topics.map((topic) => (
                          <li key={topic} className="flex items-start gap-2">
                            <span className={bulletColor}>•</span>
                            <b>{topic}</b>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t bg-white text-center">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-8 py-2 bg-gray-900 text-white rounded-full font-semibold hover:bg-black transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
