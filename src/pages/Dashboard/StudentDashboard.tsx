import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { joinTrip, getMyTrips } from "../../services/tripService";

type Trip = {
  id: string;
  trip_code: string;
  trip_name: string;
  description: string | null;
  is_active: boolean;
  whatsapp_link: string | null;
  joined_at: string;
};

export default function StudentDashboard() {
  const { profile, signOut } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [tripCode, setTripCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  async function loadTrips() {
    try {
      setTrips(await getMyTrips());
    } catch {
      // silent — user just won't see trips
    } finally {
      setLoadingTrips(false);
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!tripCode.trim()) return;
    setJoinError(null);
    setJoinSuccess(null);
    setJoining(true);
    try {
      const trip = await joinTrip(tripCode);
      setJoinSuccess(`Joined "${trip.trip_name}" successfully!`);
      setTripCode("");
      loadTrips();
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join trip.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-indigo-400">Trip Pass</p>
          <h1 className="text-lg font-bold">
            Hey, {profile?.full_name?.split(" ")[0] ?? "there"} 👋
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/settings" className="text-sm text-slate-400 hover:text-white transition-colors">
            Settings
          </Link>
          <button onClick={signOut} className="text-sm text-slate-400 hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <section className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Join a Trip</h2>
          <form onSubmit={handleJoin} className="flex gap-3">
            <input
              value={tripCode}
              onChange={(e) => setTripCode(e.target.value.toUpperCase())}
              maxLength={7}
              placeholder="Enter 7-digit trip code"
              className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5
                text-sm text-white placeholder:text-slate-500 focus:outline-none
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 tracking-widest"
            />
            <button
              type="submit"
              disabled={joining || tripCode.length !== 7}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold
                hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {joining ? "Joining…" : "Join"}
            </button>
          </form>
          {joinError && <p className="mt-3 text-sm text-rose-400">{joinError}</p>}
          {joinSuccess && <p className="mt-3 text-sm text-emerald-400">{joinSuccess}</p>}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">My Trips</h2>
          {loadingTrips ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
            </div>
          ) : trips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center">
              <p className="text-slate-500 text-sm">No trips yet. Enter a trip code above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip) => (
                <Link
                  key={trip.id}
                  to={`/trip/${trip.id}`}
                  className="block rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-600
                    px-5 py-4 flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-lg tracking-widest">
                        {trip.trip_code}
                      </span>
                      {!trip.is_active && (
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-lg">Inactive</span>
                      )}
                    </div>
                    <p className="font-semibold text-white truncate">{trip.trip_name}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Joined {new Date(trip.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="shrink-0 text-slate-600">→</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}