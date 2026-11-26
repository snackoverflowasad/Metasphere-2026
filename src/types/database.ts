export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PublicationStatus = "draft" | "published" | "archived";
export type AdminRole = "super_admin" | "content_admin" | "editor";
export type ConferenceFormat = "online" | "offline" | "hybrid";
export type CommitteeCategory =
  | "advisory"
  | "scientific"
  | "technical"
  | "aaia"
  | "organizing";

export interface Database {
  public: {
    Tables: {
      conference_editions: {
        Row: {
          id: string;
          year: number;
          slug: string;
          title: string;
          subtitle: string | null;
          tagline: string | null;
          loader_subtitle: string | null;
          dates_display: string | null;
          start_date: string;
          end_date: string;
          timezone: string;
          venue_name: string;
          venue_address: string | null;
          venue_city: string | null;
          format: ConferenceFormat;
          description: string | null;
          organizers: Json;
          collaborators: Json;
          technical_co_sponsors_summary: string | null;
          cmt_acknowledgment: string | null;
          publication_note: string | null;
          publication_book_cover_asset: string | null;
          program_schedule_qr_asset: string | null;
          contact_emails: Json;
          contact_phones: Json;
          is_active: boolean;
          status: PublicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          year: number;
          slug: string;
          title: string;
          subtitle?: string | null;
          tagline?: string | null;
          loader_subtitle?: string | null;
          dates_display?: string | null;
          start_date: string;
          end_date: string;
          timezone?: string;
          venue_name: string;
          venue_address?: string | null;
          venue_city?: string | null;
          format?: ConferenceFormat;
          description?: string | null;
          organizers?: Json;
          collaborators?: Json;
          technical_co_sponsors_summary?: string | null;
          cmt_acknowledgment?: string | null;
          publication_note?: string | null;
          publication_book_cover_asset?: string | null;
          program_schedule_qr_asset?: string | null;
          contact_emails?: Json;
          contact_phones?: Json;
          is_active?: boolean;
          status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conference_editions"]["Insert"]>;
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: string;
          edition_id: string;
          canonical_url: string;
          seo_title: string;
          seo_description: string;
          theme_tokens: Json;
          hero_media: Json;
          status: PublicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          canonical_url: string;
          seo_title: string;
          seo_description: string;
          theme_tokens?: Json;
          hero_media?: Json;
          status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["site_settings"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "site_settings_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: true;
            referencedRelation: "conference_editions";
            referencedColumns: ["id"];
          },
        ];
      };
      deadlines: {
        Row: {
          id: string;
          edition_id: string;
          title: string;
          due_at: string;
          display_date: string | null;
          original_date: string | null;
          is_extended: boolean;
          is_conference_date: boolean;
          sort_order: number;
          is_visible: boolean;
          status: PublicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          title: string;
          due_at: string;
          display_date?: string | null;
          original_date?: string | null;
          is_extended?: boolean;
          is_conference_date?: boolean;
          sort_order?: number;
          is_visible?: boolean;
          status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deadlines"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "deadlines_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "conference_editions";
            referencedColumns: ["id"];
          },
        ];
      };
      tracks: {
        Row: {
          id: string;
          edition_id: string;
          code: string;
          name: string;
          description: string | null;
          topics: Json;
          image_url: string | null;
          sort_order: number;
          status: PublicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          code: string;
          name: string;
          description?: string | null;
          topics?: Json;
          image_url?: string | null;
          sort_order?: number;
          status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tracks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "tracks_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "conference_editions";
            referencedColumns: ["id"];
          },
        ];
      };
      people: {
        Row: {
          id: string;
          slug: string;
          full_name: string;
          designation: string | null;
          institution: string | null;
          country: string | null;
          photo_url: string | null;
          bio: string | null;
          social_links: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          full_name: string;
          designation?: string | null;
          institution?: string | null;
          country?: string | null;
          photo_url?: string | null;
          bio?: string | null;
          social_links?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["people"]["Insert"]>;
        Relationships: [];
      };
      speakers: {
        Row: {
          id: string;
          edition_id: string;
          person_id: string;
          speaker_type: string;
          talk_title: string | null;
          talk_abstract: string | null;
          image_alt: string | null;
          sort_order: number;
          status: PublicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          person_id: string;
          speaker_type?: string;
          talk_title?: string | null;
          talk_abstract?: string | null;
          image_alt?: string | null;
          sort_order?: number;
          status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["speakers"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "speakers_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "conference_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "speakers_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      committees: {
        Row: {
          id: string;
          edition_id: string;
          slug: string;
          name: string;
          category: CommitteeCategory;
          description: string | null;
          sort_order: number;
          status: PublicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          slug: string;
          name: string;
          category: CommitteeCategory;
          description?: string | null;
          sort_order?: number;
          status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["committees"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "committees_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "conference_editions";
            referencedColumns: ["id"];
          },
        ];
      };
      committee_members: {
        Row: {
          id: string;
          committee_id: string;
          person_id: string;
          role_label: string;
          group_name: string;
          nationality_group: string | null;
          sort_order: number;
          status: PublicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          committee_id: string;
          person_id: string;
          role_label?: string;
          group_name?: string;
          nationality_group?: string | null;
          sort_order?: number;
          status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["committee_members"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "committee_members_committee_id_fkey";
            columns: ["committee_id"];
            isOneToOne: false;
            referencedRelation: "committees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "committee_members_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      sponsors: {
        Row: {
          id: string;
          edition_id: string;
          name: string;
          tier: string;
          logo_url: string;
          website_url: string | null;
          description: string | null;
          sort_order: number;
          status: PublicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          name: string;
          tier?: string;
          logo_url: string;
          website_url?: string | null;
          description?: string | null;
          sort_order?: number;
          status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sponsors"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "sponsors_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "conference_editions";
            referencedColumns: ["id"];
          },
        ];
      };
      program_sessions: {
        Row: {
          id: string;
          edition_id: string;
          track_id: string | null;
          speaker_id: string | null;
          session_date: string;
          starts_at: string;
          ends_at: string;
          title: string;
          description: string | null;
          room_or_link: string | null;
          sort_order: number;
          status: PublicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          track_id?: string | null;
          speaker_id?: string | null;
          session_date: string;
          starts_at: string;
          ends_at: string;
          title: string;
          description?: string | null;
          room_or_link?: string | null;
          sort_order?: number;
          status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["program_sessions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "program_sessions_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "conference_editions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "program_sessions_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "program_sessions_speaker_id_fkey";
            columns: ["speaker_id"];
            isOneToOne: false;
            referencedRelation: "speakers";
            referencedColumns: ["id"];
          },
        ];
      };
      resources: {
        Row: {
          id: string;
          edition_id: string;
          label: string;
          category: string;
          url: string | null;
          storage_path: string | null;
          sort_order: number;
          status: PublicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          label: string;
          category: string;
          url?: string | null;
          storage_path?: string | null;
          sort_order?: number;
          status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["resources"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "resources_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "conference_editions";
            referencedColumns: ["id"];
          },
        ];
      };
      conference_links: {
        Row: {
          id: string;
          edition_id: string;
          key: string;
          label: string;
          url: string;
          status: PublicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          key: string;
          label: string;
          url: string;
          status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["conference_links"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "conference_links_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "conference_editions";
            referencedColumns: ["id"];
          },
        ];
      };
      registration_fees: {
        Row: {
          id: string;
          edition_id: string;
          category: string;
          amount_inr: number;
          amount_usd: number;
          indian_display: string | null;
          foreign_display: string | null;
          tax_note: string | null;
          payment_instructions: Json;
          financial_approved_by: string | null;
          financial_approved_at: string | null;
          sort_order: number;
          status: PublicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          edition_id: string;
          category: string;
          amount_inr: number;
          amount_usd: number;
          indian_display?: string | null;
          foreign_display?: string | null;
          tax_note?: string | null;
          payment_instructions?: Json;
          financial_approved_by?: string | null;
          financial_approved_at?: string | null;
          sort_order?: number;
          status?: PublicationStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["registration_fees"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "registration_fees_edition_id_fkey";
            columns: ["edition_id"];
            isOneToOne: false;
            referencedRelation: "conference_editions";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_roles: {
        Row: {
          user_id: string;
          email: string | null;
          display_name: string | null;
          role: AdminRole;
          can_approve_financial: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email?: string | null;
          display_name?: string | null;
          role?: AdminRole;
          can_approve_financial?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_roles"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_role: string | null;
          action: string;
          table_name: string;
          record_id: string | null;
          before_data: Json | null;
          after_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          action: string;
          table_name: string;
          record_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      content_versions: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          version_number: number;
          snapshot: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          version_number: number;
          snapshot: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["content_versions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      publication_status: PublicationStatus;
      admin_role: AdminRole;
      conference_format: ConferenceFormat;
      committee_category: CommitteeCategory;
    };
    CompositeTypes: Record<string, never>;
  };
}

export interface ThemeTokens {
  background: string;
  foreground: string;
  primary: string;
  primaryHover: string;
  accentMagenta: string;
}

export interface HeroMediaConfig {
  bannerAsset: string;
  logoSvgAsset: string;
  logoPngAsset: string;
  heroVideos: string[];
  pageVideos: Record<string, string>;
  overviewCarouselImages: string[];
  eventGalleryImages: string[];
  legacyAssets: string[];
}

export interface EditionSummary {
  id: string;
  year: number;
  slug: string;
  title: string;
  subtitle: string;
  tagline: string;
  loaderSubtitle: string;
  datesDisplay: string;
  startDate: string;
  endDate: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  format: ConferenceFormat;
  description: string;
  organizers: string[];
  collaborators: string[];
  technicalCoSponsorsSummary: string;
  cmtAcknowledgment: string;
  publicationNote: string;
  publicationBookCoverAsset: string;
  programScheduleQrAsset: string;
  contactEmails: string[];
  contactPhones: string[];
  isActive: boolean;
  status: PublicationStatus;
}

export interface SiteSettingsSnapshot {
  id: string;
  editionId: string;
  canonicalUrl: string;
  seoTitle: string;
  seoDescription: string;
  themeTokens: ThemeTokens;
  heroMedia: HeroMediaConfig;
  status: PublicationStatus;
}

export interface DeadlineSnapshot {
  id: string;
  title: string;
  dueAt: string;
  displayDate: string;
  originalDate?: string | null;
  isExtended: boolean;
  isConferenceDate: boolean;
  sortOrder: number;
  isVisible: boolean;
  status: PublicationStatus;
}

export interface TrackSnapshot {
  id: string;
  code: string;
  name: string;
  description: string;
  topics: string[];
  imageUrl: string | null;
  sortOrder: number;
  status: PublicationStatus;
}

export interface SpeakerSnapshot {
  id: string;
  personId: string;
  fullName: string;
  designation: string;
  institution: string;
  affiliations: string[];
  country: string | null;
  photoUrl: string;
  imageAlt: string;
  speakerType: string;
  talkTitle: string | null;
  talkAbstract: string | null;
  sortOrder: number;
  status: PublicationStatus;
}

export interface CommitteeMemberSnapshot {
  id: string;
  personId: string;
  fullName: string;
  affiliation: string;
  roleLabel: string;
  groupName: string;
  nationalityGroup: "national" | "international";
  sortOrder: number;
  status: PublicationStatus;
}

export interface CommitteeSnapshot {
  id: string;
  slug: string;
  name: string;
  category: CommitteeCategory;
  description: string | null;
  sortOrder: number;
  status: PublicationStatus;
  members: CommitteeMemberSnapshot[];
}

export interface SponsorSnapshot {
  id: string;
  name: string;
  tier: string;
  logoUrl: string;
  websiteUrl: string | null;
  description: string | null;
  sortOrder: number;
  status: PublicationStatus;
}

export interface ProgramSessionSnapshot {
  id: string;
  trackId: string | null;
  speakerId: string | null;
  sessionDate: string;
  startsAt: string;
  endsAt: string;
  title: string;
  description: string | null;
  roomOrLink: string | null;
  sortOrder: number;
  status: PublicationStatus;
}

export interface ResourceSnapshot {
  id: string;
  label: string;
  category: string;
  url: string | null;
  storagePath: string | null;
  sortOrder: number;
  status: PublicationStatus;
}

export interface ConferenceLinkSnapshot {
  id: string;
  key: string;
  label: string;
  url: string;
  status: PublicationStatus;
}

export interface BankTransferDetails {
  bankName: string;
  partyName: string;
  accountNo: string;
  accountType: string;
  ifscCode: string;
  branch: string;
  swiftCode: string;
  micr: string;
}

export interface PaymentInstructions {
  taxNote: string;
  paymentMethodsNote: string;
  upiId: string;
  bankTransfer: BankTransferDetails;
  policies: string[];
  confirmationEmailInstruction: string;
  cancellationPolicy: string;
}

export interface RegistrationFeeSnapshot {
  id: string;
  category: string;
  amountInr: number;
  amountUsd: number;
  indianDisplay: string;
  foreignDisplay: string;
  taxNote: string;
  sortOrder: number;
  status: PublicationStatus;
}

export interface EditionSnapshot {
  edition: EditionSummary;
  siteSettings: SiteSettingsSnapshot;
  deadlines: DeadlineSnapshot[];
  tracks: TrackSnapshot[];
  speakers: SpeakerSnapshot[];
  committees: CommitteeSnapshot[];
  sponsors: SponsorSnapshot[];
  programSessions: ProgramSessionSnapshot[];
  resources: ResourceSnapshot[];
  conferenceLinks: ConferenceLinkSnapshot[];
  linksByKey: Record<string, string>;
  registrationFees: RegistrationFeeSnapshot[];
  paymentInstructions: PaymentInstructions;
}
