import { supabase } from "../supabase/client";
import { cache } from "./cache";

export const EXPENSE_CATEGORIES = [
  "Hotel",
  "Food",
  "Travel / Bus",
  "Venue",
  "Activities",
  "Miscellaneous",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Expense = {
  id: string;
  trip_id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
  created_by: string;
  created_at: string;
};

export async function addExpense(
  tripId: string,
  values: { category: string; description: string; amount: number; expense_date: string }
) {
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      trip_id: tripId,
      category: values.category,
      description: values.description.trim() || null,
      amount: values.amount,
      expense_date: values.expense_date,
    } as never)
    .select()
    .single();

  if (error) throw error;
  cache.invalidate(`expenses:${tripId}`);
  return data as unknown as Expense;
}

export async function getExpenses(tripId: string) {
  return cache.get(`expenses:${tripId}`, async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("trip_id", tripId)
      .order("expense_date", { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as Expense[];
  });
}

export async function deleteExpense(id: string, tripId: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
  cache.invalidate(`expenses:${tripId}`);
}

/** Totals grouped by category, plus a grand total — computed
 * client-side from the already-fetched expense list rather than a
 * separate query. */
export function summarizeByCategory(expenses: Expense[]) {
  const byCategory = new Map<string, number>();
  let grandTotal = 0;
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
    grandTotal += Number(e.amount);
  }
  return {
    rows: Array.from(byCategory.entries()).map(([category, total]) => ({ category, total })),
    grandTotal,
  };
}