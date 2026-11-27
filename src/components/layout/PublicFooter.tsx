import Link from "next/link";

export interface PublicFooterProps {
  editionYear: number;
  links?: Record<string, string>;
  basePath?: string;
}

const DEFAULT_FOOTER_MAP_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3670.123456789!2d88.4296927!3d22.5701392!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a0275b23d77ee27%3A0xcd498ec0d7bf6f54!2sInstitute%20of%20Engineering%20and%20Management%20(Ashram%20Building)!5e0!3m2!1sen!2sin!4v1690000000000";

function buildHref(basePath: string | undefined, path: string): string {
  const normalizedBase = basePath ? basePath.replace(/\/+$/, "") : "";
  if (path === "/") {
    return normalizedBase || "/";
  }
  return `${normalizedBase}${path}`;
}

export function PublicFooter({
  editionYear,
  links,
  basePath,
}: PublicFooterProps) {
  const href = (key: string, defaultPath: string) =>
    links?.[key] ?? buildHref(basePath, defaultPath);

  const contactEmail = links?.email ?? "metaSphere2026@iem.edu.in";
  const contactPhone = links?.phone ?? "+91 898 177 4023";
  const contactPhoneHref = `tel:${contactPhone.replace(/\s+/g, "")}`;
  const mapEmbedUrl = links?.mapEmbed ?? DEFAULT_FOOTER_MAP_EMBED;

  return (
    <footer className="bg-gray-800 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="md:col-span-2 lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4 border-b-2 border-b-white">
              <span className="text-2xl font-bold text-white">
                MetaSphere {editionYear}
              </span>
            </div>
            <p className="text-sm text-gray-400 max-w-lg text-justify">
              MetaSphere {editionYear} is the premier global conference bridging
              the future of Cloud, Virtualization, and the Metaverse. We are
              dedicated to fostering innovation, connecting experts, and
              exploring the next digital frontier, all from the cultural heart
              of Kolkata.
            </p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-white mb-4">
              Quick Links
            </h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={href("home", "/")}
                  className="hover:text-orange-400 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href={href("callForPapers", "/call-for-papers")}
                  className="hover:text-orange-400 transition-colors"
                >
                  Call For Papers
                </Link>
              </li>
              <li>
                <Link
                  href={href("scientificCommittee", "/committees/scientific")}
                  className="hover:text-orange-400 transition-colors"
                >
                  Scientific Committee
                </Link>
              </li>
              <li>
                <Link
                  href={href("advisoryCommittee", "/committees/advisory")}
                  className="hover:text-orange-400 transition-colors"
                >
                  Advisory Committee
                </Link>
              </li>
              <li>
                <Link
                  href={href("technicalCommittee", "/committees/technical")}
                  className="hover:text-orange-400 transition-colors"
                >
                  Technical Program Committee
                </Link>
              </li>
              <li>
                <Link
                  href={href("speakers", "/speakers")}
                  className="hover:text-orange-400 transition-colors"
                >
                  Keynote Speakers
                </Link>
              </li>
              <li>
                <Link
                  href={href("registration", "/registration")}
                  className="hover:text-orange-400 transition-colors"
                >
                  Registration
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-base font-semibold text-white mb-4">
              Contact &amp; Venue
            </h2>
            <div className="text-sm space-y-2">
              <p className="font-bold">IEM Ashram Building</p>
              <p className="text-gray-400">
                GN-34/2, Sector V, Bidhannagar, Kolkata, West Bengal 700091
              </p>
              <a
                href={`mailto:${contactEmail}`}
                className="block hover:text-orange-400 transition-colors pt-2"
              >
                {contactEmail}
              </a>
              <a
                href={contactPhoneHref}
                className="block hover:text-orange-400 transition-colors"
              >
                {contactPhone}
              </a>
            </div>
            <div className="mt-4 rounded-lg overflow-hidden">
              <iframe
                src={mapEmbedUrl}
                title="IEM Ashram Building Location Map"
                width="100%"
                height="150"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-700 text-center">
          <p className="text-sm text-gray-400">
            &copy; {editionYear} MetaSphere Conference Committee. All Rights
            Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
