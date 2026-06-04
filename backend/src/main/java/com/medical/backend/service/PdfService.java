package com.medical.backend.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.PrescriptionItem;
import com.medical.backend.entity.User;
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
                String name = prescription.getDoctor().getFullName();
                // Strip any existing Dr/DR/Dr. prefixes to prevent "Dr. DR. Name"
                if (name != null) {
                    name = name.replaceAll("(?i)^(Dr\\.|Dr|DR\\.|DR)\\s+", "");
                }
                doctorInfo.add(new Chunk("Dr. " + name + "\n", subHeaderFont));
                String spec = prescription.getDoctor().getSpecialization();
                doctorInfo.add(new Chunk((spec != null && !spec.isBlank() ? spec : "General Practitioner") + "\n\n",
                        normalFont));
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

            // Partition items into Available and Unavailable
            java.util.List<PrescriptionItem> availableItems = new java.util.ArrayList<>();
            java.util.List<PrescriptionItem> unavailableItems = new java.util.ArrayList<>();
            if (prescription.getItems() != null) {
                for (PrescriptionItem item : prescription.getItems()) {
                    if (item.getAvailable() == Boolean.FALSE) {
                        unavailableItems.add(item);
                    } else {
                        availableItems.add(item);
                    }
                }
            }

            // Available Medicines Table
            if (!availableItems.isEmpty()) {
                Paragraph availTitle = new Paragraph("Prescribed & Dispensed / Available Medications", subHeaderFont);
                availTitle.setSpacingBefore(10f);
                availTitle.setSpacingAfter(5f);
                document.add(availTitle);

                PdfPTable table = new PdfPTable(5); // Medicine, Dosage, Qty, Timing, Duration
                table.setWidthPercentage(100);
                table.setWidths(new float[] { 3f, 2f, 1f, 2f, 2f });
                table.setSpacingBefore(5f);
                table.setSpacingAfter(15f);

                // Table Headers
                String[] headers = { "Medicine", "Dosage", "Qty", "Timing", "Duration" };
                for (String h : headers) {
                    PdfPCell cell = new PdfPCell(new Phrase(h, subHeaderFont));
                    cell.setBackgroundColor(new Color(240, 247, 255)); // Light Blue
                    cell.setPadding(8f);
                    cell.setBorderColor(new Color(200, 200, 200));
                    table.addCell(cell);
                }

                for (PrescriptionItem item : availableItems) {
                    addTableCell(table, item.getMedicineName());
                    addTableCell(table, item.getDosage());
                    addTableCell(table, String.valueOf(item.getQuantity()));
                    
                    StringBuilder timing = new StringBuilder();
                    if (item.getDosageTiming() != null && !item.getDosageTiming().isEmpty()) {
                        timing.append(item.getDosageTiming());
                    } else if (item.getMealSlots() != null && !item.getMealSlots().isEmpty()) {
                        timing.append(item.getMealSlots().replace(",", ", "));
                    }
                    
                    if (item.getFoodInstruction() != null && !item.getFoodInstruction().isEmpty()) {
                        timing.append(" (").append(item.getFoodInstruction().replace("_", " ")).append(")");
                    }
                    
                    if (timing.length() == 0) {
                        timing.append("As Directed");
                    }
                    
                    addTableCell(table, timing.toString());

                    String duration = "";
                    if (item.getStartDate() != null && item.getEndDate() != null) {
                        duration = item.getStartDate() + " to " + item.getEndDate();
                    }
                    addTableCell(table, duration);
                }
                document.add(table);
            }

            // Unavailable / Out of Stock Medications Section
            if (!unavailableItems.isEmpty()) {
                Font redHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(220, 38, 38));
                Paragraph unavailTitle = new Paragraph("Unavailable / Out of Stock Medications", redHeaderFont);
                unavailTitle.setSpacingBefore(15f);
                unavailTitle.setSpacingAfter(5f);
                document.add(unavailTitle);

                // Add alert notice text
                Font alertFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10, new Color(220, 38, 38));
                Paragraph alertText = new Paragraph("Notice: The following items are currently out of stock and were not dispensed. Please contact your doctor for alternative options.", alertFont);
                alertText.setSpacingAfter(10f);
                document.add(alertText);

                PdfPTable unavailTable = new PdfPTable(5); // Medicine, Dosage, Qty, Timing, Duration
                unavailTable.setWidthPercentage(100);
                unavailTable.setWidths(new float[] { 3f, 2f, 1f, 2f, 2f });
                unavailTable.setSpacingBefore(5f);
                unavailTable.setSpacingAfter(15f);

                // Table Headers (Red border / Light red background)
                String[] headers = { "Medicine", "Dosage", "Qty", "Timing", "Duration" };
                for (String h : headers) {
                    PdfPCell cell = new PdfPCell(new Phrase(h, redHeaderFont));
                    cell.setBackgroundColor(new Color(254, 242, 242)); // Light Red
                    cell.setPadding(8f);
                    cell.setBorderColor(new Color(239, 68, 68)); // Red border
                    unavailTable.addCell(cell);
                }

                for (PrescriptionItem item : unavailableItems) {
                    addRedTableCell(unavailTable, item.getMedicineName());
                    addRedTableCell(unavailTable, item.getDosage());
                    addRedTableCell(unavailTable, String.valueOf(item.getQuantity()));
                    
                    StringBuilder timing = new StringBuilder();
                    if (item.getDosageTiming() != null && !item.getDosageTiming().isEmpty()) {
                        timing.append(item.getDosageTiming());
                    } else if (item.getMealSlots() != null && !item.getMealSlots().isEmpty()) {
                        timing.append(item.getMealSlots().replace(",", ", "));
                    }
                    
                    if (item.getFoodInstruction() != null && !item.getFoodInstruction().isEmpty()) {
                        timing.append(" (").append(item.getFoodInstruction().replace("_", " ")).append(")");
                    }
                    
                    if (timing.length() == 0) {
                        timing.append("As Directed");
                    }
                    
                    addRedTableCell(unavailTable, timing.toString());

                    String duration = "";
                    if (item.getStartDate() != null && item.getEndDate() != null) {
                        duration = item.getStartDate() + " to " + item.getEndDate();
                    }
                    addRedTableCell(unavailTable, duration);
                }
                document.add(unavailTable);
            }


            // Pharmacy Pickup & Fulfillment Information
            if (prescription.getPharmacist() != null) {
                PdfPTable pharmacyTable = new PdfPTable(1);
                pharmacyTable.setWidthPercentage(100);
                pharmacyTable.setSpacingBefore(15f);
                
                PdfPCell pharmCell = new PdfPCell();
                pharmCell.setBorder(Rectangle.BOX);
                
                boolean isFullyDispensed = prescription.getStatus() == Prescription.PrescriptionStatus.DISPENSED;
                boolean hasCost = prescription.getTotalCost() != null;
                
                // Green for fully dispensed, Blue for verified/pickup with cost, Amber for newly accepted
                if (isFullyDispensed) {
                    pharmCell.setBorderColor(new Color(34, 197, 94)); // Green
                    pharmCell.setBackgroundColor(new Color(240, 253, 244));
                } else if (hasCost) {
                    pharmCell.setBorderColor(new Color(59, 130, 246)); // Blue
                    pharmCell.setBackgroundColor(new Color(239, 246, 255));
                } else {
                    pharmCell.setBorderColor(new Color(245, 158, 11)); // Amber/Orange
                    pharmCell.setBackgroundColor(new Color(254, 243, 199));
                }
                pharmCell.setPadding(10f);
                
                Paragraph p = new Paragraph();
                if (isFullyDispensed) {
                    p.add(new Chunk("PHARMACY FULFILLMENT & BILLING INFO\n", subHeaderFont));
                } else if (hasCost) {
                    p.add(new Chunk("PHARMACY PICKUP & ESTIMATED BILLING\n", subHeaderFont));
                } else {
                    p.add(new Chunk("PHARMACY PICKUP DETAILS (READY FOR PICKUP)\n", subHeaderFont));
                }
                
                User pharmacist = prescription.getPharmacist();
                String pharmacyName = pharmacist.getPharmacyName() != null ? pharmacist.getPharmacyName() : "Verified Pharmacy";
                p.add(new Chunk("Pharmacy Name: ", normalFont));
                p.add(new Chunk(pharmacyName + "\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.BLACK)));
                
                p.add(new Chunk("Pharmacist: ", normalFont));
                p.add(new Chunk(pharmacist.getFullName() + "\n", normalFont));
                
                if (pharmacist.getPharmacyLicenseNumber() != null && !pharmacist.getPharmacyLicenseNumber().isBlank()) {
                    p.add(new Chunk("License No: ", normalFont));
                    p.add(new Chunk(pharmacist.getPharmacyLicenseNumber() + "\n", normalFont));
                }
                
                // Mentions address of the pharmacy
                String pharmacyAddress = pharmacist.getShopDetails();
                if (pharmacyAddress == null || pharmacyAddress.isBlank()) {
                    pharmacyAddress = pharmacist.getAddress();
                }
                if (pharmacyAddress == null || pharmacyAddress.isBlank()) {
                    pharmacyAddress = "Address not specified";
                }
                p.add(new Chunk("Address: ", normalFont));
                p.add(new Chunk(pharmacyAddress + "\n", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.BLACK)));
                
                if (isFullyDispensed) {
                    p.add(new Chunk("Total Amount Paid: ", normalFont));
                    p.add(new Chunk("₹" + String.format("%.2f", prescription.getTotalCost()), 
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(21, 128, 61))));
                } else if (hasCost) {
                    p.add(new Chunk("Estimated Total Cost: ", normalFont));
                    p.add(new Chunk("₹" + String.format("%.2f", prescription.getTotalCost()), 
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(29, 78, 216)))); // Royal Blue
                    p.add(new Chunk(" (Payable at pickup)\n", FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10, Color.DARK_GRAY)));
                    
                    p.add(new Chunk("Status: ", normalFont));
                    p.add(new Chunk("Verification Completed & Ready for Pickup", 
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new Color(180, 83, 9)))); // Orange color
                } else {
                    p.add(new Chunk("Status: ", normalFont));
                    p.add(new Chunk("Accepted & Ready for Physical Pickup", 
                        FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new Color(180, 83, 9)))); // Orange color
                }
                
                pharmCell.addElement(p);
                pharmacyTable.addCell(pharmCell);
                document.add(pharmacyTable);
            }

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

    private void addRedTableCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(
                new Phrase(text != null ? text : "-", FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(153, 27, 27))));
        cell.setPadding(6f);
        cell.setBorderColor(new Color(252, 165, 165)); // Red border
        cell.setBackgroundColor(new Color(255, 245, 245)); // Light red background
        table.addCell(cell);
    }
}
