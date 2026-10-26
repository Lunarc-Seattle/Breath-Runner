import { useApp } from '../app/AppContext.jsx';
import { PDF_COLORS } from '../data/simStore.js';
import { brand, onDeep } from '../styles/tokens.js';

const SIDEBAR_LINKS = [
  { slug: 'maps', label: '🌲 Training Maps', count: '3' },
  { slug: 'spirometry', label: '🫁 Spirometry Logs', count: '4' },
  { slug: 'hygiene', label: '📅 Disinfection Calendar', count: '5' },
  { slug: 'ranking', label: '🏆 Friends Ranking', count: '#1' }
];

const PROFILE_TAGS = ['BLE 5.0', 'FVC 3.89L', '200 Min', 'Lv.1 Crown', 'Lv.2 Medal'];

const TRAINING_MODULES = [
  {
    title: 'Forest · Level 1 (Inspiratory Basics)',
    sub: '1.5 kPa valve • 6 modules completed',
    status: 'Completed',
    statusColor: brand.teal.DEFAULT,
    mapId: 'MAP-FOREST-01'
  },
  {
    title: 'Sunlit Canyon · Level 2 (Dual Mode)',
    sub: '2.5 kPa valve • 8 modules completed',
    status: 'Completed',
    statusColor: brand.teal.DEFAULT,
    mapId: 'MAP-CANYON-02'
  },
  {
    title: 'Glacier Ridge · Level 3 (Deep Alveoli)',
    sub: '3.5 kPa valve • 5 modules in progress',
    status: 'In Progress',
    statusColor: brand.purple.DEFAULT,
    mapId: 'MAP-GLACIER-03'
  }
];

