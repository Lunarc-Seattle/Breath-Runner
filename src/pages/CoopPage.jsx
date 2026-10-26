export default function CoopPage() {
  return (
    <section className="space-y-6 animate-page">
      <h2 className="text-3xl font-bold text-slate-900">06 Multiplayer Co-Op Breathing Arena</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-3">
          <span className="px-3 py-1 rounded-full bg-brand-teal/15 text-brand-teal-ink text-xs font-bold">
            PLAYER 1 • XIAOMING
          </span>
          <div className="text-2xl font-bold">4,308 pts • FVC 3.89 L</div>
          <div className="h-3 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-teal-deep w-[86%]"></div>
          </div>
        </div>
        <div className="p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-3">
          <span className="px-3 py-1 rounded-full bg-brand-purple/20 text-brand-purple-ink text-xs font-bold">
            PLAYER 2 • ALI (ONLINE)
          </span>
          <div className="text-2xl font-bold">4,120 pts • FVC 3.75 L</div>
          <div className="h-3 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-purple-deep w-[82%]"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
