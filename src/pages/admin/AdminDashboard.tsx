import { getAadharDownloadUrl } from "../../services/tripService";
import { downloadCsv } from "../../services/csvExport";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  createTrip,
  getAllTrips,
  getTripParticipants,
  setParticipantStatus,
  removeParticipant,
  setTripWhatsappLink,
  getActiveParticipantCount,
  type Participant,
} from "../../services/tripService";
import {
  createInstallment,
  updateInstallment,
  deleteInstallment,
  getInstallmentsForTrip,
  getInstallmentParticipantIds,
  getPaymentsForInstallment,
  getInsightsForTrip,
  verifyPayment,
  rejectPayment,
  type Installment,
  type PaymentWithProfile,
  type InstallmentInsights,
} from "../../services/paymentService";
import {
  uploadItinerary,
  getItineraries,
  deleteItinerary,
  getItineraryDownloadUrl,
  type Itinerary,
} from "../../services/itineraryService";
import {
  addExpense,
  getExpenses,
  deleteExpense,
  summarizeByCategory,
  EXPENSE_CATEGORIES,
  type Expense,
} from "../../services/expenseService";
import { ItineraryRow } from "../../components/ui/ItineraryRow";

type Trip = {
  id: string;
  trip_code: string;
  trip_name: string;
  description: string | null;
  is_active: boolean;
  whatsapp_link: string | null;
  created_at: string;
};

type Tab = "participants" | "payments" | "itinerary" | "expenses";

type InstallmentFormState = {
  title: string;
  details: string;
  amount: string;
  due_date: string;
  upi_id: string;
  qrFile: File | null;
  visibility: "all" | "selected";
  split_type: "individual" | "split";
  participantIds: string[];
};

const EMPTY_FORM: InstallmentFormState = {
  title: "",
  details: "",
  amount: "",
  due_date: "",
  upi_id: "",
  qrFile: null,
  visibility: "all",
  split_type: "individual",
  participantIds: [],
};

