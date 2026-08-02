import { jsPDF } from "jspdf";

interface ReceiptData {
    receiptNumber: string;
    tripName: string;
    installmentNo: number;
    amount: number;
    transactionId: string;
    studentName: string;
    verifiedAt: string;
}

/** Builds a simple one-page receipt client-side and triggers a
 * download. No server storage involved — generated fresh each time
 * from the verified payment row, so there's nothing to keep in sync. */
export function downloadReceiptPdf(data: ReceiptData) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 56;
    let y = 80;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Receipt", margin, y);

    y += 8;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 36;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    const row = (label: string, value: string) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(value, margin + 160, y);
        y += 26;
    };

    row("Receipt No.", data.receiptNumber);
    row("Trip", data.tripName);
    row("Installment", `#${data.installmentNo}`);
    row("Paid by", data.studentName);
    row("Amount", `₹${data.amount.toFixed(2)}`);
    row("Transaction ID", data.transactionId);
    row("Verified on", new Date(data.verifiedAt).toLocaleString());

    y += 20;
    doc.setDrawColor(230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
        "This receipt confirms manual verification of the payment above by the trip organizer.",
        margin,
        y
    );

    doc.save(`${data.receiptNumber}.pdf`);
}