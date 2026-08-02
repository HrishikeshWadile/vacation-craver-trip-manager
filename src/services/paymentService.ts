import { supabase } from "../supabase/client";
import { cache } from "./cache";

export type Installment = {
  id: string;
  trip_id: string;
  installment_no: number;
  title: string;
  details: string | null;
  amount: number;
  due_date: string | null;
  upi_id: string;
  qr_code_path: string | null;
  visibility: "all" | "selected";
  split_type: "individual" | "split";
  created_by: string;
  created_at: string;
};

export type Payment = {
  id: string;
  installment_id: string;
  trip_id: string;
  user_id: string;
  transaction_id: string;
  status: "pending" | "verified" | "rejected";
  admin_note: string | null;
  receipt_number: string | null;
  submitted_at: string;
  verified_at: string | null;
  verified_by: string | null;
};

export type PaymentWithProfile = Payment & {
  profiles: { id: string; full_name: string; college_name: string | null } | null;
};

export type InstallmentInsights = {
  installment: Installment;
  targetCount: number;
  shareAmount: number;
  verifiedCount: number;
  verifiedTotal: number;
  pendingCount: number;
  rejectedCount: number;
};

type InstallmentFormValues = {
  title: string;
  details: string;
  amount: number;
  due_date: string | null;
  upi_id: string;
  qrFile: File | null;
  visibility: "all" | "selected";
  split_type: "individual" | "split";
  participantIds: string[]; // only used when visibility === "selected"
};

