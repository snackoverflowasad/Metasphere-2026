import inventory from "../../../docs/migration/legacy-inventory.json";
import type {
  CommitteeCategory,
  CommitteeMemberSnapshot,
  CommitteeSnapshot,
  ConferenceLinkSnapshot,
  DeadlineSnapshot,
  EditionSnapshot,
  HeroMediaConfig,
  PaymentInstructions,
  ProgramSessionSnapshot,
  RegistrationFeeSnapshot,
  ResourceSnapshot,
  SpeakerSnapshot,
  SponsorSnapshot,
  TrackSnapshot,
} from "@/types/database";

const TRACK_IMAGES = [
  "https://res.cloudinary.com/dh87hfwml/image/upload/v1782834955/MetaSphere2026/Cloud.avif",
  "https://res.cloudinary.com/dh87hfwml/image/upload/v1782834956/MetaSphere2026/Quantum.jpg",
  "https://res.cloudinary.com/dh87hfwml/image/upload/v1782834954/MetaSphere2026/AI.webp",
];

const HERO_MEDIA: HeroMediaConfig = {
  bannerAsset: "Assets/METASPHERE WEBSITE BANNER .svg",
  logoSvgAsset: "Assets/Logo.svg",
  logoPngAsset: "Assets/Logo.png",
  heroVideos: [
    "https://res.cloudinary.com/dh87hfwml/video/upload/f_auto,q_auto/v1782834872/MetaSphere2026/988047-hd_1280_720_60fps.mp4",
    "https://res.cloudinary.com/dh87hfwml/video/upload/f_auto,q_auto/v1782834913/MetaSphere2026/4200196-hd_1920_1080_30fps.mp4",
  ],
  pageVideos: {
    callForPapers:
      "https://res.cloudinary.com/dh87hfwml/video/upload/v1782834890/MetaSphere2026/Paper.mp4",
    paperSubmission:
      "https://res.cloudinary.com/dh87hfwml/video/upload/v1782834890/MetaSphere2026/Paper.mp4",
    registration:
      "https://res.cloudinary.com/dh87hfwml/video/upload/v1782834899/MetaSphere2026/7685212-hd_1920_1080_24fps.mp4",
    technicalPrograms:
      "https://res.cloudinary.com/dh87hfwml/video/upload/v1782834933/MetaSphere2026/4198845-hd_1920_1080_25fps.mp4",
    advisoryCommittee:
      "https://res.cloudinary.com/dh87hfwml/video/upload/v1782833939/submit_l2amm7.mp4",
    scientificCommittee:
      "https://res.cloudinary.com/dh87hfwml/video/upload/v1782834928/MetaSphere2026/20784261-hd_1280_720_30fps.mp4",
    technicalCommittee:
      "https://res.cloudinary.com/dh87hfwml/video/upload/v1782834921/MetaSphere2026/MB.mp4",
  },
  overviewCarouselImages: [
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782834955/MetaSphere2026/Data-Visualization-thumbnail.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782834956/MetaSphere2026/Quantum.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782834954/MetaSphere2026/AI.webp",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782834955/MetaSphere2026/Cloud.avif",
  ],
  eventGalleryImages: [
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782833928/iem2_b92xeg.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782833993/IMG_5134_swdqrc.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782835043/MetaSphere2026/Events/IMG-20250306-WA0102.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782835130/MetaSphere2026/Events/IMG_5520.JPG.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1786009542/WhatsApp_Image_2026-08-06_at_3.15.15_PM_astzyr.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1786007781/WhatsApp_Image_2026-08-06_at_12.23.14_PM_jv7kva.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1786007780/WhatsApp_Image_2026-08-06_at_12.24.40_PM_sky6yj.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1786008912/WhatsApp_Image_2026-08-06_at_3.04.06_PM_sh5slp.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782835126/MetaSphere2026/Events/IMG_5171.JPG.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1786009021/WhatsApp_Image_2026-08-06_at_3.05.31_PM_ll0osg.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1786009022/WhatsApp_Image_2026-08-06_at_3.05.18_PM_wwwmvd.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782835036/MetaSphere2026/Events/DSC01429.JPG.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782835136/MetaSphere2026/Events/IMG_5359.JPG.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782835038/MetaSphere2026/Events/recent2.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782835038/MetaSphere2026/Events/recent3.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782835134/MetaSphere2026/Events/IMG_5616.JPG.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782835040/MetaSphere2026/Events/IMG-20250306-WA0079.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782835042/MetaSphere2026/Events/IMG-20250306-WA0090.jpg",
    "https://res.cloudinary.com/dh87hfwml/image/upload/v1782835037/MetaSphere2026/Events/recent1.jpg",
  ],
  legacyAssets: [...inventory.localAssets],
};

