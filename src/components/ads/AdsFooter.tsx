import { useMemo } from "react";

type AppAd = {
  name: string;
  url: string;
  quotes: string[];
};

const APPS: AppAd[] = [
  {
    name: "Trackate",
    url: "https://play.google.com/store/apps/details?id=com.svnate.trackate&hl=en",
    quotes: [
      "Know exactly where every rupee of the trip went.",
      "Split expenses with friends without the group-chat math.",
      "Track group spending as easily as you track steps.",
      "Never lose a receipt on a trip again.",
    ],
  },
  {
    name: "Spinmeal",
    url: "https://play.google.com/store/apps/details?id=com.svnate.spinmeal&hl=en-US",
    quotes: [
      "Can't decide where to eat? Let the spin decide.",
      "End 'what do you want to eat' arguments for good.",
      "Discover your next favorite meal in one spin.",
      "Group hungry, decision paralyzed? Spin it away.",
    ],
  },
  {
    name: "Growate",
    url: "https://play.google.com/store/apps/details?id=com.svnate.growate&hl=en-US",
    quotes: [
      "Small daily habits, tracked simply.",
      "Growth looks better as a streak.",
      "Build the habit, keep the streak, see the growth.",
      "One tap a day keeps procrastination away.",
    ],
  },
];

/** Picks one random app + one random quote from it, fixed for the
 * lifetime of this mount (re-randomizes on next page load, per the
 * "changing on each refresh" ask). */
export function AdsFooter() {
  const pick = useMemo(() => {
    const app = APPS[Math.floor(Math.random() * APPS.length)];
    const quote = app.quotes[Math.floor(Math.random() * app.quotes.length)];
    return { app, quote };
  }, []);

  return (
    <a
      href={pick.app.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-4 border-t border-slate-800 bg-slate-900 px-5 py-3 shrink-0 hover:bg-slate-800/60 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">"{pick.quote}"</p>
        <p className="text-xs font-semibold text-indigo-400 mt-0.5">{pick.app.name}</p>
      </div>
      <span className="shrink-0 text-xs font-medium text-slate-400 border border-slate-700 rounded-lg px-3 py-1.5 hover:border-indigo-600 hover:text-white transition-colors">
        Get the app →
      </span>
    </a>
  );
}