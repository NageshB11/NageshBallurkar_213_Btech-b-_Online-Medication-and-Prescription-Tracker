package com.medical.backend.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.PrescriptionItem;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class PdfService {

    @Value("${spring.servlet.multipart.location}")
    private String uploadDir;

    public String generatePrescriptionPdf(Prescription prescription) throws IOException {
        String fileName = "prescription_" + prescription.getId() + "_" + UUID.randomUUID().toString().substring(0, 8)
                + ".pdf";
        Path pdfPath = Paths.get(uploadDir).resolve(fileName);

        // Ensure directory exists
        Files.createDirectories(pdfPath.getParent());

        Document document = new Document(PageSize.A4);
        try {
            PdfWriter.getInstance(document, new FileOutputStream(pdfPath.toFile()));
            document.open();

            // Apollo/MedSync Header using clinical blue
            // Header
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.DARK_GRAY);
            Paragraph header = new Paragraph("MedTrack Plus", headerFont);
            header.setAlignment(Element.ALIGN_CENTER);
            header.setSpacingAfter(10);
            document.add(header);

            // Timestamp
            String timestamp = java.time.LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("dd-MM-yyyy | HH:mm:ss"));
            Paragraph generatedOn = new Paragraph("Generated on: " + timestamp,
                    FontFactory.getFont(FontFactory.HELVETICA, 9, Color.GRAY));
            generatedOn.setAlignment(Element.ALIGN_RIGHT);
            generatedOn.setSpacingAfter(20);
            document.add(generatedOn);

            // Doctor Info
            Font subHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.DARK_GRAY);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 11, Color.BLACK);

            if (prescription.getDoctor() != null) {
                Paragraph doctorInfo = new Paragraph();
                doctorInfo.add(new Chunk("Dr. " + prescription.getDoctor().getFullName() + "\n", subHeaderFont));
                doctorInfo.add(new Chunk(prescription.getDoctor().getSpecialization() + "\n\n", normalFont));
                doctorInfo.setAlignment(Element.ALIGN_LEFT);
                document.add(doctorInfo);
            }

            // Identity Block (Patient Info)
            PdfPTable patientTable = new PdfPTable(2);
            patientTable.setWidthPercentage(100);
            patientTable.setSpacingBefore(10f);
            patientTable.setSpacingAfter(20f);

            // Fetch patient name if available, otherwise generic
            String patientName = "Valued Patient";
            String patientEmail = "-";
            String patientId = "-";

            if (prescription.getPatient() != null) {
                patientName = prescription.getPatient().getFullName();
                patientEmail = prescription.getPatient().getEmail();
                patientId = String.valueOf(prescription.getPatient().getId());
            }

            addCell(patientTable, "Patient Name: " + patientName, true);
            addCell(patientTable, "Patient ID: " + patientId, true);
            addCell(patientTable, "Email: " + patientEmail, false);
            addCell(patientTable, "Prescription Ref: #" + prescription.getId(), false);

            document.add(patientTable);

            // Medicines Table
            PdfPTable table = new PdfPTable(5); // Medicine, Dosage, Qty, Timing, Duration
            table.setWidthPercentage(100);
            table.setWidths(new float[] { 3f, 2f, 1f, 2f, 2f });
            table.setSpacingBefore(10f);

            // Table Headers
            String[] headers = { "Medicine", "Dosage", "Qty", "Timing", "Duration" };
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, subHeaderFont));
                cell.setBackgroundColor(new Color(240, 247, 255)); // Light Blue
                cell.setPadding(8f);
                cell.setBorderColor(new Color(200, 200, 200));
                table.addCell(cell);
            }

            // Items
            if (prescription.getItems() != null) {
                for (PrescriptionItem item : prescription.getItems()) {
                    addTableCell(table, item.getMedicineName());
                    addTableCell(table, item.getDosage());
                    addTableCell(table, String.valueOf(item.getQuantity()));
                    addTableCell(table, item.getDosageTiming());

                    String duration = "";
                    if (item.getStartDate() != null && item.getEndDate() != null) {
                        duration = item.getStartDate() + " to " + item.getEndDate();
                    }
                    addTableCell(table, duration);
                }
            }
            document.add(table);

            // Footer / Signature
            Paragraph footer = new Paragraph("\n\nDigitally Signed via MedTrack Plus Secure System\n" +
                    "This document is valid for digital use.",
                    FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10, Color.GRAY));
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

        } catch (Exception e) {
            throw new IOException("Error creating PDF", e);
        } finally {
            document.close();
        }

        return fileName;
    }

    private void addCell(PdfPTable table, String text, boolean bold) {
        Font font = bold ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11)
                : FontFactory.getFont(FontFactory.HELVETICA, 11);
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "-", font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(5f);
        table.addCell(cell);
    }

    private void addTableCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(
                new Phrase(text != null ? text : "-", FontFactory.getFont(FontFactory.HELVETICA, 10)));
        cell.setPadding(6f);
        cell.setBorderColor(new Color(230, 230, 230));
        table.addCell(cell);
    }
}