const INTERNATIONAL_HINTS = [
  "australia",
  "azerbaijan",
  "bangladesh",
  "canada",
  "china",
  "croatia",
  "czech",
  "egypt",
  "germany",
  "greece",
  "iraq",
  "ireland",
  "italy",
  "japan",
  "malaysia",
  "morocco",
  "nigeria",
  "philippines",
  "poland",
  "singapore",
  "taiwan",
  "uk",
  "usa",
  "vietnam",
];

const INTERNATIONAL_PATTERN = new RegExp(
  `\\b(${INTERNATIONAL_HINTS.join("|")})\\b`,
  "i"
);

function inferNationalityGroup(affiliation: string): "national" | "international" {
  return INTERNATIONAL_PATTERN.test(affiliation) ? "international" : "national";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildDeadlines(year: 2026 | 2027): DeadlineSnapshot[] {
  const status = year === 2026 ? "archived" : "published";
  if (year === 2026) {
    const dueIsoMap: Record<string, string> = {
      "Full paper submission (extended)": "2026-07-15T23:59:59+05:30",
      "Acceptance notification": "2026-08-05T18:00:00+05:30",
      "Early bird registration": "2026-08-10T23:59:59+05:30",
      "Registration close": "2026-08-13T23:59:59+05:30",
      "Camera ready paper submission": "2026-09-21T23:59:59+05:30",
      "Conference date": "2026-08-21T09:00:00+05:30",
    };

    return inventory.edition2026Content.deadlines.map((d, index) => ({
      id: `fallback-2026-deadline-${index + 1}`,
      title: d.label,
      dueAt: dueIsoMap[d.label] ?? "2026-08-21T09:00:00+05:30",
      displayDate: d.date,
      originalDate: "originalDate" in d ? (d.originalDate ?? null) : null,
      isExtended: "isExtended" in d ? Boolean(d.isExtended) : false,
      isConferenceDate: "isConferenceDate" in d ? Boolean(d.isConferenceDate) : false,
      sortOrder: index + 1,
      isVisible: true,
      status,
    }));
  }

  return [
    {
      id: "fallback-2027-deadline-1",
      title: "Full paper submission",
      dueAt: "2027-05-31T23:59:59+05:30",
      displayDate: "31st May, 2027",
      originalDate: null,
      isExtended: false,
      isConferenceDate: false,
      sortOrder: 1,
      isVisible: true,
      status,
    },
    {
      id: "fallback-2027-deadline-2",
      title: "Acceptance notification",
      dueAt: "2027-06-30T18:00:00+05:30",
      displayDate: "30th June, 2027",
      originalDate: null,
      isExtended: false,
      isConferenceDate: false,
      sortOrder: 2,
      isVisible: true,
      status,
    },
    {
      id: "fallback-2027-deadline-3",
      title: "Early bird registration",
      dueAt: "2027-07-15T23:59:59+05:30",
      displayDate: "15th July, 2027",
      originalDate: null,
      isExtended: false,
      isConferenceDate: false,
      sortOrder: 3,
      isVisible: true,
      status,
    },
    {
      id: "fallback-2027-deadline-4",
      title: "Camera ready paper submission",
      dueAt: "2027-07-31T23:59:59+05:30",
      displayDate: "31st July, 2027",
      originalDate: null,
      isExtended: false,
      isConferenceDate: false,
      sortOrder: 4,
      isVisible: true,
      status,
    },
    {
      id: "fallback-2027-deadline-5",
      title: "Registration close",
      dueAt: "2027-08-10T23:59:59+05:30",
      displayDate: "10th August, 2027",
      originalDate: null,
      isExtended: false,
      isConferenceDate: false,
      sortOrder: 5,
      isVisible: true,
      status,
    },
    {
      id: "fallback-2027-deadline-6",
      title: "Conference date",
      dueAt: "2027-08-17T09:00:00+05:30",
      displayDate: "17th & 18th August, 2027",
      originalDate: null,
      isExtended: false,
      isConferenceDate: true,
      sortOrder: 6,
      isVisible: true,
      status,
    },
  ];
}

function buildTracks(year: 2026 | 2027): TrackSnapshot[] {
  const status = year === 2026 ? "archived" : "published";
  return inventory.edition2026Content.tracks.map((t, index) => ({
    id: `fallback-${year}-track-${t.number}`,
    code: `T${t.number}`,
    name: t.title,
    description: `${t.title} — research topics and technical sessions for MetaSphere ${year}.`,
    topics: [...t.subtracks],
    imageUrl: TRACK_IMAGES[index] ?? null,
    sortOrder: t.number,
    status,
  }));
}

function buildSpeakers(year: 2026 | 2027): SpeakerSnapshot[] {
  const status = year === 2026 ? "archived" : "published";
  return inventory.edition2026Content.keynoteSpeakers.map((s, index) => {
    const institution = s.affiliations.join(" | ");
    return {
      id: `fallback-${year}-speaker-${index + 1}`,
      personId: `fallback-person-${slugify(s.name)}`,
      fullName: s.name,
      designation: s.affiliations[0] ?? "",
      institution,
      affiliations: [...s.affiliations],
      country:
        inferNationalityGroup(institution) === "international"
          ? "International"
          : "India",
      photoUrl: s.imageUrl,
      imageAlt: s.imageAlt,
      speakerType: "keynote",
      talkTitle: null,
      talkAbstract: null,
      sortOrder: index + 1,
      status,
    };
  });
}

function buildCommittees(year: 2026 | 2027): CommitteeSnapshot[] {
  const status = year === 2026 ? "archived" : "published";
  const c2026 = inventory.edition2026Content.committees;

  const toMember = (
    committeeSlug: string,
    index: number,
    name: string,
    affiliation: string,
    roleLabel = "",
    groupName = ""
  ): CommitteeMemberSnapshot => ({
    id: `fallback-${year}-${committeeSlug}-member-${index + 1}`,
    personId: `fallback-person-${slugify(name)}`,
    fullName: name,
    affiliation,
    roleLabel,
    groupName,
    nationalityGroup: inferNationalityGroup(affiliation),
    sortOrder: index + 1,
    status,
  });

  const scientificMembers: CommitteeMemberSnapshot[] = [];
  let sciIndex = 0;
  for (const group of c2026.leadershipGroups) {
    for (const member of group.members) {
      scientificMembers.push(
        toMember("scientific", sciIndex++, member.name, member.affiliation, group.role, "Leadership")
      );
    }
  }
  for (const group of c2026.chairGroups) {
    for (const member of group.members) {
      scientificMembers.push(
        toMember("scientific", sciIndex++, member.name, member.affiliation, group.role, "Conference Chairs")
      );
    }
  }

  const defs: Array<{
    slug: string;
    name: string;
    category: CommitteeCategory;
    description: string;
    members: CommitteeMemberSnapshot[];
  }> = [
    {
      slug: "scientific",
      name: "Scientific Committee",
      category: "scientific",
      description: `Chief Patrons, Honorary Chairs, Conference Chairs, and TPC Leadership for MetaSphere ${year}.`,
      members: scientificMembers,
    },
    {
      slug: "organizing",
      name: "Organizing Committee",
      category: "organizing",
      description: `Local Organizing Committee at IEM Kolkata for MetaSphere ${year}.`,
      members: c2026.organizingCommittee.map((m, idx) =>
        toMember("organizing", idx, m.name, m.affiliation, "Organizing Member", "Organizing Committee")
      ),
    },
    {
      slug: "advisory",
      name: "Advisory Committee",
      category: "advisory",
      description: `National and International Advisory Committee for MetaSphere ${year}.`,
      members: c2026.advisoryCommittee.map((m, idx) =>
        toMember("advisory", idx, m.name, m.affiliation, "Advisory Member", "Advisory Committee")
      ),
    },
    {
      slug: "technical",
      name: "Technical Program Committee",
      category: "technical",
      description: `Peer-review and Technical Program Committee for MetaSphere ${year}.`,
      members: c2026.technicalProgramCommittee.map((m, idx) =>
        toMember("technical", idx, m.name, m.affiliation, "TPC Member", "Technical Program Committee")
      ),
    },
    {
      slug: "aaia",
      name: "AAIA Committee",
      category: "aaia",
      description: `Asia-Pacific Artificial Intelligence Association (AAIA) Committee for MetaSphere ${year}.`,
      members: c2026.aaiaCommittee.map((m, idx) =>
        toMember("aaia", idx, m.name, m.affiliation, "AAIA Member", "AAIA Committee")
      ),
    },
  ];

  return defs.map((def, idx) => ({
    id: `fallback-${year}-committee-${def.slug}`,
    slug: def.slug,
    name: def.name,
    category: def.category,
    description: def.description,
    sortOrder: idx + 1,
    status,
    members: def.members,
  }));
}

function buildSponsors(year: 2026 | 2027): SponsorSnapshot[] {
  const status = year === 2026 ? "archived" : "published";
  return inventory.edition2026Content.sponsors.map((s, index) => ({
    id: `fallback-${year}-sponsor-${index + 1}`,
    name: s.name,
    tier: "technical_sponsor",
    logoUrl: s.logoUrl,
    websiteUrl: null,
    description: "Technical Co-Sponsor & Partner",
    sortOrder: index + 1,
    status,
  }));
}

function buildProgramSessions(year: 2026 | 2027, tracks: TrackSnapshot[]): ProgramSessionSnapshot[] {
  const status = year === 2026 ? "archived" : "published";
  const day1 = year === 2026 ? "2026-08-21" : "2027-08-17";
  const day2 = year === 2026 ? "2026-08-22" : "2027-08-18";

  return [
    {
      id: `fallback-${year}-session-1`,
      trackId: null,
      speakerId: null,
      sessionDate: day1,
      startsAt: `${day1}T09:30:00+05:30`,
      endsAt: `${day1}T10:30:00+05:30`,
      title: `Inaugural Ceremony & Opening Keynote — MetaSphere ${year}`,
      description: "Welcome address by IEM Kolkata leadership, conference overview, and inaugural keynote.",
      roomOrLink: "IEM Ashram Auditorium (Hybrid)",
      sortOrder: 1,
      status,
    },
    {
      id: `fallback-${year}-session-2`,
      trackId: tracks[0]?.id ?? null,
      speakerId: `fallback-${year}-speaker-4`,
      sessionDate: day1,
      startsAt: `${day1}T11:00:00+05:30`,
      endsAt: `${day1}T13:00:00+05:30`,
      title: "Track 1: Cloud Computing & Virtualization Paper Presentations",
      description: "Peer-reviewed technical paper presentations on Next-Gen Cloud, Edge/Fog, and Green Cloud.",
      roomOrLink: "Hall A / Online Track Room 1",
      sortOrder: 2,
      status,
    },
    {
      id: `fallback-${year}-session-3`,
      trackId: tracks[1]?.id ?? null,
      speakerId: `fallback-${year}-speaker-1`,
      sessionDate: day2,
      startsAt: `${day2}T10:00:00+05:30`,
      endsAt: `${day2}T12:30:00+05:30`,
      title: "Track 2: Metaverse & Quantum Metaverse Technical Session",
      description: "XR, Web3 interoperability, and Quantum AI/ML in immersive Metaverse ecosystems.",
      roomOrLink: "Hall A / Online Track Room 2",
      sortOrder: 3,
      status,
    },
    {
      id: `fallback-${year}-session-4`,
      trackId: tracks[2]?.id ?? null,
      speakerId: `fallback-${year}-speaker-2`,
      sessionDate: day2,
      startsAt: `${day2}T14:00:00+05:30`,
      endsAt: `${day2}T16:30:00+05:30`,
      title: "Track 3: AI, Data & Future Connectivity + Valedictory",
      description: "6G networks, IoT digital twins, best paper awards, and closing valedictory ceremony.",
      roomOrLink: "IEM Ashram Auditorium (Hybrid)",
      sortOrder: 4,
      status,
    },
  ];
}

function buildResourcesAndLinks(year: 2026 | 2027): {
  resources: ResourceSnapshot[];
  conferenceLinks: ConferenceLinkSnapshot[];
  linksByKey: Record<string, string>;
} {
  const status = year === 2026 ? "archived" : "published";
  const ext = inventory.externalLinks;
  const sub = inventory.edition2026Content.paperSubmission;

  const links: ConferenceLinkSnapshot[] = [
    {
      id: `fallback-${year}-link-cmt`,
      key: "cmt_submission",
      label: "Microsoft CMT Submission Portal",
      url: ext.cmtPortal,
      status,
    },
    {
      id: `fallback-${year}-link-registration`,
      key: "registration_form",
      label: "Registration Form",
      url: ext.registrationForm,
      status,
    },
    {
      id: `fallback-${year}-link-overleaf`,
      key: "latex_template",
      label: "LaTeX format (Overleaf)",
      url: ext.latexOverleafTemplate,
      status,
    },
    {
      id: `fallback-${year}-link-word`,
      key: "word_template",
      label: "Template in Microsoft Word (US Letter)",
      url: ext.googleDrive[0].url,
      status,
    },
    {
      id: `fallback-${year}-link-brochure`,
      key: "brochure",
      label: "Call for Papers / Conference Brochure",
      url: ext.googleDrive[1].url,
      status,
    },
    {
      id: `fallback-${year}-link-organizer`,
      key: "organizer_website",
      label: "IEM Official Website",
      url: ext.organizerWebsite,
      status,
    },
    {
      id: `fallback-${year}-link-map-footer`,
      key: "map_embed_footer",
      label: ext.googleMapsEmbeds[0].context,
      url: ext.googleMapsEmbeds[0].url,
      status,
    },
    {
      id: `fallback-${year}-link-map-contact`,
      key: "map_embed_contact",
      label: ext.googleMapsEmbeds[1].context,
      url: ext.googleMapsEmbeds[1].url,
      status,
    },
  ];

  const linksByKey: Record<string, string> = {};
  for (const link of links) {
    linksByKey[link.key] = link.url;
  }

  const resources: ResourceSnapshot[] = [
    {
      id: `fallback-${year}-res-word-drive`,
      label: "Template in Microsoft Word (US Letter)",
      category: "template",
      url: ext.googleDrive[0].url,
      storagePath: "Assets/WordTemplate.zip",
      sortOrder: 1,
      status,
    },
    {
      id: `fallback-${year}-res-latex-overleaf`,
      label: "LaTeX format",
      category: "template",
      url: ext.latexOverleafTemplate,
      storagePath:
        "Assets/A-general-template-file-for-the-LaTeX-package-SVJour3-for-Springer-journals.zip",
      sortOrder: 2,
      status,
    },
    {
      id: `fallback-${year}-res-brochure`,
      label: "Call for Papers / Conference Brochure",
      category: "brochure",
      url: ext.googleDrive[1].url,
      storagePath: null,
      sortOrder: 3,
      status,
    },
    {
      id: `fallback-${year}-res-permission`,
      label: sub.agreementForms[0].label,
      category: "agreement_form",
      url: null,
      storagePath: sub.agreementForms[0].assetPath,
      sortOrder: 4,
      status,
    },
    {
      id: `fallback-${year}-res-copyright`,
      label: sub.agreementForms[1].label,
      category: "agreement_form",
      url: null,
      storagePath: sub.agreementForms[1].assetPath,
      sortOrder: 5,
      status,
    },
    {
      id: `fallback-${year}-res-ppt`,
      label: "Conference Presentation PPT Template",
      category: "presentation_template",
      url: null,
      storagePath: sub.pptTemplateAssetPath,
      sortOrder: 6,
      status,
    },
  ];

  return { resources, conferenceLinks: links, linksByKey };
}

function buildRegistrationFees(year: 2026 | 2027): {
  registrationFees: RegistrationFeeSnapshot[];
  paymentInstructions: PaymentInstructions;
} {
  const status = year === 2026 ? "archived" : "published";
  const feesData = inventory.edition2026Content.registrationFees;

  const registrationFees: RegistrationFeeSnapshot[] = feesData.categories.map((c, idx) => ({
    id: `fallback-${year}-fee-${idx + 1}`,
    category: c.category,
    amountInr: c.indianAmountInr,
    amountUsd: c.foreignAmountUsd,
    indianDisplay: c.indianAuthor,
    foreignDisplay: c.foreignAuthor,
    taxNote: feesData.taxNote,
    sortOrder: idx + 1,
    status,
  }));

  const paymentInstructions: PaymentInstructions = {
    taxNote: feesData.taxNote,
    paymentMethodsNote: feesData.paymentMethodsNote,
    upiId: feesData.upiIdFromMetaKeywords,
    bankTransfer: { ...feesData.bankTransfer },
    policies: [...feesData.policies],
    confirmationEmailInstruction: feesData.confirmationEmailInstruction,
    cancellationPolicy: feesData.cancellationPolicy,
  };

  return { registrationFees, paymentInstructions };
}

function buildSnapshot(year: 2026 | 2027): EditionSnapshot {
  const is2026 = year === 2026;
  const status = is2026 ? "archived" : "published";
  const editionId = `fallback-edition-${year}`;
  const c = inventory.edition2026Content.conference;
  const contact = inventory.edition2026Content.contact;

  const tracks = buildTracks(year);
  const { resources, conferenceLinks, linksByKey } = buildResourcesAndLinks(year);
  const { registrationFees, paymentInstructions } = buildRegistrationFees(year);

  return {
    edition: {
      id: editionId,
      year,
      slug: `metasphere-${year}`,
      title: is2026
        ? c.title
        : "MetaSphere 2027: Global Conference on Cloud Computing, Virtualization & Metaverse",
      subtitle: is2026 ? c.shortTitle : "MetaSphere 2027",
      tagline: c.tagline,
      loaderSubtitle: c.loaderSubtitle,
      datesDisplay: is2026 ? c.datesDisplay : "17th & 18th August, 2027",
      startDate: is2026 ? "2026-08-21T09:00:00+05:30" : "2027-08-17T09:00:00+05:30",
      endDate: is2026 ? "2026-08-22T18:00:00+05:30" : "2027-08-18T18:00:00+05:30",
      timezone: "Asia/Kolkata",
      venueName: c.venueName,
      venueAddress: contact.address,
      venueCity: c.venueCity,
      format: "hybrid",
      description: `MetaSphere ${year} is the premier global forum bringing together academic researchers, industry experts, and engineers to exchange ideas and advancements in Cloud Computing, Virtualization, and the Metaverse.`,
      organizers: [...c.organizers],
      collaborators: [...c.collaborators],
      technicalCoSponsorsSummary: c.technicalCoSponsorsSummary,
      cmtAcknowledgment: c.cmtAcknowledgment,
      publicationNote: c.publicationNote,
      publicationBookCoverAsset: c.publicationBookCoverAsset,
      programScheduleQrAsset: c.programScheduleQrAsset,
      contactEmails: [...contact.emails],
      contactPhones: [...contact.phones],
      isActive: !is2026,
      status,
    },
    siteSettings: {
      id: `fallback-${year}-site-settings`,
      editionId,
      canonicalUrl: is2026
        ? inventory.externalLinks.legacyCanonicalOrigin
        : "https://metasphere2027.iem.edu.in",
      seoTitle: is2026
        ? c.title
        : "MetaSphere 2027: Global Conference on Cloud Computing, Virtualization & Metaverse",
      seoDescription: `Official website of MetaSphere ${year}, hosted by Institute of Engineering & Management (IEM), Kolkata, India.`,
      themeTokens: { ...inventory.themeTokens },
      heroMedia: HERO_MEDIA,
      status,
    },
    deadlines: buildDeadlines(year),
    tracks,
    speakers: buildSpeakers(year),
    committees: buildCommittees(year),
    sponsors: buildSponsors(year),
    programSessions: buildProgramSessions(year, tracks),
    resources,
    conferenceLinks,
    linksByKey,
    registrationFees,
    paymentInstructions,
  };
}

const SNAPSHOT_2026: EditionSnapshot = buildSnapshot(2026);
const SNAPSHOT_2027: EditionSnapshot = buildSnapshot(2027);

/**
 * Returns the local typed fallback EditionSnapshot built from `docs/migration/legacy-inventory.json`
 * so public routes render identically even before live Supabase env vars are configured.
 */
export function getFallbackEditionSnapshot(year?: number): EditionSnapshot {
  if (year === undefined || year === 2027) {
    return SNAPSHOT_2027;
  }
  if (year === 2026) {
    return SNAPSHOT_2026;
  }
  throw new Error(`Unsupported fallback conference edition year: ${year}`);
}
