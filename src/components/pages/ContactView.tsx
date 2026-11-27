import { Mail, MapPin, Phone } from "lucide-react";
import type { EditionSnapshot } from "@/types/database";

export interface ContactViewProps {
  edition: EditionSnapshot;
}

const DEFAULT_CONTACT_MAP =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3684.212033100494!2d88.42969267584799!3d22.5712170329792!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a0275b23d77ee27%3A0xcd498ec0d7bf6f54!2sInstitute%20of%20Engineering%20%26%20Management%20(IEM)!5e0!3m2!1sen!2sin!4v1690000000000";

export function ContactView({ edition }: ContactViewProps) {
  const { edition: meta, linksByKey } = edition;
  const email = meta.contactEmails[0] ?? "metaSphere2026@iem.edu.in";
  const phone = meta.contactPhones[0] ?? "+91 898 177 4023";
  const mapUrl = linksByKey.google_maps_embed ?? DEFAULT_CONTACT_MAP;

  return (
    <>
      <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-orange-50">
        <div className="max-w-5xl mx-auto text-center px-4">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            Contact <span className="gradient-text">Us</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            We&apos;re here to help. Reach out with any questions or inquiries.
          </p>
        </div>
      </section>

      <div className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Get in Touch
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <MapPin className="w-6 h-6 text-orange-500 mt-1 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Venue Address
                    </h3>
                    <p className="text-gray-600">
                      {meta.venueName}, {meta.venueAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Mail className="w-6 h-6 text-orange-500 mt-1 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-800">Email</h3>
                    <a
                      href={`mailto:${email}`}
                      className="text-gray-600 hover:text-orange-600"
                    >
                      {email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <Phone className="w-6 h-6 text-orange-500 mt-1 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-800">Phone</h3>
                    <a
                      href={`tel:${phone.replace(/\s+/g, "")}`}
                      className="block text-gray-600 hover:text-orange-600 transition-colors"
                    >
                      {phone}
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-lg overflow-hidden border border-gray-200">
                <iframe
                  src={mapUrl}
                  title="IEM Kolkata Location Map"
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
