import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMyTripById, getActiveParticipantCount } from "../../services/tripService";
import {
  getVisiblePaymentsForTrip,
  submitPayment,
  type Installment,
  type Payment,
} from "../../services/paymentService";
import { downloadReceiptPdf } from "../../services/reciptService";
import { getItineraries, getItineraryDownloadUrl, type Itinerary } from "../../services/itineraryService";
import { ItineraryRow } from "../../components/ui/ItineraryRow";
import { AdsFooter } from "../../components/ads/AdsFooter";

type Trip = {
  id: string;
  trip_code: string;
  trip_name: string;
  description: string | null;
  is_active: boolean;
  whatsapp_link: string | null;
  joined_at: string;
};

type Tab = "info" | "payments";

export default function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const { profile } = useAuth();
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("info");
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);

  useEffect(() => {
    if (!tripId) return;
    getMyTripById(tripId).then(setTrip);
    getItineraries(tripId).then(setItineraries);
  }, [tripId]);

  async function handleDownloadItinerary(item: Itinerary) {
    try {
      const url = await getItineraryDownloadUrl(item.file_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Could not open this file. Try again.");
    }
  }

  if (trip === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
      </div>
    );
  }

  if (trip === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400 text-sm">You're not part of this trip (or it doesn't exist).</p>
        <Link to="/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* Fixed header — trip title never scrolls away */}
      <header className="shrink-0 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Link to="/dashboard" className="text-xs text-slate-500 hover:text-white transition-colors">
              ← All trips
            </Link>
            <h1 className="text-lg font-bold truncate">{trip.trip_name}</h1>
          </div>
          <span className="shrink-0 font-mono text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-lg tracking-widest">
            {trip.trip_code}
          </span>
        </div>
        <div className="flex gap-6 mt-3">
          <TabButton active={tab === "info"} onClick={() => setTab("info")}>
            Trip Info
          </TabButton>
          <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>
            Payments
          </TabButton>
        </div>
      </header>

      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {tab === "info" && (
          <>
            <div className="flex-1 min-h-0 flex">
              {/* Left: description — 4 parts */}
              <div className="flex-[4] min-w-0 overflow-y-auto p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">About this trip</h2>
                {trip.description ? (
                  <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{trip.description}</p>
                ) : (
                  <p className="text-slate-600 text-sm">No description added yet.</p>
                )}
              </div>

              {/* Right: WhatsApp + itinerary — 1 part */}
              <div className="flex-[1] min-w-[220px] overflow-y-auto border-l border-slate-800 p-4 space-y-3">
                {trip.whatsapp_link && (
                  <a
                    href={trip.whatsapp_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300
                      hover:bg-emerald-900 px-4 py-3 text-sm font-medium text-center transition-colors"
                  >
                    Join on WhatsApp →
                  </a>
                )}

                {itineraries.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Itinerary</p>
                    {itineraries.map((item) => (
                      <ItineraryRow key={item.id} item={item} onDownload={() => handleDownloadItinerary(item)} />
                    ))}
                  </div>
                )}

                {!trip.whatsapp_link && itineraries.length === 0 && (
                  <p className="text-xs text-slate-600">Nothing here yet.</p>
                )}
              </div>
            </div>

            {/* Fixed footer ad — never scrolls */}
            <AdsFooter />
          </>
        )}

        {tab === "payments" && (
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <PaymentsPanel tripId={trip.id} tripName={trip.trip_name} studentName={profile?.full_name ?? ""} />
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
        active ? "border-indigo-400 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function PaymentsPanel({
  tripId,
  tripName,
  studentName,
}: {
  tripId: string;
  tripName: string;
  studentName: string;
}) {
  const [items, setItems] = useState<
    { installment: Installment; shareAmount: number; myPayment: Payment | null }[] | null
  >(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    const count = await getActiveParticipantCount(tripId);
    setItems(await getVisiblePaymentsForTrip(tripId, count));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  if (items === null) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center">
        <p className="text-slate-500 text-sm">No payments have been set up for this trip yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3">
      {items.map(({ installment, shareAmount, myPayment }) => (
        <PaymentTile
          key={installment.id}
          installment={installment}
          shareAmount={shareAmount}
          payment={myPayment}
          expanded={expandedId === installment.id}
          onToggle={() => setExpandedId((id) => (id === installment.id ? null : installment.id))}
          tripId={tripId}
          tripName={tripName}
          studentName={studentName}
          onChanged={load}
        />
      ))}
    </div>
  );
}

function PaymentTile({
  installment,
  shareAmount,
  payment,
  expanded,
  onToggle,
  tripId,
  tripName,
  studentName,
  onChanged,
}: {
  installment: Installment;
  shareAmount: number;
  payment: Payment | null;
  expanded: boolean;
  onToggle: () => void;
  tripId: string;
  tripName: string;
  studentName: string;
  onChanged: () => void;
}) {
  const [transactionId, setTransactionId] = useState(payment?.transaction_id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOverdue =
    installment.due_date && payment?.status !== "verified" && new Date(installment.due_date) < new Date();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transactionId.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitPayment(installment.id, tripId, transactionId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit payment.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDownloadReceipt() {
    if (!payment?.receipt_number || !payment.verified_at) return;
    downloadReceiptPdf({
      receiptNumber: payment.receipt_number,
      tripName,
      installmentNo: installment.installment_no,
      amount: shareAmount,
      transactionId: payment.transaction_id,
      studentName,
      verifiedAt: payment.verified_at,
    });
  }

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      <button onClick={onToggle} className="w-full text-left px-5 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold truncate">{installment.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            ₹{shareAmount.toFixed(2)}
            {installment.due_date && (
              <span className={isOverdue ? "text-rose-400" : ""}>
                {" · "}Pay before {new Date(installment.due_date).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {payment && <StatusPill status={payment.status} />}
          <span className={`text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 px-5 py-4 space-y-3">
          {installment.details && <p className="text-sm text-slate-400">{installment.details}</p>}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500 text-xs">Amount</p>
              <p className="text-white font-semibold">₹{shareAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Pay before</p>
              <p className={isOverdue ? "text-rose-400 font-semibold" : "text-white"}>
                {installment.due_date ? new Date(installment.due_date).toLocaleDateString() : "No deadline"}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">UPI ID</p>
              <p className="text-white font-mono">{installment.upi_id}</p>
            </div>
          </div>

          {installment.qr_code_path && (
            <img
              src={installment.qr_code_path}
              alt="Payment QR code"
              className="w-40 h-40 object-contain rounded-xl bg-white p-2"
            />
          )}

          {payment?.status === "verified" ? (
            <div className="space-y-2">
              <p className="text-sm text-emerald-400">
                Verified — receipt no. <span className="font-mono">{payment.receipt_number}</span>
              </p>
              <button
                onClick={handleDownloadReceipt}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-600 px-4 py-2 text-sm font-semibold transition-colors"
              >
                Download Receipt (PDF)
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2">
              {payment?.status === "rejected" && payment.admin_note && (
                <p className="text-sm text-rose-400">
                  Rejected: {payment.admin_note} — please re-check and resubmit, or contact the organizer.
                </p>
              )}
              <label className="block text-xs text-slate-400 uppercase tracking-wider">Transaction ID</label>
              <div className="flex gap-2">
                <input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. UPI ref number"
                  className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5
                    text-sm text-white placeholder:text-slate-500 focus:outline-none
                    focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={submitting || !transactionId.trim()}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                    px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  {submitting ? "Sending…" : "Send"}
                </button>
              </div>
              {payment?.status === "pending" && (
                <p className="text-xs text-slate-500">Waiting for the organizer to verify this payment manually.</p>
              )}
              {error && <p className="text-sm text-rose-400">{error}</p>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles =
    status === "verified"
      ? "bg-emerald-900 text-emerald-300"
      : status === "rejected"
        ? "bg-rose-900 text-rose-300"
        : "bg-amber-900 text-amber-300";
  return <span className={`text-xs px-2 py-0.5 rounded-lg ${styles}`}>{status}</span>;
}