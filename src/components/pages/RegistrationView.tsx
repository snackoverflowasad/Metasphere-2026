import { AlertTriangle } from "lucide-react";
import type { EditionSnapshot } from "@/types/database";
import { CloudinaryVideoBg } from "@/components/home/CloudinaryVideoBg";

export interface RegistrationViewProps {
  edition: EditionSnapshot;
}

export function RegistrationView({ edition }: RegistrationViewProps) {
  const {
    edition: meta,
    siteSettings,
    registrationFees,
    paymentInstructions,
    linksByKey,
  } = edition;

  const heroVideo =
    siteSettings.heroMedia.pageVideos.registration ??
    "https://res.cloudinary.com/dh87hfwml/video/upload/v1782834899/MetaSphere2026/7685212-hd_1920_1080_24fps.mp4";
  const formUrl =
    linksByKey.registration_form ??
    "https://forms.cloud.microsoft/pages/responsepage.aspx?id=U53vQTHLQEulXQiTM0pAWYCBJZcFs_ROjNheVtdaa3BUOTRJTDhZSlIwQjdWSEUyVkoxUjNNSFRIQy4u&route=shorturl";
  const primaryEmail = meta.contactEmails[0] ?? "metaSphere2026@iem.edu.in";

  return (
    <>
      <section className="relative pt-24 pb-20 sm:pt-48 sm:pb-24 overflow-hidden">
        <CloudinaryVideoBg videoUrls={[heroVideo]} />
        <div className="relative max-w-5xl mx-auto text-center px-4 z-20">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            Conference <span className="gradient-text">Registration</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            Secure your place at {meta.subtitle}. Find all the details on fees
            and payment procedures below.
          </p>
        </div>
      </section>

      <div className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 space-y-16">
          <div>
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Registration Fees
              </h2>
              <p className="mt-3 text-lg text-gray-600">
                {paymentInstructions.taxNote || "All fees are inclusive of taxes."}
              </p>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-md">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="py-4 px-6 text-sm font-semibold text-orange-800 uppercase tracking-wider text-center">
                      Category
                    </th>
                    <th className="py-4 px-6 text-sm font-semibold text-orange-800 uppercase tracking-wider text-center">
                      Indian Author
                      <br />
                      <span className="text-xs normal-case">
                        (Early Bird &amp; Regular)
                      </span>
                    </th>
                    <th className="py-4 px-6 text-sm font-semibold text-orange-800 uppercase tracking-wider text-center">
                      Foreign Author
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-center">
                  {registrationFees.map((fee, idx) => (
                    <tr
                      key={fee.id}
                      className={idx >= 3 ? "bg-gray-50" : undefined}
                    >
                      <td className="py-4 px-6 font-medium text-gray-800">
                        {fee.category}
                      </td>
                      <td className="py-4 px-6 text-gray-700">
                        {fee.indianDisplay || `${fee.amountInr} INR/-`}
                      </td>
                      <td className="py-4 px-6 text-gray-700">
                        {fee.foreignDisplay || `${fee.amountUsd} USD`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">
              How to Register
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Follow these steps to complete your registration.
            </p>
            <div className="mt-6">
              <a
                href={formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg px-6 py-3 text-base font-semibold text-white shadow-md transition-colors bg-[#ea580c] hover:bg-[#c2410c]"
              >
                Fill out the Form
              </a>
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-12">
            {/* Step 1 */}
            <div className="flex items-start space-x-6">
              <div className="shrink-0 w-12 h-12 bg-orange-500 text-white flex items-center justify-center rounded-full text-2xl font-bold">
                1
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-3">
                  Review Important Policies
                </h3>
                <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-r-lg space-y-3">
                  {paymentInstructions.policies.map((policy) => (
                    <p key={policy} className="text-justify">
                      {policy}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start space-x-6">
              <div className="shrink-0 w-12 h-12 bg-orange-500 text-white flex items-center justify-center rounded-full text-2xl font-bold">
                2
              </div>
              <div className="w-full">
                <h3 className="text-2xl font-semibold text-gray-800 mb-3">
                  Complete Your Payment
                </h3>
                <p className="text-gray-600 mb-4">
                  {paymentInstructions.paymentMethodsNote}
                  {paymentInstructions.upiId && (
                    <>
                      {" "}
                      UPI ID:{" "}
                      <strong className="font-semibold text-gray-900">
                        {paymentInstructions.upiId}
                      </strong>
                    </>
                  )}
                </p>

                <div className="bg-white p-6 rounded-lg border border-gray-200 w-full">
                  <h4 className="text-lg font-bold text-gray-900 mb-6">
                    Bank Transfer (NEFT/RTGS)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                    <ul className="space-y-3">
                      <li className="flex justify-between gap-4">
                        <span className="font-semibold text-gray-600">
                          Bank Name:
                        </span>
                        <span>{paymentInstructions.bankTransfer.bankName}</span>
                      </li>
                      <li className="flex justify-between gap-4">
                        <span className="font-semibold text-gray-600">
                          Party Name:
                        </span>
                        <span className="text-right">
                          {paymentInstructions.bankTransfer.partyName}
                        </span>
                      </li>
                      <li className="flex justify-between gap-4">
                        <span className="font-semibold text-gray-600">
                          Account No:
                        </span>
                        <span>{paymentInstructions.bankTransfer.accountNo}</span>
                      </li>
                      <li className="flex justify-between gap-4">
                        <span className="font-semibold text-gray-600">
                          Account Type:
                        </span>
                        <span>{paymentInstructions.bankTransfer.accountType}</span>
                      </li>
                    </ul>

                    <ul className="space-y-3">
                      <li className="flex justify-between gap-4">
                        <span className="font-semibold text-gray-600">
                          IFSC Code:
                        </span>
                        <span>{paymentInstructions.bankTransfer.ifscCode}</span>
                      </li>
                      <li className="flex justify-between gap-4">
                        <span className="font-semibold text-gray-600">
                          Branch:
                        </span>
                        <span>{paymentInstructions.bankTransfer.branch}</span>
                      </li>
                      <li className="flex justify-between gap-4">
                        <span className="font-semibold text-gray-600">
                          Swift Code:
                        </span>
                        <span>{paymentInstructions.bankTransfer.swiftCode}</span>
                      </li>
                      <li className="flex justify-between gap-4">
                        <span className="font-semibold text-gray-600">
                          MICR:
                        </span>
                        <span>{paymentInstructions.bankTransfer.micr}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start space-x-6">
              <div className="shrink-0 w-12 h-12 bg-orange-500 text-white flex items-center justify-center rounded-full text-2xl font-bold">
                3
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-3">
                  Confirm Your Registration via Email
                </h3>
                <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg space-y-1">
                  <p className="font-bold">This is a mandatory step.</p>
                  <p>
                    {paymentInstructions.confirmationEmailInstruction}{" "}
                    <a
                      href={`mailto:${primaryEmail}`}
                      className="font-semibold underline"
                    >
                      {primaryEmail}
                    </a>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cancellation Policy */}
          <section className="py-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Cancellation Policy
              </h2>
              <p className="mt-3 text-lg text-gray-600">
                Please review the policy carefully before completing your
                registration.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <div
                className="bg-red-100 border-l-4 border-red-500 text-red-900 p-6 rounded-r-lg shadow-md"
                role="alert"
              >
                <div className="flex items-center">
                  <AlertTriangle className="shrink-0 h-6 w-6 mr-4" />
                  <div>
                    <p className="text-xl font-bold">Please Note:</p>
                    <p className="text-lg">
                      {paymentInstructions.cancellationPolicy}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact CTA */}
          <section className="py-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Have Questions?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              For any inquiries regarding registration, please don&apos;t
              hesitate to reach out to our committee.
            </p>
            <a
              href={`mailto:${primaryEmail}`}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-lg shadow-lg text-white bg-orange-500 hover:bg-orange-600 transition duration-300"
            >
              Contact Us at {primaryEmail}
            </a>
          </section>
        </div>
      </div>
    </>
  );
}
