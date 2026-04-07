package com.medical.backend.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.medical.backend.entity.AlertLog;
import com.medical.backend.repository.AlertLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.List;

@Service
public class AuditReportingService {

    @Autowired
    private AlertLogRepository alertLogRepository;

    public byte[] generateAuditReport(String startDate, String endDate) {
        // Construct Specification
        Specification<AlertLog> spec = Specification.where(null);
        
        if (startDate != null && !startDate.isEmpty() && endDate != null && !endDate.isEmpty()) {
            java.time.LocalDateTime start = java.time.LocalDate.parse(startDate).atStartOfDay();
            java.time.LocalDateTime end = java.time.LocalDate.parse(endDate).atTime(23, 59, 59);
            spec = spec.and((root, query, cb) -> cb.between(root.get("timestamp"), start, end));
        }
        
        // Ensure sorted by timestamp ascending for a chronological audit trail
        List<AlertLog> logs = alertLogRepository.findAll(spec, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "timestamp"));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate()); // Landscape for data tables

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            // Fonts
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, java.awt.Color.DARK_GRAY);
            Font subHeaderFont = FontFactory.getFont(FontFactory.HELVETICA, 12, java.awt.Color.GRAY);
            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, java.awt.Color.WHITE);
            Font tableBodyFont = FontFactory.getFont(FontFactory.HELVETICA, 9, java.awt.Color.BLACK);

            // MedTrack Branding
            Paragraph title = new Paragraph("MEDTRACK PLUS", headerFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subtitle = new Paragraph("Enterprise System Oversight & Audit Report", subHeaderFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20);
            document.add(subtitle);

            // Generation details
            Paragraph timestamp = new Paragraph("Generated On: " + new Date() + " | Type: OFFICIAL AUDIT", subHeaderFont);
            timestamp.setAlignment(Element.ALIGN_RIGHT);
            timestamp.setSpacingAfter(15);
            document.add(timestamp);

            // Table Creation
            PdfPTable table = new PdfPTable(4); // ID, Timestamp, Severity, Message
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1f, 2f, 1.5f, 6f});

            // Table Header
            String[] headers = {"Log ID", "Timestamp", "Severity", "Message / Event Details"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, tableHeaderFont));
                cell.setBackgroundColor(new java.awt.Color(0, 86, 179)); // Apollo Primary
                cell.setPadding(8);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(cell);
            }

            // Table Rows
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            for (AlertLog log : logs) {
                PdfPCell idCell = new PdfPCell(new Phrase(String.valueOf(log.getId()), tableBodyFont));
                idCell.setPadding(6);
                idCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(idCell);

                PdfPCell timeCell = new PdfPCell(new Phrase(log.getTimestamp().format(formatter), tableBodyFont));
                timeCell.setPadding(6);
                timeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(timeCell);

                PdfPCell sevCell = new PdfPCell(new Phrase(log.getSeverity(), tableHeaderFont)); // Use header font for bold severity
                sevCell.setPadding(6);
                sevCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                if ("ERROR".equals(log.getSeverity())) {
                    sevCell.setBackgroundColor(new java.awt.Color(220, 53, 69)); // Danger red
                } else if ("WARNING".equals(log.getSeverity())) {
                    sevCell.setBackgroundColor(new java.awt.Color(255, 193, 7)); // Warning yellow
                    sevCell.setPhrase(new Phrase(log.getSeverity(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, java.awt.Color.DARK_GRAY))); // Dark text for yellow bg
                } else {
                    sevCell.setBackgroundColor(new java.awt.Color(13, 202, 240)); // Info blue
                    sevCell.setPhrase(new Phrase(log.getSeverity(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, java.awt.Color.DARK_GRAY)));
                }
                table.addCell(sevCell);

                PdfPCell msgCell = new PdfPCell(new Phrase(log.getMessage(), tableBodyFont));
                msgCell.setPadding(6);
                table.addCell(msgCell);
            }

            document.add(table);

            // Signature Line
            Paragraph signatureSection = new Paragraph("\n\n\n\n_____________________________________________\nSystem Administrator Signature", subHeaderFont);
            signatureSection.setAlignment(Element.ALIGN_RIGHT);
            signatureSection.setSpacingBefore(30);
            document.add(signatureSection);

            document.close();

        } catch (DocumentException e) {
            e.printStackTrace();
        }

        return baos.toByteArray();
    }

    @Autowired
    private com.medical.backend.repository.PrescriptionRepository prescriptionRepository;

    public byte[] generateDisbursementReport(String startDate, String endDate) {
        Specification<com.medical.backend.entity.Prescription> spec = Specification.where((root, query, cb) -> 
            cb.equal(root.get("status"), com.medical.backend.entity.Prescription.PrescriptionStatus.DISPENSED)
        );
        
        if (startDate != null && !startDate.isEmpty() && endDate != null && !endDate.isEmpty()) {
            java.time.LocalDateTime start = java.time.LocalDate.parse(startDate).atStartOfDay();
            java.time.LocalDateTime end = java.time.LocalDate.parse(endDate).atTime(23, 59, 59);
            spec = spec.and((root, query, cb) -> cb.between(root.get("dispensedAt"), start, end));
        }
        
        List<com.medical.backend.entity.Prescription> prescriptions = prescriptionRepository.findAll(
            spec, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "dispensedAt"));

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4.rotate());

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, java.awt.Color.DARK_GRAY);
            Font subHeaderFont = FontFactory.getFont(FontFactory.HELVETICA, 12, java.awt.Color.GRAY);
            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, java.awt.Color.WHITE);
            Font tableBodyFont = FontFactory.getFont(FontFactory.HELVETICA, 9, java.awt.Color.BLACK);

            Paragraph title = new Paragraph("MEDTRACK PLUS", headerFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subtitle = new Paragraph("Pharmacy Disbursement & Fulfillment Report", subHeaderFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(20);
            document.add(subtitle);

            Paragraph timestamp = new Paragraph("Generated On: " + new Date() + " | Type: DISBURSEMENT", subHeaderFont);
            timestamp.setAlignment(Element.ALIGN_RIGHT);
            timestamp.setSpacingAfter(15);
            document.add(timestamp);

            PdfPTable table = new PdfPTable(6); 
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1f, 2f, 2f, 3f, 2f, 2f});

            String[] headers = {"Rx ID", "Dispensed On", "Patient", "Medications", "Doctor", "Pharmacist"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, tableHeaderFont));
                cell.setBackgroundColor(new java.awt.Color(16, 185, 129)); // Apollo Success Green
                cell.setPadding(8);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(cell);
            }

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
            for (com.medical.backend.entity.Prescription p : prescriptions) {
                PdfPCell idCell = new PdfPCell(new Phrase(String.valueOf(p.getId()), tableBodyFont));
                idCell.setPadding(6);
                idCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(idCell);
                
                PdfPCell timeCell = new PdfPCell(new Phrase(p.getDispensedAt() != null ? p.getDispensedAt().format(formatter) : "N/A", tableBodyFont));
                timeCell.setPadding(6);
                table.addCell(timeCell);
                
                PdfPCell patientCell = new PdfPCell(new Phrase(p.getPatient() != null ? p.getPatient().getFullName() : "Unknown", tableBodyFont));
                patientCell.setPadding(6);
                table.addCell(patientCell);
                
                StringBuilder meds = new StringBuilder();
                if (p.getItems() != null) {
                    for (com.medical.backend.entity.PrescriptionItem item : p.getItems()) {
                        meds.append(item.getMedicineName()).append(" (").append(item.getDosage()).append(")\n");
                    }
                }
                PdfPCell medsCell = new PdfPCell(new Phrase(meds.toString().trim(), tableBodyFont));
                medsCell.setPadding(6);
                table.addCell(medsCell);
                
                PdfPCell doctorCell = new PdfPCell(new Phrase(p.getDoctor() != null ? p.getDoctor().getFullName() : "Unknown", tableBodyFont));
                doctorCell.setPadding(6);
                table.addCell(doctorCell);
                
                PdfPCell pharmacistCell = new PdfPCell(new Phrase(p.getPharmacist() != null ? p.getPharmacist().getFullName() : "Unknown", tableBodyFont));
                pharmacistCell.setPadding(6);
                table.addCell(pharmacistCell);
            }

            document.add(table);

            Paragraph signatureSection = new Paragraph("\n\n\n\n_____________________________________________\nPharmacy Administrator Signature", subHeaderFont);
            signatureSection.setAlignment(Element.ALIGN_RIGHT);
            signatureSection.setSpacingBefore(30);
            document.add(signatureSection);

            document.close();
        } catch (DocumentException e) {
            e.printStackTrace();
        }

        return baos.toByteArray();
    }
}