async function uploadQr(tripId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `${tripId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("payment-qr")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("payment-qr").getPublicUrl(path).data.publicUrl;
}

async function setInstallmentParticipants(installmentId: string, userIds: string[]) {
  // simplest correct approach: wipe and re-insert
  await supabase.from("installment_participants").delete().eq("installment_id", installmentId);
  if (userIds.length > 0) {
    const { error } = await supabase
      .from("installment_participants")
      .insert(userIds.map((user_id) => ({ installment_id: installmentId, user_id })) as never);
    if (error) throw error;
  }
}

// ---------- Admin: create / edit / delete payment items -------------

export async function createInstallment(tripId: string, values: InstallmentFormValues) {
  const { data: existing, error: existingErr } = await supabase
    .from("installments")
    .select("installment_no")
    .eq("trip_id", tripId)
    .order("installment_no", { ascending: false })
    .limit(1);

  if (existingErr) throw existingErr;
  const rows = existing as { installment_no: number }[] | null;
  const nextNo = (rows?.[0]?.installment_no ?? 0) + 1;

  const qrPath = values.qrFile ? await uploadQr(tripId, values.qrFile) : null;

  const { data, error } = await supabase
    .from("installments")
    .insert({
      trip_id: tripId,
      installment_no: nextNo,
      title: values.title.trim(),
      details: values.details.trim() || null,
      amount: values.amount,
      due_date: values.due_date,
      upi_id: values.upi_id,
      qr_code_path: qrPath,
      visibility: values.visibility,
      split_type: values.split_type,
    } as never)
    .select()
    .single();

  if (error) throw error;
  const created = data as unknown as Installment;

  if (values.visibility === "selected") {
    await setInstallmentParticipants(created.id, values.participantIds);
  }

  cache.invalidatePrefix(`installments:${tripId}`);
  cache.invalidatePrefix(`visible-payments:${tripId}`);
  return created;
}

export async function updateInstallment(
  installmentId: string,
  tripId: string,
  values: Partial<InstallmentFormValues>
) {
  const patch: Record<string, unknown> = {};
  if (values.title !== undefined) patch.title = values.title.trim();
  if (values.details !== undefined) patch.details = values.details.trim() || null;
  if (values.amount !== undefined) patch.amount = values.amount;
  if (values.due_date !== undefined) patch.due_date = values.due_date;
  if (values.upi_id !== undefined) patch.upi_id = values.upi_id;
  if (values.visibility !== undefined) patch.visibility = values.visibility;
  if (values.split_type !== undefined) patch.split_type = values.split_type;

  if (values.qrFile) {
    patch.qr_code_path = await uploadQr(tripId, values.qrFile);
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from("installments")
      .update(patch as never)
      .eq("id", installmentId);
    if (error) throw error;
  }

  if (values.visibility === "selected" && values.participantIds) {
    await setInstallmentParticipants(installmentId, values.participantIds);
  }

  cache.invalidatePrefix(`installments:${tripId}`);
  cache.invalidatePrefix(`visible-payments:${tripId}`);
}

export async function deleteInstallment(installmentId: string, tripId: string) {
  const { error } = await supabase.from("installments").delete().eq("id", installmentId);
  if (error) throw error;
  cache.invalidatePrefix(`installments:${tripId}`);
  cache.invalidatePrefix(`visible-payments:${tripId}`);
}

export async function getInstallmentsForTrip(tripId: string) {
  return cache.get(`installments:${tripId}:all`, async () => {
    const { data, error } = await supabase
      .from("installments")
      .select("*")
      .eq("trip_id", tripId)
      .order("installment_no", { ascending: true });

    if (error) throw error;
    return (data ?? []) as unknown as Installment[];
  });
}

export async function getInstallmentParticipantIds(installmentId: string) {
  const { data, error } = await supabase
    .from("installment_participants")
    .select("user_id")
    .eq("installment_id", installmentId);
  if (error) throw error;
  return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
}

// ---------- Student: which payment items apply to me -----------------

/** All payment items visible to the signed-in student for this trip
 * (visibility='all', or 'selected' and they're on the list), each
 * merged with their own payment status and effective share amount. */
export async function getVisiblePaymentsForTrip(tripId: string, activeParticipantCount: number) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  return cache.get(`visible-payments:${tripId}:${user.id}`, async () => {
    const { data: installmentsData, error } = await supabase
      .from("installments")
      .select("*")
      .eq("trip_id", tripId)
      .order("installment_no", { ascending: true });
    if (error) throw error;
    const installments = (installmentsData ?? []) as unknown as Installment[];

    const results = await Promise.all(
      installments.map(async (inst) => {
        let targetCount = activeParticipantCount;
        if (inst.visibility === "selected") {
          const ids = await getInstallmentParticipantIds(inst.id);
          targetCount = ids.length;
        }
        const shareAmount =
          inst.split_type === "split" && targetCount > 0 ? inst.amount / targetCount : inst.amount;

        const { data: payRow } = await supabase
          .from("payments")
          .select("*")
          .eq("installment_id", inst.id)
          .eq("user_id", user.id)
          .maybeSingle();

        return { installment: inst, shareAmount, myPayment: payRow as unknown as Payment | null };
      })
    );

    return results;
  }, 60_000);
}

// ---------- Admin: reviewing submitted payments ------------------------

export async function getPaymentsForInstallment(installmentId: string) {
  return cache.get(`payments:installment:${installmentId}`, async () => {
    const { data, error } = await supabase
      .from("payments")
      .select("*, profiles (id, full_name, college_name)")
      .eq("installment_id", installmentId)
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as PaymentWithProfile[];
  }, 60_000);
}

export async function verifyPayment(paymentId: string, note?: string) {
  const { error } = await supabase
    .from("payments")
    .update({ status: "verified", admin_note: note ?? null } as never)
    .eq("id", paymentId);
  if (error) throw error;
  cache.invalidatePrefix("payments:installment:");
  cache.invalidatePrefix("visible-payments:");
}

export async function rejectPayment(paymentId: string, note: string) {
  const { error } = await supabase
    .from("payments")
    .update({ status: "rejected", admin_note: note } as never)
    .eq("id", paymentId);
  if (error) throw error;
  cache.invalidatePrefix("payments:installment:");
  cache.invalidatePrefix("visible-payments:");
}

// ---------- Admin: insights / totals ------------------------------------

export async function getInsightsForTrip(
  tripId: string,
  activeParticipantCount: number
): Promise<InstallmentInsights[]> {
  const installments = await getInstallmentsForTrip(tripId);

  return Promise.all(
    installments.map(async (inst) => {
      let targetCount = activeParticipantCount;
      if (inst.visibility === "selected") {
        targetCount = (await getInstallmentParticipantIds(inst.id)).length;
      }
      const shareAmount =
        inst.split_type === "split" && targetCount > 0 ? inst.amount / targetCount : inst.amount;

      const { data } = await supabase
        .from("payments")
        .select("status")
        .eq("installment_id", inst.id);
      const rows = (data ?? []) as { status: string }[];
      const verifiedCount = rows.filter((r) => r.status === "verified").length;
      const pendingCount = rows.filter((r) => r.status === "pending").length;
      const rejectedCount = rows.filter((r) => r.status === "rejected").length;

      return {
        installment: inst,
        targetCount,
        shareAmount,
        verifiedCount,
        verifiedTotal: verifiedCount * shareAmount,
        pendingCount,
        rejectedCount,
      };
    })
  );
}

// ---------- Student: submitting payments ---------------------------

export async function submitPayment(installmentId: string, tripId: string, transactionId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data: existing } = await supabase
    .from("payments")
    .select("id, status")
    .eq("installment_id", installmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  const row = existing as { id: string; status: string } | null;

  if (row?.status === "verified") {
    throw new Error("This payment is already verified — nothing to resubmit.");
  }

  if (row) {
    const { error } = await supabase
      .from("payments")
      .update({
        transaction_id: transactionId.trim(),
        status: "pending",
        admin_note: null,
        submitted_at: new Date().toISOString(),
      } as never)
      .eq("id", row.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("payments").insert({
      installment_id: installmentId,
      trip_id: tripId,
      user_id: user.id,
      transaction_id: transactionId.trim(),
    } as never);
    if (error) throw error;
  }

  cache.invalidatePrefix(`visible-payments:${tripId}`);
}

export async function getMyPaymentForInstallment(installmentId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("installment_id", installmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as Payment | null;
}