export default function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tab, setTab] = useState<Tab>("participants");
  const [activeParticipantCount, setActiveParticipantCount] = useState(0);


  // Participants
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [detailParticipant, setDetailParticipant] = useState<Participant | null>(null);

  // Create trip form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // WhatsApp link
  const [waLink, setWaLink] = useState("");
  const [savingWaLink, setSavingWaLink] = useState(false);
  const [waSaved, setWaSaved] = useState(false);

  // Payments (payment items, formerly "installments")
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [payments, setPayments] = useState<PaymentWithProfile[]>([]);
  const [insights, setInsights] = useState<InstallmentInsights[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [detailPayment, setDetailPayment] = useState<PaymentWithProfile | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InstallmentFormState>(EMPTY_FORM);
  const [savingInstallment, setSavingInstallment] = useState(false);
  const [installmentError, setInstallmentError] = useState<string | null>(null);

  // Itinerary
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loadingItineraries, setLoadingItineraries] = useState(false);
  const [itineraryFile, setItineraryFile] = useState<File | null>(null);
  const [uploadingItinerary, setUploadingItinerary] = useState(false);
  const [itineraryError, setItineraryError] = useState<string | null>(null);

  // Expenses
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expCategory, setExpCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [expDescription, setExpDescription] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  async function loadTrips() {
    try {
      setTrips((await getAllTrips()) as Trip[]);
    } finally {
      setLoadingTrips(false);
    }
  }

  async function loadParticipants(tripId: string) {
    setLoadingParticipants(true);
    try {
      setParticipants(await getTripParticipants(tripId));
    } finally {
      setLoadingParticipants(false);
    }
  }

  async function loadInstallments(tripId: string) {
    setLoadingInstallments(true);
    try {
      setInstallments(await getInstallmentsForTrip(tripId));
      setSelectedInstallment(null);
      setPayments([]);
    } finally {
      setLoadingInstallments(false);
    }
  }

  async function loadInsights(tripId: string, count: number) {
    setLoadingInsights(true);
    try {
      setInsights(await getInsightsForTrip(tripId, count));
    } finally {
      setLoadingInsights(false);
    }
  }

  async function loadItineraries(tripId: string) {
    setLoadingItineraries(true);
    try {
      setItineraries(await getItineraries(tripId));
    } finally {
      setLoadingItineraries(false);
    }
  }

  async function loadExpenses(tripId: string) {
    setLoadingExpenses(true);
    try {
      setExpenses(await getExpenses(tripId));
    } finally {
      setLoadingExpenses(false);
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  function goBackToTrips() {
    setSelectedTrip(null);
    setParticipants([]);
    setInstallments([]);
    setInsights([]);
    setSelectedInstallment(null);
    setPayments([]);
    setItineraries([]);
    setExpenses([]);
    setTab("participants");
  }

  async function handleDownloadAadhar(path: string, studentName: string) {
    try {
      const url = await getAadharDownloadUrl(path);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${studentName} - Aadhar`;
      a.click();
    } catch {
      alert("Could not generate download link. Try again.");
    }
  }

  function handleExportParticipants() {
    const rows = participants
      .filter((p) => p.profiles)
      .map((p) => ({
        Name: p.profiles!.full_name,
        Status: p.status,
        Age: p.profiles!.age ?? "",
        Gender: p.profiles!.gender === "other" ? p.profiles!.gender_other : p.profiles!.gender,
        "Contact (calling)": p.profiles!.phone_calling ?? "",
        "Contact (WhatsApp)": p.profiles!.phone_whatsapp ?? "",
        "Guardian Name": p.profiles!.guardian_name ?? "",
        "Guardian Contact": p.profiles!.guardian_contact ?? "",
        "Guardian Relation": p.profiles!.guardian_relation ?? "",
        College: p.profiles!.college_name ?? "",
        Department: p.profiles!.department ?? "",
        "Year of Study": p.profiles!.year_of_study ?? "",
        "Aadhar Number": p.profiles!.aadhar_number ?? "",
        "ID Verification": p.profiles!.id_verification_status,
        "Joined At": new Date(p.joined_at).toLocaleString(),
      }));
    downloadCsv(`${selectedTrip?.trip_name ?? "trip"}-participants.csv`, rows);
  }

  function handleExportPayments() {
    const rows = payments.map((pay) => ({
      Name: pay.profiles?.full_name ?? "Unknown",
      College: pay.profiles?.college_name ?? "",
      "Transaction ID": pay.transaction_id,
      Status: pay.status,
      "Submitted At": new Date(pay.submitted_at).toLocaleString(),
      "Verified At": pay.verified_at ? new Date(pay.verified_at).toLocaleString() : "",
      "Receipt No.": pay.receipt_number ?? "",
      Note: pay.admin_note ?? "",
    }));
    downloadCsv(`${selectedTrip?.trip_name ?? "trip"}-${selectedInstallment?.title ?? "payments"}.csv`, rows);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createTrip(newName.trim(), newDesc.trim());
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      loadTrips();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create trip.");
    } finally {
      setCreating(false);
    }
  }

  async function selectTrip(trip: Trip) {
    setSelectedTrip(trip);
    setWaLink(trip.whatsapp_link ?? "");
    setWaSaved(false);
    setTab("participants");
    loadParticipants(trip.id);
    loadInstallments(trip.id);
    loadItineraries(trip.id);
    loadExpenses(trip.id);
    const count = await getActiveParticipantCount(trip.id);
    setActiveParticipantCount(count);
    loadInsights(trip.id, count);
  }

  async function handleSaveWaLink() {
    if (!selectedTrip) return;
    setSavingWaLink(true);
    setWaSaved(false);
    try {
      await setTripWhatsappLink(selectedTrip.id, waLink);
      setSelectedTrip({ ...selectedTrip, whatsapp_link: waLink.trim() || null });
      setTrips((prev) =>
        prev.map((t) => (t.id === selectedTrip.id ? { ...t, whatsapp_link: waLink.trim() || null } : t))
      );
      setWaSaved(true);
    } finally {
      setSavingWaLink(false);
    }
  }

  async function handleBlock(userId: string, current: string) {
    if (!selectedTrip) return;
    await setParticipantStatus(selectedTrip.id, userId, current === "active" ? "blocked" : "active");
    loadParticipants(selectedTrip.id);
    setDetailParticipant(null);
  }

  async function handleRemove(userId: string) {
    if (!selectedTrip) return;
    if (!confirm("Remove this student from the trip?")) return;
    await removeParticipant(selectedTrip.id, userId);
    loadParticipants(selectedTrip.id);
    setDetailParticipant(null);
  }

  // ---------- Payment item form (create + edit share this) ----------

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setInstallmentError(null);
    setFormOpen(true);
  }

  async function openEditForm(inst: Installment) {
    setEditingId(inst.id);
    setInstallmentError(null);
    let participantIds: string[] = [];
    if (inst.visibility === "selected") {
      participantIds = await getInstallmentParticipantIds(inst.id);
    }
    setForm({
      title: inst.title,
      details: inst.details ?? "",
      amount: String(inst.amount),
      due_date: inst.due_date ?? "",
      upi_id: inst.upi_id,
      qrFile: null,
      visibility: inst.visibility,
      split_type: inst.split_type,
      participantIds,
    });
    setFormOpen(true);
  }

  function toggleParticipant(userId: string) {
    setForm((f) => ({
      ...f,
      participantIds: f.participantIds.includes(userId)
        ? f.participantIds.filter((id) => id !== userId)
        : [...f.participantIds, userId],
    }));
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip || !form.title.trim() || !form.amount || !form.upi_id.trim()) return;
    if (form.visibility === "selected" && form.participantIds.length === 0) {
      setInstallmentError("Select at least one participant, or switch visibility to \"Everyone\".");
      return;
    }
    setSavingInstallment(true);
    setInstallmentError(null);
    try {
      const values = {
        title: form.title,
        details: form.details,
        amount: Number(form.amount),
        due_date: form.due_date || null,
        upi_id: form.upi_id.trim(),
        qrFile: form.qrFile,
        visibility: form.visibility,
        split_type: form.split_type,
        participantIds: form.participantIds,
      };
      if (editingId) {
        await updateInstallment(editingId, selectedTrip.id, values);
      } else {
        await createInstallment(selectedTrip.id, values);
      }
      setFormOpen(false);
      loadInstallments(selectedTrip.id);
      loadInsights(selectedTrip.id, activeParticipantCount);
    } catch (err) {
      setInstallmentError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSavingInstallment(false);
    }
  }

  async function handleDeleteInstallment(inst: Installment) {
    if (!selectedTrip) return;
    if (!confirm(`Delete "${inst.title}"? Any submissions for it will be removed too.`)) return;
    await deleteInstallment(inst.id, selectedTrip.id);
    loadInstallments(selectedTrip.id);
    loadInsights(selectedTrip.id, activeParticipantCount);
  }

  async function selectInstallment(inst: Installment) {
    setSelectedInstallment(inst);
    setPayments(await getPaymentsForInstallment(inst.id));
  }

  async function handleVerify(paymentId: string) {
    await verifyPayment(paymentId);
    if (selectedInstallment) selectInstallment(selectedInstallment);
    if (selectedTrip) loadInsights(selectedTrip.id, activeParticipantCount);
  }

  async function handleReject(paymentId: string) {
    const note = prompt("Reason for rejecting (shown to the student):") ?? "";
    await rejectPayment(paymentId, note);
    if (selectedInstallment) selectInstallment(selectedInstallment);
    if (selectedTrip) loadInsights(selectedTrip.id, activeParticipantCount);
  }

  // ---------- Itinerary ----------

  async function handleUploadItinerary(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip || !itineraryFile) return;
    setUploadingItinerary(true);
    setItineraryError(null);
    try {
      await uploadItinerary(selectedTrip.id, itineraryFile);
      setItineraryFile(null);
      loadItineraries(selectedTrip.id);
    } catch (err) {
      setItineraryError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingItinerary(false);
    }
  }

  async function handleDeleteItinerary(item: Itinerary) {
    if (!confirm(`Delete "${item.file_name}"?`)) return;
    await deleteItinerary(item);
    loadItineraries(selectedTrip!.id);
  }

  async function handleDownload(item: Itinerary) {
    try {
      const url = await getItineraryDownloadUrl(item.file_path);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.file_name;
      a.click();
    } catch {
      alert("Could not generate download link. Try again.");
    }
  }

  // ---------- Expenses ----------

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip || !expAmount) return;
    setSavingExpense(true);
    setExpenseError(null);
    try {
      await addExpense(selectedTrip.id, {
        category: expCategory,
        description: expDescription,
        amount: Number(expAmount),
        expense_date: expDate,
      });
      setExpDescription("");
      setExpAmount("");
      loadExpenses(selectedTrip.id);
    } catch (err) {
      setExpenseError(err instanceof Error ? err.message : "Failed to add expense.");
    } finally {
      setSavingExpense(false);
    }
  }

  async function handleDeleteExpense(exp: Expense) {
    if (!selectedTrip) return;
    if (!confirm("Delete this expense entry?")) return;
    await deleteExpense(exp.id, selectedTrip.id);
    loadExpenses(selectedTrip.id);
  }

  const expenseSummary = summarizeByCategory(expenses);
  const grandTotalCollected = insights.reduce((sum, row) => sum + row.verifiedTotal, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-amber-400">Trip Pass · Admin</p>
          <h1 className="text-lg font-bold">{profile?.full_name ?? "Admin"} — Organizer Console</h1>
        </div>
        <button onClick={signOut} className="text-sm text-slate-400 hover:text-white transition-colors">
          Sign out
        </button>
      </header>

      {selectedTrip && (
        <div className="border-b border-slate-800 px-6 flex items-center gap-4 overflow-x-auto">
          <button
            onClick={goBackToTrips}
            className="py-3 text-sm font-medium text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors shrink-0"
          >
            ← All Batches
          </button>
          <div className="h-5 w-px bg-slate-800 shrink-0" />
          <TabButton active={tab === "participants"} onClick={() => setTab("participants")}>
            Participants
          </TabButton>
          <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>
            Payments
          </TabButton>
          <TabButton active={tab === "itinerary"} onClick={() => setTab("itinerary")}>
            Itinerary
          </TabButton>
          <TabButton active={tab === "expenses"} onClick={() => setTab("expenses")}>
            Expenses
          </TabButton>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* ── Batch list ── */}
        {!selectedTrip && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">All Trip Batches</h2>
              <button
                onClick={() => setShowCreate((s) => !s)}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 text-sm font-semibold transition-colors"
              >
                {showCreate ? "Cancel" : "+ New Batch"}
              </button>
            </div>

            {showCreate && (
              <form onSubmit={handleCreate} className="rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-4">
                <h3 className="font-semibold">Create Trip Batch</h3>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Trip Name *</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Manali Winter 2025"
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Description</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={3}
                    placeholder="Dates, highlights, price…"
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>
                {createError && <p className="text-sm text-rose-400">{createError}</p>}
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 px-4 py-2 text-sm font-semibold transition-colors"
                >
                  {creating ? "Creating…" : "Create Batch"}
                </button>
              </form>
            )}

            {loadingTrips ? (
              <Spinner />
            ) : trips.length === 0 ? (
              <Empty>No trip batches yet. Create one above.</Empty>
            ) : (
              <div className="space-y-3">
                {trips.map((trip) => (
                  <AdminTripTile key={trip.id} trip={trip} onManage={() => selectTrip(trip)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Participants tab ── */}
        {selectedTrip && tab === "participants" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-white">{selectedTrip.trip_name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Code: <span className="font-mono text-indigo-400 tracking-widest">{selectedTrip.trip_code}</span>
                  {" · "}Share with students to let them join.
                </p>
              </div>
              {participants.length > 0 && (
                <button
                  onClick={handleExportParticipants}
                  className="shrink-0 rounded-xl border border-slate-700 hover:border-emerald-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Export CSV
                </button>
              )}
            </div>

            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider">WhatsApp Group Link</label>
              <p className="text-xs text-slate-600">Shown to participants as a "Join on WhatsApp" button.</p>
              <div className="flex gap-2">
                <input
                  value={waLink}
                  onChange={(e) => setWaLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/…"
                  className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleSaveWaLink}
                  disabled={savingWaLink}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-4 py-2 text-sm font-semibold transition-colors"
                >
                  {savingWaLink ? "Saving…" : "Save"}
                </button>
              </div>
              {waSaved && <p className="text-xs text-emerald-400">Saved.</p>}
            </div>

            {loadingParticipants ? (
              <Spinner />
            ) : participants.length === 0 ? (
              <Empty>No participants yet.</Empty>
            ) : (
              <div className="space-y-2">
                {participants.map((p) =>
                  p.profiles ? (
                    <ParticipantListTile key={p.profiles.id} participant={p} onClick={() => setDetailParticipant(p)} />
                  ) : null
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Payments tab ── */}
        {selectedTrip && tab === "payments" && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">{selectedTrip.trip_name} — Payments</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Installments, bus fare, or any other collection — each item is independent.
                </p>
              </div>
              <button
                onClick={openCreateForm}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 text-sm font-semibold transition-colors shrink-0"
              >
                + New Payment
              </button>
            </div>

            {formOpen && (
              <form
                onSubmit={handleSubmitForm}
                className="rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-4"
              >
                <h3 className="font-semibold">{editingId ? "Edit Payment" : "New Payment"}</h3>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Installment 2, Bus Fare"
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Details</label>
                  <textarea
                    value={form.details}
                    onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                    rows={2}
                    placeholder="Anything students should know about this payment"
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 uppercase tracking-wider">
                      {form.split_type === "split" ? "Total Amount (₹) *" : "Amount per Participant (₹) *"}
                    </label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 uppercase tracking-wider">Pay before (due date)</label>
                    <input
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 uppercase tracking-wider">Amount Type</label>
                    <div className="flex rounded-xl border border-slate-700 overflow-hidden text-sm">
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, split_type: "individual" }))}
                        className={`flex-1 py-2 ${form.split_type === "individual" ? "bg-amber-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-400"}`}
                      >
                        Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, split_type: "split" }))}
                        className={`flex-1 py-2 ${form.split_type === "split" ? "bg-amber-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-400"}`}
                      >
                        Split evenly
                      </button>
                    </div>
                    <p className="text-xs text-slate-600">
                      {form.split_type === "split"
                        ? "Total divided evenly across everyone this applies to — e.g. one bus fare shared by riders."
                        : "Same fixed amount charged to each participant this applies to."}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 uppercase tracking-wider">Visible to</label>
                    <div className="flex rounded-xl border border-slate-700 overflow-hidden text-sm">
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, visibility: "all" }))}
                        className={`flex-1 py-2 ${form.visibility === "all" ? "bg-amber-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-400"}`}
                      >
                        Everyone
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, visibility: "selected" }))}
                        className={`flex-1 py-2 ${form.visibility === "selected" ? "bg-amber-500 text-slate-950 font-semibold" : "bg-slate-800 text-slate-400"}`}
                      >
                        Select participants
                      </button>
                    </div>
                  </div>
                </div>

                {form.visibility === "selected" && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 uppercase tracking-wider">
                      Participants ({form.participantIds.length} selected)
                    </label>
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-700 divide-y divide-slate-800">
                      {participants
                        .filter((p) => p.status === "active" && p.profiles)
                        .map((p) => (
                          <label
                            key={p.profiles!.id}
                            className="flex items-center gap-3 px-3.5 py-2 text-sm cursor-pointer hover:bg-slate-800"
                          >
                            <input
                              type="checkbox"
                              checked={form.participantIds.includes(p.profiles!.id)}
                              onChange={() => toggleParticipant(p.profiles!.id)}
                              className="accent-amber-500"
                            />
                            <span className="text-slate-200">{p.profiles!.full_name}</span>
                          </label>
                        ))}
                      {participants.filter((p) => p.status === "active").length === 0 && (
                        <p className="px-3.5 py-3 text-xs text-slate-500">No active participants in this batch yet.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase tracking-wider">UPI ID *</label>
                  <input
                    value={form.upi_id}
                    onChange={(e) => setForm((f) => ({ ...f, upi_id: e.target.value }))}
                    placeholder="yourname@upi"
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase tracking-wider">
                    QR Code Image {editingId && "(leave blank to keep the current one)"}
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => setForm((f) => ({ ...f, qrFile: e.target.files?.[0] ?? null }))}
                    className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-950 file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-amber-300"
                  />
                  <p className="text-xs text-slate-600">
                    Bank account hit its daily limit? Edit this payment any time to swap in a different UPI ID / QR —
                    students see the updated one immediately.
                  </p>
                </div>

                {installmentError && <p className="text-sm text-rose-400">{installmentError}</p>}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={savingInstallment}
                    className="rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 px-4 py-2 text-sm font-semibold transition-colors"
                  >
                    {savingInstallment ? "Saving…" : editingId ? "Save Changes" : "Create Payment"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {loadingInstallments ? (
              <Spinner />
            ) : installments.length === 0 ? (
              <Empty>No payment items yet. Create one above.</Empty>
            ) : (
              <div className="space-y-2">
                {installments.map((inst) => (
                  <div
                    key={inst.id}
                    className={`rounded-2xl border transition-colors ${selectedInstallment?.id === inst.id ? "border-amber-600 bg-slate-900" : "border-slate-800 bg-slate-900/60"
                      }`}
                  >
                    <button onClick={() => selectInstallment(inst)} className="w-full text-left p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">{inst.title}</p>
                            <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md">
                              {inst.split_type === "split" ? "Split" : "Individual"}
                            </span>
                            <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md">
                              {inst.visibility === "all" ? "Everyone" : "Selected"}
                            </span>
                          </div>
                          {inst.details && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{inst.details}</p>}
                        </div>
                        <p className="text-sm text-slate-300 shrink-0">₹{inst.amount}</p>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {inst.due_date ? `Due ${new Date(inst.due_date).toLocaleDateString()}` : "No due date"} · UPI:{" "}
                        {inst.upi_id}
                      </p>
                    </button>
                    <div className="flex gap-2 px-4 pb-3">
                      <button
                        onClick={() => openEditForm(inst)}
                        className="rounded-lg border border-slate-700 hover:border-indigo-600 px-3 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteInstallment(inst)}
                        className="rounded-lg border border-slate-700 hover:border-rose-700 px-3 py-1 text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedInstallment && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    Submissions — {selectedInstallment.title}
                  </h3>
                  {payments.length > 0 && (
                    <button
                      onClick={handleExportPayments}
                      className="rounded-xl border border-slate-700 hover:border-emerald-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                    >
                      Export CSV
                    </button>
                  )}
                </div>
                {payments.length === 0 ? (
                  <Empty>No submissions yet.</Empty>
                ) : (
                  payments.map((pay) => (
                    <button
                      key={pay.id}
                      onClick={() => setDetailPayment(pay)}
                      className="w-full text-left rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 flex items-center justify-between gap-4 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{pay.profiles?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-slate-500">
                          Txn: <span className="font-mono">{pay.transaction_id}</span>
                        </p>
                        <p className="text-xs text-slate-600">Submitted {new Date(pay.submitted_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={pay.status} />
                        <span className="text-slate-600">→</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* ── Insights ── */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Insights</h3>
                <p className="text-sm text-white font-semibold">
                  Total collected: <span className="text-emerald-400">₹{grandTotalCollected.toFixed(2)}</span>
                </p>
              </div>
              {loadingInsights ? (
                <Spinner />
              ) : insights.length === 0 ? (
                <Empty>Nothing to summarize yet.</Empty>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="text-left px-4 py-2.5">Title</th>
                        <th className="text-right px-4 py-2.5">Participants</th>
                        <th className="text-right px-4 py-2.5">Per Participant</th>
                        <th className="text-right px-4 py-2.5">Verified</th>
                        <th className="text-right px-4 py-2.5">Collected</th>
                        <th className="text-right px-4 py-2.5">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {insights.map((row) => (
                        <tr key={row.installment.id} className="bg-slate-900/50">
                          <td className="px-4 py-2.5 text-white">{row.installment.title}</td>
                          <td className="px-4 py-2.5 text-right text-slate-300">{row.targetCount}</td>
                          <td className="px-4 py-2.5 text-right text-slate-300">₹{row.shareAmount.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-400">{row.verifiedCount}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-400">₹{row.verifiedTotal.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-amber-400">{row.pendingCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Itinerary tab ── */}
        {selectedTrip && tab === "itinerary" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-white">{selectedTrip.trip_name} — Itinerary</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload PDF, PPTX, or DOCX files. Students can view them from their dashboard.
              </p>
            </div>

            <form onSubmit={handleUploadItinerary} className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
              <label className="text-xs text-slate-400 uppercase tracking-wider">Upload File</label>
              <input
                type="file"
                accept=".pdf,.pptx,.docx,.doc,.ppt"
                onChange={(e) => setItineraryFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-950 file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-indigo-300 hover:file:bg-indigo-900"
              />
              {itineraryError && <p className="text-sm text-rose-400">{itineraryError}</p>}
              <button
                type="submit"
                disabled={uploadingItinerary || !itineraryFile}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold transition-colors"
              >
                {uploadingItinerary ? "Uploading…" : "Upload"}
              </button>
            </form>

            {loadingItineraries ? (
              <Spinner />
            ) : itineraries.length === 0 ? (
              <Empty>No itinerary files yet.</Empty>
            ) : (
              <div className="space-y-2">
                {itineraries.map((item) => (
                  <ItineraryRow
                    key={item.id}
                    item={item}
                    onDownload={() => handleDownload(item)}
                    onDelete={() => handleDeleteItinerary(item)}
                    isAdmin
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Expenses tab ── */}
        {selectedTrip && tab === "expenses" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-white">{selectedTrip.trip_name} — Expenses</h2>
              <p className="text-xs text-slate-500 mt-0.5">Track what's actually been spent, by category.</p>
            </div>

            <form onSubmit={handleAddExpense} className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Amount (₹)</label>
                  <input
                    type="number"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 uppercase tracking-wider">Description</label>
                <input
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="e.g. Hotel Ganga advance"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {expenseError && <p className="text-sm text-rose-400">{expenseError}</p>}
              <button
                type="submit"
                disabled={savingExpense || !expAmount}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold transition-colors"
              >
                {savingExpense ? "Adding…" : "Add Expense"}
              </button>
            </form>

            <div className="rounded-2xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5">Category</th>
                    <th className="text-right px-4 py-2.5">Total Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {expenseSummary.rows.map((row) => (
                    <tr key={row.category} className="bg-slate-900/50">
                      <td className="px-4 py-2.5 text-white">{row.category}</td>
                      <td className="px-4 py-2.5 text-right text-rose-300">₹{row.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900">
                    <td className="px-4 py-2.5 font-semibold text-white">Total</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-rose-300">
                      ₹{expenseSummary.grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {loadingExpenses ? (
              <Spinner />
            ) : expenses.length === 0 ? (
              <Empty>No expenses logged yet.</Empty>
            ) : (
              <div className="space-y-2">
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="rounded-2xl bg-slate-900 border border-slate-800 px-5 py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg">{exp.category}</span>
                        <p className="text-xs text-slate-600">{new Date(exp.expense_date).toLocaleDateString()}</p>
                      </div>
                      {exp.description && <p className="text-sm text-slate-300 mt-1 truncate">{exp.description}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="font-semibold text-rose-300">₹{Number(exp.amount).toFixed(2)}</p>
                      <button
                        onClick={() => handleDeleteExpense(exp)}
                        className="rounded-lg border border-slate-700 hover:border-rose-700 px-3 py-1 text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {detailParticipant?.profiles && (
        <ParticipantDetailModal
          participant={detailParticipant}
          onClose={() => setDetailParticipant(null)}
          onBlock={() => handleBlock(detailParticipant.profiles!.id, detailParticipant.status)}
          onRemove={() => handleRemove(detailParticipant.profiles!.id)}
          onDownloadAadhar={() => handleDownloadAadhar(detailParticipant.profiles!.aadhar_photo_path!, detailParticipant.profiles!.full_name)}
        />
      )}

      {detailPayment && (
        <PaymentDetailModal
          payment={detailPayment}
          onClose={() => setDetailPayment(null)}
          onVerify={async () => {
            await handleVerify(detailPayment.id);
            setDetailPayment(null);
          }}
          onReject={async () => {
            await handleReject(detailPayment.id);
            setDetailPayment(null);
          }}
        />
      )}
    </div>
  );
}

// ── Shared small components ──────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-amber-500" />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center">
      <p className="text-slate-500 text-sm">{children}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "verified"
      ? "bg-emerald-900 text-emerald-300"
      : status === "rejected"
        ? "bg-rose-900 text-rose-300"
        : "bg-slate-800 text-slate-400";
  return <span className={`text-xs px-2 py-0.5 rounded-lg ${styles}`}>{status}</span>;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-3 text-sm font-medium border-b-2 transition-colors shrink-0 ${active ? "border-amber-400 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
        }`}
    >
      {children}
    </button>
  );
}

function AdminTripTile({ trip, onManage }: { trip: Trip; onManage: () => void }) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-lg tracking-widest">
            {trip.trip_code}
          </span>
          {!trip.is_active && <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-lg">Inactive</span>}
        </div>
        <p className="font-semibold text-white truncate">{trip.trip_name}</p>
        {trip.description && <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">{trip.description}</p>}
        <p className="text-xs text-slate-600 mt-2">Created {new Date(trip.created_at).toLocaleDateString()}</p>
      </div>
      <button
        onClick={onManage}
        className="shrink-0 rounded-xl border border-slate-700 hover:border-amber-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
      >
        Manage →
      </button>
    </div>
  );
}

function ParticipantListTile({ participant, onClick }: { participant: Participant; onClick: () => void }) {
  const p = participant.profiles!;
  const isBlocked = participant.status === "blocked";
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border px-5 py-3.5 flex items-center justify-between gap-4 transition-colors ${isBlocked ? "bg-rose-950/20 border-rose-900" : "bg-slate-900 border-slate-800 hover:border-slate-700"
        }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-sm font-semibold text-slate-300 shrink-0">
          {p.full_name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{p.full_name}</p>
          <p className="text-xs text-slate-500 truncate">{p.college_name ?? "—"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isBlocked && <span className="text-xs bg-rose-900 text-rose-300 px-2 py-0.5 rounded-lg">Blocked</span>}
        {/* <StatusBadge status={p.id_verification_status} /> */}
        <span className="text-slate-600">→</span>
      </div>
    </button>
  );
}

function ParticipantDetailModal({
  participant,
  onClose,
  onBlock,
  onRemove,
  onDownloadAadhar,
}: {
  participant: Participant;
  onClose: () => void;
  onBlock: () => void;
  onRemove: () => void;
  onDownloadAadhar: () => void;
}) {
  const p = participant.profiles!;
  const isBlocked = participant.status === "blocked";
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold">{p.full_name}</h3>
            <p className="text-xs text-slate-500">Joined {new Date(participant.joined_at).toLocaleDateString()}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>
        <div className="flex gap-2">
          {isBlocked && <span className="text-xs bg-rose-900 text-rose-300 px-2 py-0.5 rounded-lg">Blocked</span>}
          {/* <StatusBadge status={p.id_verification_status} /> */}
        </div>
        <dl className="space-y-2 text-sm">
          {[
            ["Age", p.age?.toString()],
            ["Gender", p.gender === "other" ? p.gender_other : p.gender],
            ["Contact (calling)", p.phone_calling],
            ["Contact (WhatsApp)", p.phone_whatsapp],
            ["Guardian Name", p.guardian_name],
            ["Guardian Contact", p.guardian_contact],
            ["Guardian Relation", p.guardian_relation],
            ["College", p.college_name],
            ["Department", p.department],
            ["Year of Study", p.year_of_study],
            ["Aadhar Number", p.aadhar_number],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-slate-800 pb-1.5">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-slate-200 text-right">{value || "—"}</dd>
            </div>
          ))}
        </dl>
        <button
          onClick={onDownloadAadhar}
          disabled={!p.aadhar_photo_path}
          className="w-full rounded-xl border border-indigo-700 text-indigo-300 hover:bg-indigo-950 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-sm font-medium transition-colors"
        >
          {p.aadhar_photo_path ? "Download Aadhar ID" : "No Aadhar file uploaded"}
        </button>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onBlock}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors border ${isBlocked
              ? "border-emerald-700 text-emerald-400 hover:bg-emerald-900"
              : "border-slate-700 text-slate-300 hover:border-rose-700 hover:text-rose-400"
              }`}
          >
            {isBlocked ? "Unblock" : "Block"}
          </button>
          <button
            onClick={onRemove}
            className="flex-1 rounded-xl border border-slate-700 hover:border-rose-700 px-3 py-2 text-sm font-medium text-slate-300 hover:text-rose-400 transition-colors"
          >
            Remove from trip
          </button>
        </div>
      </div>
    </div>
  );
}
function PaymentDetailModal({
  payment,
  onClose,
  onVerify,
  onReject,
}: {
  payment: PaymentWithProfile;
  onClose: () => void;
  onVerify: () => void;
  onReject: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold">{payment.profiles?.full_name ?? "Unknown"}</h3>
            <p className="text-xs text-slate-500">{payment.profiles?.college_name ?? "—"}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex gap-2">
          <StatusBadge status={payment.status} />
        </div>

        <dl className="space-y-2 text-sm">
          {[
            ["Transaction ID", payment.transaction_id],
            ["Submitted At", new Date(payment.submitted_at).toLocaleString()],
            ["Verified At", payment.verified_at ? new Date(payment.verified_at).toLocaleString() : "—"],
            ["Receipt No.", payment.receipt_number ?? "—"],
            ["Note", payment.admin_note ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-slate-800 pb-1.5">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-slate-200 text-right">{value}</dd>
            </div>
          ))}
        </dl>

        {payment.status !== "verified" && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={onVerify}
              className="flex-1 rounded-xl border border-emerald-700 text-emerald-400 hover:bg-emerald-900 px-3 py-2 text-sm font-medium transition-colors"
            >
              Verify
            </button>
            <button
              onClick={onReject}
              className="flex-1 rounded-xl border border-rose-700 text-rose-400 hover:bg-rose-900 px-3 py-2 text-sm font-medium transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}