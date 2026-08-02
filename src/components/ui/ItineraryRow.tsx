import type { Itinerary } from "../../services/itineraryService";

export function ItineraryRow({
  item,
  onDownload,
  onDelete,
  isAdmin,
}: {
  item: Itinerary;
  onDownload: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
}) {
  const ext = item.file_name.split(".").pop()?.toUpperCase() ?? "FILE";
  const extColor: Record<string, string> = {
    PDF: "bg-rose-950 text-rose-300 border-rose-800",
    PPTX: "bg-orange-950 text-orange-300 border-orange-800",
    PPT: "bg-orange-950 text-orange-300 border-orange-800",
    DOCX: "bg-blue-950 text-blue-300 border-blue-800",
    DOC: "bg-blue-950 text-blue-300 border-blue-800",
  };
  const badge = extColor[ext] ?? "bg-slate-800 text-slate-300 border-slate-700";

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`shrink-0 text-xs font-mono font-semibold border px-2 py-0.5 rounded-lg ${badge}`}>
          {ext}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{item.file_name}</p>
          <p className="text-xs text-slate-600">{new Date(item.uploaded_at).toLocaleDateString()}</p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onDownload}
          className="rounded-xl border border-slate-700 hover:border-indigo-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          View
        </button>
        {isAdmin && onDelete && (
          <button
            onClick={onDelete}
            className="rounded-xl border border-slate-700 hover:border-rose-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}