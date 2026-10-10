import { listPages, listWebinars } from "@/lib/services";
import { notFound } from "next/navigation";
import RegistrationForm from "./registration-form";
import Link from "next/link";
import { Calendar, Video, ArrowLeft, ShieldCheck } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pages = await listPages();
  const page = pages.find((p) => p.slug === slug);
  return {
    title: page ? `${page.title} | Nexus Summit` : "Nexus Landing Page",
    description: page?.content?.substring(0, 160) || "Join our upcoming executive webinar.",
  };
}

export default async function PublicLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pages = await listPages();
  const page = pages.find((p) => p.slug === slug);

  if (!page) {
    notFound();
  }

  const webinars = await listWebinars();
  const webinar = webinars.find((w) => w.landing_page_id === page.id) || webinars[0];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 selection:bg-[#E8C2B3] selection:text-stone-900 font-sans">
      {/* Top Editorial Bar */}
      <header className="border-b border-stone-300 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-none bg-stone-900 text-stone-50 flex items-center justify-center font-serif font-bold text-sm shadow-[1px_1px_0px_0px_#78716C]">
              N
            </div>
            <span className="font-serif font-bold text-base text-stone-900 tracking-tight">Nexus Executive Briefings</span>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-stone-600 hover:text-stone-900 transition-colors bg-[#FAF8F5] px-3 py-1.5 rounded-none border border-stone-300 shadow-[1px_1px_0px_0px_#D6D3D1]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Platform
          </Link>
        </div>
      </header>

      {/* Main Section */}
      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Editorial Briefing Details */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-none bg-[#FDF5F1] border border-[#E8C2B3] text-[#C85A32] text-[10px] font-mono font-bold uppercase tracking-widest mb-4">
                Executive Masterclass & Briefing
              </div>

              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 leading-tight">
                {page.title}
              </h1>
            </div>

            <p className="text-base md:text-lg text-stone-600 leading-relaxed font-normal">
              {page.content}
            </p>

            {/* Custom HTML Content if rendered */}
            {page.html && (
              <div
                className="prose max-w-none text-stone-700 border-l-2 border-[#C85A32] pl-4 py-2 bg-white/60 p-3"
                dangerouslySetInnerHTML={{ __html: page.html }}
              />
            )}

            {/* Logistics Box */}
            <div className="p-6 rounded-none bg-white border border-stone-300 shadow-[3px_3px_0px_0px_#1C1917] space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-stone-500 border-b border-stone-200 pb-2">
                Session Logistics & Format
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-none bg-stone-100 text-stone-800 border border-stone-300">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-stone-500">Date & Schedule</div>
                    <div className="text-sm font-semibold text-stone-900">
                      {webinar ? new Date(webinar.scheduled_at).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : "Next Friday, 2:00 PM EST"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-none bg-stone-100 text-stone-800 border border-stone-300">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase text-stone-500">Conferencing Platform</div>
                    <div className="text-sm font-semibold text-stone-900">
                      Jitsi Meet Direct Video Room
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 text-xs font-mono text-[#4A5D4E]">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Direct Attendance • Instant Calendar Provisioning</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sharp Registration Card */}
          <div className="lg:col-span-5">
            <div className="p-8 rounded-none bg-white border border-stone-300 shadow-[4px_4px_0px_0px_#1C1917] relative">
              <div className="border-b border-stone-200 pb-4 mb-6">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C85A32] font-bold">
                  Complimentary Admission
                </span>
                <h2 className="font-serif text-2xl font-bold text-stone-900 mt-1">Reserve Your Seat</h2>
                <p className="text-xs text-stone-500 mt-1">
                  Complete registration to receive live room credentials and recorded materials.
                </p>
              </div>

              <RegistrationForm slug={slug} jitsiRoom={webinar?.jitsi_room} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
