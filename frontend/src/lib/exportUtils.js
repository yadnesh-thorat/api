import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const generatePdf = async (project, tree) => {
    const doc = new jsPDF();
    const primaryColor = [37, 99, 235]; // blue-600

    // Title Page
    doc.setFontSize(32);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(project.name || "API Documentation", 20, 50);

    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Target URL: ${project.base_url || "Not specified"}`, 20, 65);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 72);

    if (project.description) {
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);
        const splitDesc = doc.splitTextToSize(project.description, 170);
        doc.text(splitDesc, 20, 85);
    }

    let yOffset = project.description ? 110 : 85;

    // Table of Contents
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Table of Contents", 20, yOffset);
    yOffset += 10;

    tree.forEach((api, i) => {
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        doc.text(`${i + 1}. ${api.name}`, 25, yOffset);
        yOffset += 6;
        if (yOffset > 270) { doc.addPage(); yOffset = 20; }
    });

    // Endpoints Details
    tree.forEach((api) => {
        doc.addPage();
        doc.setFontSize(22);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(api.name, 20, 30);

        let currentY = 40;

        (api.endpoints || []).forEach((ep) => {
            if (currentY > 240) { doc.addPage(); currentY = 20; }

            // Method Badge
            const method = ep.method.toUpperCase();
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);

            let bgColor = [100, 116, 139];
            if (method === 'GET') bgColor = [37, 99, 235];
            if (method === 'POST') bgColor = [16, 185, 129];
            if (method === 'PUT') bgColor = [245, 158, 11];
            if (method === 'DELETE') bgColor = [239, 68, 68];

            doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
            doc.roundedRect(20, currentY, 15, 6, 1, 1, 'F');
            doc.text(method, 21, currentY + 4.5);

            // Path
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59);
            doc.setFont("courier", "bold");
            doc.text(ep.path, 38, currentY + 4.5);
            doc.setFont("helvetica", "normal");

            currentY += 10;

            // Summary
            if (ep.summary) {
                doc.setFontSize(10);
                doc.setTextColor(71, 85, 105);
                doc.text(ep.summary, 20, currentY);
                currentY += 8;
            }

            // Parameters Table
            const headers = ep.headers || [];
            const query = ep.query_params || [];
            const params = [...headers.map(h => ({ ...h, in: 'Header' })), ...query.map(q => ({ ...q, in: 'Query' }))];

            if (params.length > 0) {
                doc.autoTable({
                    startY: currentY,
                    head: [['Name', 'In', 'Type', 'Required', 'Description']],
                    body: params.map(p => [p.name, p.in, p.type, p.required ? 'Yes' : 'No', p.description]),
                    theme: 'striped',
                    headStyles: { fillColor: primaryColor },
                    margin: { left: 20 },
                    tableWidth: 170
                });
                currentY = doc.lastAutoTable.finalY + 15;
            } else {
                currentY += 5;
            }
        });
    });

    doc.save(`${project.name || "API_Docs"}.pdf`);
};