export default function ProfilePage() {
  const { state, navigate } = useApp();

  return (
    <section className="rounded-[36px] overflow-hidden border border-slate-200/90 shadow-lg bg-surface-lavender grid grid-cols-1 lg:grid-cols-12 animate-page">
      {/* Left Purple Sidebar (Ref Image 2 Clara Martin Style using the brand.purple token) */}
      <aside
        className="lg:col-span-3 p-7 text-white flex flex-col justify-between"
        style={{ backgroundColor: PDF_COLORS.purpleDeep }}
      >
        <div className="space-y-6">
          <div>
            <div className="text-xs opacity-80">Dashboard</div>
            <div className="text-xl font-bold leading-tight mt-0.5">
              Patient Profile
              <br />
              Lung Rehab
            </div>
          </div>

          <nav className="space-y-2 text-xs font-semibold">
            <div
              className="px-4 py-3 rounded-2xl bg-white text-brand-purple-ink flex items-center justify-between shadow-sm"
              aria-current="page"
            >
              <span>👤 My Profile</span>
              <span aria-hidden="true">●</span>
            </div>
            {SIDEBAR_LINKS.map(link => (
              <button
                type="button"
                key={link.slug}
                onClick={() => navigate(link.slug)}
                className="w-full text-left px-4 py-2.5 rounded-2xl hover:bg-white/15 flex justify-between"
              >
                <span>{link.label}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20">{link.count}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Decorative Vase & Botanical Leaves Illustration at Bottom Left (Matching Ref Image 2) */}
        <div className="pt-8 flex justify-center">
          <svg viewBox="0 0 140 160" className="w-32 h-36" aria-hidden="true">
            <path d="M70 95 Q45 55 35 25" stroke={brand.teal.DEFAULT} strokeWidth="2.5" fill="none" />
            <path d="M70 95 Q95 50 108 20" stroke={brand.pink.DEFAULT} strokeWidth="2.5" fill="none" />
            <ellipse cx="35" cy="25" rx="10" ry="18" transform="rotate(-25 35 25)" fill={brand.teal.DEFAULT} />
            <ellipse cx="108" cy="20" rx="10" ry="18" transform="rotate(25 108 20)" fill={brand.pink.DEFAULT} />
            <ellipse cx="70" cy="40" rx="11" ry="20" fill={brand.yellow.DEFAULT} />
            <path d="M48 95 L92 95 L100 148 C100 155 40 155 40 148 Z" fill={onDeep} fillOpacity="0.9" />
          </svg>
        </div>
      </aside>

      {/* Right 9 Cols Main Profile Content */}
      <div className="lg:col-span-9 p-6 lg:p-8 space-y-6">
        {/* Top Search & Title Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-800">My Profile & Progress</h2>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-full bg-white text-xs text-slate-500 border border-slate-200 flex items-center gap-2">
              <span>🔍 Search records, badges...</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('home')}
              className="px-4 py-2 rounded-full bg-brand-teal-deep text-white text-xs font-bold"
            >
              ← Welcome Page
            </button>
          </div>
        </div>

        {/* Profile Header Card (Avatar + Metadata + Social/Hospital Badges) */}
        <div className="rounded-3xl bg-white p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center text-3xl font-bold text-white shrink-0 shadow-md"
            style={{ background: `linear-gradient(135deg, ${brand.teal.DEFAULT}, ${brand.purple.DEFAULT})` }}
            aria-hidden="true"
          >
            XM
          </div>
          <div className="space-y-2 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h3 className="text-2xl font-bold text-slate-900">{state.userName}</h3>
              <span className="px-3 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal-ink text-xs font-bold">
                Activity Log: 4.3083
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
              <div>📅 Enrolled: {state.enrolledDate}</div>
              <div>🏥 Hospital: {state.hospital}</div>
              <div>🎂 Birth Date: {state.birthDate}</div>
              <div>✉️ E-mail: {state.email}</div>
            </div>
            <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-2">
              {PROFILE_TAGS.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-brand-purple/15 text-brand-purple-ink text-[11px] font-bold"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Grid: Training Modules Timeline (Left) + Rental Payment & Plan (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* My Training Modules (Mes formations style) */}
          <div className="lg:col-span-7 rounded-3xl bg-white p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-base text-slate-800">My Breathing Modules</h4>
              <span className="text-xs font-mono text-brand-teal-ink">Total: 200 min</span>
            </div>

            <div
              className="space-y-3 relative before:content-[''] before:w-0.5 before:bg-brand-purple/40 before:top-4 before:bottom-4 before:left-3"
              style={{ position: 'relative' }}
            >
              {TRAINING_MODULES.map(mod => (
                <button
                  type="button"
                  key={mod.title}
                  onClick={() => navigate('play')}
                  className="w-full text-left p-4 rounded-2xl bg-canvas hover:bg-brand-purple/15 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-sm text-slate-800">{mod.title}</div>
                    <div className="text-xs text-slate-600">{mod.sub}</div>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-white text-[10px] font-bold"
                    style={{ backgroundColor: mod.statusColor }}
                  >
                    {mod.status}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Rental Payment Info & Premium Hospital Care Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
              <h4 className="font-bold text-sm text-slate-800">Device Rental & Deposit</h4>
              <div className="p-3.5 rounded-2xl bg-slate-50 font-mono text-xs text-slate-600">
                Hospital Lease Card •••• 9942 (Deposit ¥228)
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Day {state.leaseUsedDays} / {state.leaseQuotaDays}
                </span>
                <button type="button" onClick={() => navigate('rental')} className="font-bold text-brand-teal-ink">
                  Manage Lease →
                </button>
              </div>
            </div>

            <div
              className="rounded-3xl p-6 text-white space-y-3 shadow-sm"
              style={{ backgroundColor: PDF_COLORS.tealDeep }}
            >
              <h4 className="font-bold text-base">Hospital Telehealth Plan</h4>
              <ul className="text-xs space-y-1.5 opacity-95">
                <li>✓ Real-time 1,000Hz spirometry cloud sync</li>
                <li>✓ Weekly thoracic surgeon prescription review</li>
                <li>✓ Free hospital UV-C mouthpiece sterilization</li>
              </ul>
              <button
                type="button"
                onClick={() => navigate('hygiene')}
                className="w-full py-2.5 rounded-2xl bg-brand-pink text-slate-900 font-bold text-xs mt-2"
              >
                Book Sterilization Slot
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Recent Activity Card */}
        <div className="rounded-3xl bg-white p-6 shadow-sm space-y-3">
          <h4 className="font-bold text-base text-slate-800">Recent Recovery Activity</h4>
          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex justify-between items-center">
              <span>
                🫁 <strong>Spirometry FVC 3.89L</strong> recorded in Digital Lab
              </span>
              <span className="text-slate-500">Today • &gt;</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span>
                🌲 <strong>Forest Level 1</strong> breath runner session completed (+320 coins)
              </span>
              <span className="text-slate-500">Yesterday • &gt;</span>
            </div>
            <div className="py-2.5 flex justify-between items-center">
              <span>
                🏅 <strong>Lv.2 Endurance Medal</strong> unlocked (200 total training minutes)
              </span>
              <span className="text-slate-500">2 days ago • &gt;</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
