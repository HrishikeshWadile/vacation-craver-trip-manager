function csvEscape(value: unknown): string {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const lines = [
        headers.join(","),
        ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}