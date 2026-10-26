export default function CoopPage() {
  return (
    <section className="space-y-6 animate-page">
      <h2 className="text-3xl font-bold text-slate-900">06 Multiplayer Co-Op Breathing Arena</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-3">
          <span className="px-3 py-1 rounded-full bg-[#13A4A9]/15 text-[#0B7377] text-xs font-bold">
            PLAYER 1 • XIAOMING
          </span>
          <div className="text-2xl font-bold">4,308 pts • FVC 3.89 L</div>
          <div className="h-3 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#0F8387] w-[86%]"></div>
          </div>
        </div>
        <div className="p-7 rounded-[32px] bg-white border border-slate-200/80 space-y-3">
          <span className="px-3 py-1 rounded-full bg-[#8E90C6]/20 text-[#5D5FA0] text-xs font-bold">
            PLAYER 2 • ALI (ONLINE)
          </span>
          <div className="text-2xl font-bold">4,120 pts • FVC 3.75 L</div>
          <div className="h-3 rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#71739E] w-[82%]"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
