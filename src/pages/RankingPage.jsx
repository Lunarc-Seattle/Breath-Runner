import { useApp } from '../app/AppContext.jsx';
import { useSavedRuns } from '../app/useSavedRuns.js';
import { coinsLast7 } from '../core/progress.ts';
import { Avatar, btn, Card, CardHead, PageHeader, SampleTag } from '../components/ui.jsx';

const nf = new Intl.NumberFormat('en-US');

/** 07 Friends ranking: this week's coins, the same board as the Home friends card, drawn as bars. */
export default function RankingPage() {
  const { state, navigate } = useApp();
  const { runs, status } = useSavedRuns();
  const myCoins = status === 'ready' ? coinsLast7(runs) : 0;

  const board = [...state.friendsThisWeek, { name: 'You', initials: 'L', tone: 'teal', coins: myCoins, me: true }].sort(
    (a, b) => b.coins - a.coins
  );
  const top = Math.max(1, ...board.map(r => r.coins));
  const myRank = board.findIndex(r => r.me) + 1;
  const ahead = board[myRank - 2];

  return (
    <section className="animate-page" aria-labelledby="ranking-title">
      <PageHeader
        id="ranking-title"
        title="Friends ranking"
        tag={<SampleTag>Sample friends</SampleTag>}
        caption="Coins from saved runs in the last 7 days. Your row comes from your own runs."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] gap-6 items-start">
        <Card aria-labelledby="board-title">
          <CardHead id="board-title" title="This week" caption="Coins collected, highest first" />
          <ol className="space-y-1">
            {board.map((r, i) => (
              <li
                key={r.name}
                title={`${r.name}: ${nf.format(r.coins)} coins`}
                className={`grid grid-cols-[1.5rem_auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 rounded-2xl ${
                  r.me ? 'bg-surface-mint/60' : ''
                }`}
              >
                <span className="text-sm font-semibold tabular-nums text-slate-600">{i + 1}</span>
                {/* The white avatar tint is for the lavender Home card; on this white card it would vanish. */}
                <Avatar initials={r.initials} tone={r.tone === 'white' ? 'lavender' : r.tone} />
                <span className="min-w-0 space-y-1.5">
                  <span
                    className={`block text-sm truncate ${r.me ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}
                  >
                    {r.name}
                  </span>
                  <span className="block h-2 rounded-full bg-canvas overflow-hidden">
                    <span
                      className={`block h-full rounded-full ${r.me ? 'bg-chart-line' : 'bg-brand-teal-deep'}`}
                      style={{ width: `${Math.max(2, (r.coins / top) * 100)}%` }}
                    />
                  </span>
                </span>
                <span className="w-14 text-right text-sm font-semibold tabular-nums text-slate-900">
                  {nf.format(r.coins)}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card tone="lavender" aria-labelledby="you-title">
          <CardHead id="you-title" title="Your week" />
          <p className="text-[40px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">
            #{myRank}
            <span className="text-base font-normal text-slate-600 ml-2">of {board.length}</span>
          </p>
          <p className="text-sm text-slate-700 mt-3 mb-5">
            {status !== 'ready'
              ? 'Loading your saved runs…'
              : ahead
                ? `${nf.format(ahead.coins - myCoins)} coins behind ${ahead.name}.`
                : 'You are ahead of every friend this week.'}
          </p>
          <button type="button" onClick={() => navigate('play')} className={`${btn.primary} w-full`}>
            Play a run
          </button>
        </Card>
      </div>
    </section>
  );
}
