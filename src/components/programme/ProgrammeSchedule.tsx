import type {
  ProgramSessionSnapshot,
  SpeakerSnapshot,
  TrackSnapshot,
} from "@/types/database";
import { formatIstDate, formatIstDateTime } from "@/lib/dates/ist";

export interface ProgrammeScheduleProps {
  sessions: ProgramSessionSnapshot[];
  tracks: TrackSnapshot[];
  speakers: SpeakerSnapshot[];
  qrAssetPath: string;
}

function resolveQrSrc(assetPath: string): string {
  if (!assetPath) return "/Assets/metasphere_editable_google_doc_qr.png";
  if (/^https?:\/\//i.test(assetPath) || assetPath.startsWith("/")) {
    return assetPath;
  }
  return `/${assetPath}`;
}

export function ProgrammeSchedule({
  sessions,
  tracks,
  speakers,
  qrAssetPath,
}: ProgrammeScheduleProps) {
  const trackById = new Map(tracks.map((t) => [t.id, t]));
  const speakerById = new Map(speakers.map((s) => [s.id, s]));

  if (sessions.length === 0) {
    return (
      <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:-translate-y-2 transition-all duration-300 max-w-xs mx-auto aspect-square flex flex-col items-center justify-center">
        <img
          src={resolveQrSrc(qrAssetPath)}
          alt="QR Code for Program"
          className="mx-auto mb-4 w-56 h-56 object-contain"
        />
        <p className="text-gray-700 font-medium">
          Scan the QR code to view the program schedule
        </p>
      </div>
    );
  }

  const groupedByDate = new Map<string, ProgramSessionSnapshot[]>();
  for (const session of sessions) {
    const list = groupedByDate.get(session.sessionDate) ?? [];
    list.push(session);
    groupedByDate.set(session.sessionDate, list);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-10">
      {Array.from(groupedByDate.entries()).map(([dateKey, daySessions]) => (
        <div key={dateKey} className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-900 border-b border-orange-200 pb-2">
            {formatIstDate(daySessions[0].startsAt)}
          </h3>
          <div className="space-y-4">
            {daySessions.map((session) => {
              const track = session.trackId
                ? trackById.get(session.trackId)
                : null;
              const speaker = session.speakerId
                ? speakerById.get(session.speakerId)
                : null;
              return (
                <div
                  key={session.id}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full">
                        {formatIstDateTime(session.startsAt)} –{" "}
                        {formatIstDateTime(session.endsAt)}
                      </span>
                      {track && (
                        <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                          {track.code}
                        </span>
                      )}
                      {session.roomOrLink && (
                        <span className="text-xs text-gray-500">
                          • {session.roomOrLink}
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">
                      {session.title}
                    </h4>
                    {speaker && (
                      <p className="text-sm font-medium text-orange-600">
                        Speaker: {speaker.fullName}
                      </p>
                    )}
                    {session.description && (
                      <p className="text-sm text-gray-600">
                        {session.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
