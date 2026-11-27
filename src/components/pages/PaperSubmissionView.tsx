import {
  FileText,
  Newspaper,
  Presentation,
  ScrollText,
  UploadCloud,
} from "lucide-react";
import type { EditionSnapshot } from "@/types/database";
import { DeadlinesSection } from "@/components/deadlines/DeadlinesSection";
import { CloudinaryVideoBg } from "@/components/home/CloudinaryVideoBg";
import { CountdownTimer } from "@/components/home/CountdownTimer";

export interface PaperSubmissionViewProps {
  edition: EditionSnapshot;
}

export function PaperSubmissionView({ edition }: PaperSubmissionViewProps) {
  const { edition: meta, siteSettings, deadlines, linksByKey, resources } = edition;
  const heroVideo =
    siteSettings.heroMedia.pageVideos.paperSubmission ??
    "https://res.cloudinary.com/dh87hfwml/video/upload/v1782834890/MetaSphere2026/Paper.mp4";
  const cmtUrl =
    linksByKey.cmt_submission ??
    "https://cmt3.research.microsoft.com/MetaSphere2026";
  const wordTemplateUrl =
    linksByKey.word_template ??
    "https://drive.google.com/file/d/1PHj4l6oGQ2w_SzbrEeHli8wVSLSmXK7u/view?usp=sharing";
  const latexTemplateUrl =
    linksByKey.latex_overleaf ??
    "https://www.overleaf.com/latex/templates/springer-lecture-notes-in-computer-science/kzwwpvhwnvfj";
  const brochureUrl =
    linksByKey.conference_brochure ??
    "https://drive.google.com/file/d/1OGuXv0XyLg2CyRgBF8JuMg-7KRWUoBfc/view?usp=drive_link";
  const primaryEmail = meta.contactEmails[0] ?? "metaSphere2026@iem.edu.in";

  const agreementResources = resources.filter(
    (r) => r.category === "agreement_form" || r.category === "presentation_template"
  );

  return (
    <>
      <section className="relative pt-32 pb-20 sm:pt-48 sm:pb-20 overflow-hidden">
        <CloudinaryVideoBg videoUrls={[heroVideo]} />
        <div className="relative max-w-5xl mx-auto text-center px-4 z-20">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            Paper <span className="gradient-text">Submission</span>
          </h1>
        </div>
      </section>

      <div className="container mx-auto px-6 py-16">
        <div className="flex flex-col lg:flex-row gap-12 max-w-7xl mx-auto">
          <div className="flex-1 min-w-0">
            <section id="submission-guidelines">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 space-y-8">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <UploadCloud className="w-7 h-7 text-orange-500 mr-3 shrink-0" />
                    Submission Portal
                  </h2>
                  <p className="text-gray-600 leading-relaxed text-justify">
                    The Microsoft CMT portal is to be used for the submission link
                    and all reviews are to be done as per the double-blind norm.
                    Here, authors must submit the paper without including their
                    names and affiliations.
                  </p>
                  {meta.cmtAcknowledgment && (
                    <div className="border-l-4 border-[#f97316] bg-[#f97316]/10 p-4 rounded-md">
                      <p className="text-sm text-black text-justify">
                        {meta.cmtAcknowledgment}
                      </p>
                    </div>
                  )}

                  <a
                    href={cmtUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block btn-register font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
                  >
                    Submission link
                  </a>
                </div>

                <hr className="border-gray-100" />

                <div className="space-y-4">
                  <p className="text-gray-600 leading-relaxed text-justify">
                    Prospective authors are invited to submit manuscripts
                    reporting original unpublished research and recent
                    developments in the topics related to the conference.
                  </p>

                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-orange-500 shrink-0" />
                      <span>
                        Template in Microsoft Word (US Letter):{" "}
                        <a
                          href={wordTemplateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 font-medium hover:underline"
                        >
                          Click here
                        </a>
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-orange-500 shrink-0" />
                      <span>
                        LaTeX format (Overleaf):{" "}
                        <a
                          href={latexTemplateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 font-medium hover:underline"
                        >
                          Click here
                        </a>
                      </span>
                    </li>
                  </ul>

                  <div className="text-gray-600 leading-relaxed space-y-1">
                    <p>
                      Details can also be found in the Call for Papers:{" "}
                      <a
                        href={brochureUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 font-medium hover:underline"
                      >
                        Click here
                      </a>
                    </p>
                    <p>
                      To download the Conference Brochure:{" "}
                      <a
                        href={brochureUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-600 font-medium hover:underline"
                      >
                        Click here
                      </a>
                    </p>
                  </div>

                  <p className="text-gray-600 leading-relaxed text-justify">
                    After getting the acceptance e-mail of the Paper, the author
                    needs to submit the following agreements to{" "}
                    <a
                      href={`mailto:${primaryEmail}`}
                      className="text-orange-600 font-medium hover:underline"
                    >
                      {primaryEmail}
                    </a>
                    . Otherwise, the accepted paper will not be published in the
                    conference proceedings.
                  </p>

                  <ul className="space-y-3 text-gray-700">
                    {agreementResources.map((res) => {
                      const href =
                        res.url ||
                        (res.storagePath
                          ? res.storagePath.startsWith("/")
                            ? res.storagePath
                            : `/${res.storagePath}`
                          : "#");
                      return (
                        <li key={res.id} className="flex items-center gap-3">
                          <Presentation className="w-5 h-5 text-orange-500 shrink-0" />
                          <span>
                            {res.label}:{" "}
                            <a
                              href={href}
                              download={Boolean(res.storagePath)}
                              className="text-orange-600 font-medium hover:underline"
                            >
                              Click here
                            </a>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center mb-3">
                    <ScrollText className="w-7 h-7 text-orange-500 mr-3 shrink-0" />
                    Mode of Presentation
                  </h2>
                  <p className="text-gray-600 leading-relaxed text-justify">
                    Mode of presentation – {meta.subtitle} will be held in{" "}
                    <span className="uppercase font-semibold">{meta.format}</span>{" "}
                    MODEL where authors shall present their papers either in
                    physical mode at the conference venue or through ONLINE as per
                    their preference and convenience. The proceedings and
                    certificates will be sent to the corresponding authors via post
                    in case of online presentation.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-900">
                    {meta.subtitle} Paper Categories
                  </h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-3">
                      <Newspaper className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <span>
                        Regular Paper – 10 pages maximum (2 additional pages
                        allowed at an extra charge)
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Newspaper className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <span>
                        There is no provision for submitting short papers and
                        poster papers.
                      </span>
                    </li>
                  </ul>
                  <p className="text-gray-600 leading-relaxed text-justify">
                    Double-Blind review is to be followed strictly. That means the
                    author will submit the paper without their name and
                    affiliation details.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <aside className="w-full lg:w-[350px] shrink-0 space-y-6">
            <DeadlinesSection deadlines={deadlines} />
            <CountdownTimer
              targetDateIso={meta.startDate}
              isArchived={meta.status === "archived"}
            />
          </aside>
        </div>
      </div>
    </>
  );
}
