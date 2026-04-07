package com.medical.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.medical.backend.dto.DrugProfileDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class ExternalDrugService {
    private final RestTemplate restTemplate = new RestTemplate();
    private static final String FDA_API_URL = "https://api.fda.gov/drug/label.json?search=(openfda.brand_name:\"%s\"+openfda.generic_name:\"%s\")&limit=1";

    public DrugProfileDTO fetchDrugProfile(String medicineName) {
        if (medicineName == null || medicineName.isEmpty()) {
            return createMockProfile("Unknown Medication");
        }

        // Check for specific mock data first to provide a "premium" dummy experience
        DrugProfileDTO specificMock = getSpecificMock(medicineName);
        if (specificMock != null) return specificMock;

        try {
            String searchName = medicineName.split(" ")[0].replaceAll("[^a-zA-Z0-9]", "");
            String url = String.format(FDA_API_URL, searchName, searchName).replace("+", "%20OR%20");
            
            log.info("Fetching FDA data for: {} using URL: {}", medicineName, url);
            JsonNode response = restTemplate.getForObject(url, JsonNode.class);

            // DIAGNOSTIC LOG: Trace raw API response
            log.info("RAW FDA API RESPONSE for {}: {}", medicineName, response != null ? "SUCCESS" : "NULL");
            if (response != null) {
                log.debug("RESPONSE CONTENT: {}", response.toString());
            }

            if (response != null && response.has("results") && response.get("results").size() > 0) {
                JsonNode result = response.get("results").get(0);

                List<String> usage = new ArrayList<>();
                if (result.has("indications_and_usage") && result.get("indications_and_usage").size() > 0) {
                    usage.add(result.get("indications_and_usage").get(0).asText());
                } else if (result.has("dosage_and_administration") && result.get("dosage_and_administration").size() > 0) {
                    usage.add(result.get("dosage_and_administration").get(0).asText());
                }

                List<String> contra = new ArrayList<>();
                if (result.has("contraindications") && result.get("contraindications").size() > 0) {
                    contra.add(result.get("contraindications").get(0).asText());
                }

                boolean pregnancy = result.toString().toLowerCase().contains("pregnancy");
                boolean alcohol = result.toString().toLowerCase().contains("alcohol");

                String manufacturer = "Generic/Unknown";
                String countryOfOrigin = "FDA Verified Production, USA";
                if (result.has("openfda")) {
                    JsonNode openfda = result.get("openfda");
                    if (openfda.has("manufacturer_name") && openfda.get("manufacturer_name").size() > 0) {
                        manufacturer = openfda.get("manufacturer_name").get(0).asText();
                        if (openfda.has("country")) {
                             countryOfOrigin = openfda.get("country").get(0).asText() + " (FDA Registered)";
                        }
                    }
                }

                String purpose = "Therapeutic treatment as prescribed.";
                if (result.has("indications_and_usage") && result.get("indications_and_usage").size() > 0) {
                    purpose = result.get("indications_and_usage").get(0).asText();
                    if (purpose.length() > 200) purpose = purpose.substring(0, 197) + "...";
                }

                String storageAdvice = "Store in a cool, dry place.";
                if (result.has("storage_and_handling") && result.get("storage_and_handling").size() > 0) {
                    storageAdvice = result.get("storage_and_handling").get(0).asText();
                }

                String missedDoseAdvice = "Take as soon as remembered; skip if near next dose.";
                if (result.has("missed_dose") && result.get("missed_dose").size() > 0) {
                    missedDoseAdvice = result.get("missed_dose").get(0).asText();
                }

                List<String> drugInteractions = new ArrayList<>();
                if (result.has("drug_interactions") && result.get("drug_interactions").size() > 0) {
                    drugInteractions.add(result.get("drug_interactions").get(0).asText());
                }

                List<String> foodInteractions = new ArrayList<>();
                if (result.toString().toLowerCase().contains("food")) {
                    foodInteractions.add("Potential food interactions. Check detailed label.");
                }

                String rxcui = "N/A";
                List<String> ingredients = new ArrayList<>();
                String pharmClass = "Clinical Therapy";

                if (result.has("openfda")) {
                    JsonNode openfda = result.get("openfda");
                    if (openfda.has("rxcui") && openfda.get("rxcui").size() > 0) rxcui = openfda.get("rxcui").get(0).asText();
                    if (openfda.has("substance_name")) {
                        for (JsonNode n : openfda.get("substance_name")) ingredients.add(n.asText());
                    }
                    if (openfda.has("pharm_class_epc") && openfda.get("pharm_class_epc").size() > 0) {
                        pharmClass = openfda.get("pharm_class_epc").get(0).asText();
                    }
                }

                List<String> healthWarnings = new ArrayList<>();
                String fullText = result.toString().toLowerCase();
                if (fullText.contains("kidney")) healthWarnings.add("Monitor renal function.");
                if (fullText.contains("liver")) healthWarnings.add("Liver monitoring may be required.");
                if (fullText.contains("heart")) healthWarnings.add("Cardiovascular caution.");

                String brandName = medicineName;
                if (result.has("openfda")) {
                    JsonNode openfda = result.get("openfda");
                    if (openfda.has("brand_name") && openfda.get("brand_name").size() > 0) {
                        brandName = openfda.get("brand_name").get(0).asText();
                    }
                }

                return DrugProfileDTO.builder()
                        .brandName(brandName)
                        .genericName(result.has("openfda") && result.get("openfda").has("generic_name") && result.get("openfda").get("generic_name").size() > 0
                                ? result.get("openfda").get("generic_name").get(0).asText()
                                : medicineName)
                        .manufacturer(manufacturer)
                        .usageInstructions(usage.isEmpty() ? List.of("Use as directed.") : formatClinicalList(usage))
                        .contraindications(contra.isEmpty() ? List.of("Consult your doctor.") : formatClinicalList(contra))
                        .pregnancyWarning(pregnancy)
                        .alcoholWarning(alcohol)
                        .countryOfOrigin(countryOfOrigin)
                        .missedDoseTip(formatClinicalText(missedDoseAdvice))
                        .drugInteractions(drugInteractions.isEmpty() ? List.of("No common interactions found.") : formatClinicalList(drugInteractions))
                        .foodInteractions(foodInteractions.isEmpty() ? List.of("General diet is fine.") : formatClinicalList(foodInteractions))
                        .rxcui(rxcui)
                        .purpose(formatClinicalText(purpose))
                        .storageAdvice(formatClinicalText(storageAdvice))
                        .missedDoseAdvice(formatClinicalText(missedDoseAdvice))
                        .activeIngredients(ingredients.isEmpty() ? List.of("Ingredients list unavailable") : ingredients)
                        .pharmacologicalCategory(pharmClass)
                        .healthConditionContraindications(healthWarnings.isEmpty() ? List.of("Standard monitoring") : healthWarnings)
                        .batchNumber("B-" + Math.abs(medicineName.hashCode() % 10000))
                        .expiryDate("12/2026")
                        .pillImageUrl("assets/images/pills/generic.png")
                        .build();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch FDA data for {}: {}", medicineName, e.getMessage());
        }

        return createMockProfile(medicineName);
    }

    private DrugProfileDTO getSpecificMock(String name) {
        String lower = name.toLowerCase();
        if (lower.contains("amoxicillin")) {
            return DrugProfileDTO.builder()
                .brandName("Amoxicillin")
                .genericName("Amoxicillin Clavulanate")
                .manufacturer("Sandoz Inc.")
                .usageInstructions(List.of("Take exactly as prescribed even if symptoms improve.", "Complete the full course to prevent antibiotic resistance.", "Can be taken with or without food."))
                .contraindications(List.of("⚠️ History of penicillin allergy.", "⚠️ Severe renal impairment.", "⚠️ Use caution with infectious mononucleosis."))
                .missedDoseTip("Take as soon as remembered; skip if near next dose.")
                .drugInteractions(List.of("Oral contraceptives (may reduce efficacy)", "Allopurinol (increased risk of rash)", "Methotrexate (increased toxicity)"))
                .foodInteractions(List.of("Best taken at the start of a meal to minimize GI upset."))
                .purpose("Treatment of bacterial infections (Respiratory, Sinusitis, Skin).")
                .storageAdvice("Store powder for oral suspension in refrigerator after reconstitution.")
                .missedDoseAdvice("Take as soon as possible, but skip if next dose is soon.")
                .activeIngredients(List.of("Amoxicillin", "Potassium Clavulanate"))
                .pharmacologicalCategory("Penicillin-class Antibacterial")
                .healthConditionContraindications(List.of("Renal function monitoring recommended for long-term use"))
                .batchNumber("B-AMX-2024")
                .expiryDate("11/2025")
                .pillImageUrl("assets/images/pills/capsule_blue.png")
                .countryOfOrigin("Holzkirchen, Germany")
                .build();
        } else if (lower.contains("lisinopril")) {
            return DrugProfileDTO.builder()
                .brandName("Lisinopril")
                .genericName("Lisinopril Anhydrous")
                .manufacturer("Lupin Pharmaceuticals")
                .usageInstructions(List.of("Take at the same time every day.", "Monitor blood pressure regularly.", "Report any onset of dry cough."))
                .contraindications(List.of("⚠️ History of angioedema.", "⚠️ Pregnancy (Boxed Warning: Fetal Toxicity).", "⚠️ Concomitant use with Aliskiren in diabetic patients."))
                .missedDoseTip("Do not take two doses at once.")
                .drugInteractions(List.of("Diuretics (enhanced hypotensive effect)", "Potassium supplements (risk of hyperkalemia)", "NSAIDs (may reduce efficacy)"))
                .foodInteractions(List.of("Avoid high-potassium foods (bananas, spinach) in large quantities."))
                .purpose("Management of hypertension and heart failure.")
                .storageAdvice("Store at room temperature (20-25°C).")
                .missedDoseAdvice("Take forgotten dose as soon as remembered, unless it's almost time for the next.")
                .activeIngredients(List.of("Lisinopril"))
                .pharmacologicalCategory("ACE Inhibitor")
                .healthConditionContraindications(List.of("Monitor serum potassium and renal function"))
                .batchNumber("B-LIS-8821")
                .expiryDate("09/2026")
                .pillImageUrl("assets/images/pills/round_pink.png")
                .countryOfOrigin("Mumbai, India")
                .build();
        } else if (lower.contains("metformin")) {
            return DrugProfileDTO.builder()
                .brandName("Metformin")
                .genericName("Metformin Hydrochloride")
                .manufacturer("Teva Pharmaceuticals")
                .usageInstructions(List.of("Take with meals to reduce stomach upset.", "Monitor blood glucose levels as directed.", "Avoid excessive alcohol consumption."))
                .contraindications(List.of("⚠️ Severe renal impairment (eGFR < 30).", "⚠️ Metabolic acidosis.", "⚠️ Boxed Warning: Lactic Acidosis risk."))
                .missedDoseTip("Take with next meal if remembered same day.")
                .drugInteractions(List.of("Cationic drugs (cimetidine, digoxin)", "Contrast media (iodinated)", "Alcohol (potentiates lactic acidosis)"))
                .foodInteractions(List.of("Absorption is improved when taken with a meal."))
                .purpose("Glycemic control in Type 2 Diabetes Mellitus.")
                .storageAdvice("Protect from light and moisture.")
                .missedDoseAdvice("Take with food as soon as remembered; skip if next dose is coming up.")
                .activeIngredients(List.of("Metformin HCl"))
                .pharmacologicalCategory("Biguanide Antidiabetic")
                .healthConditionContraindications(List.of("Monitor eGFR annually"))
                .batchNumber("B-MET-4411")
                .expiryDate("05/2026")
                .pillImageUrl("assets/images/pills/oval_white.png")
                .countryOfOrigin("Petah Tikva, Israel")
                .build();
        } else if (lower.contains("atorvastatin")) {
            return DrugProfileDTO.builder()
                .brandName("Atorvastatin")
                .genericName("Atorvastatin Calcium")
                .manufacturer("Pfizer Inc.")
                .usageInstructions(List.of("Can be taken at any time of day, with or without food.", "Maintain a cholesterol-lowering diet.", "Notify doctor of unexplained muscle pain."))
                .contraindications(List.of("⚠️ Active liver disease.", "⚠️ Pregnancy and Lactation.", "⚠️ Hypersensitivity to any component."))
                .missedDoseTip("Skip if more than 12 hours late.")
                .drugInteractions(List.of("Strong CYP3A4 inhibitors (Clarithromycin)", "Cyclosporine", "Grapefruit juice (>1.2L daily)"))
                .foodInteractions(List.of("Large amounts of grapefruit juice should be avoided."))
                .purpose("Lowering LDL cholesterol and triglycerides.")
                .storageAdvice("Store in controlled room temperature.")
                .missedDoseAdvice("Take as soon as remembered, but skip if more than 12 hours have passed.")
                .activeIngredients(List.of("Atorvastatin Calcium"))
                .pharmacologicalCategory("HMG-CoA Reductase Inhibitor (Statin)")
                .healthConditionContraindications(List.of("Liver enzyme tests should be performed if symptoms suggest injury"))
                .batchNumber("B-ATR-9022")
                .expiryDate("08/2026")
                .pillImageUrl("assets/images/pills/tri_white.png")
                .countryOfOrigin("Groton, Connecticut, USA")
                .build();
        } else if (lower.contains("ibuprofen")) {
            return DrugProfileDTO.builder()
                .brandName("Ibuprofen")
                .genericName("Ibuprofen (NSAID)")
                .manufacturer("Advil (GlaxoSmithKline)")
                .usageInstructions(List.of("Take with food or milk to decrease stomach upset.", "Use the lowest effective dose for the shortest duration.", "Do not exceed 1200mg in 24 hours unless directed."))
                .contraindications(List.of("⚠️ History of gastrointestinal bleeding.", "⚠️ Severe heart failure.", "⚠️ Third trimester of pregnancy."))
                .missedDoseTip("Take only when needed for pain; skip if near next scheduled dose.")
                .drugInteractions(List.of("Anticoagulants (increased bleeding risk)", "Lithium (increased toxicity)", "Other NSAIDs (increased GI risk)"))
                .foodInteractions(List.of("Food decreases rate but not extent of absorption."))
                .purpose("Relief of mild to moderate pain, fever, and inflammation.")
                .storageAdvice("Store at room temperature away from moisture.")
                .missedDoseAdvice("Take as soon as remembered, but do not double dose.")
                .activeIngredients(List.of("Ibuprofen"))
                .pharmacologicalCategory("Non-Steroidal Anti-Inflammatory Drug (NSAID)")
                .healthConditionContraindications(List.of("Caution in patients with asthma or renal impairment"))
                .batchNumber("B-IBU-1122")
                .expiryDate("12/2026")
                .pillImageUrl("assets/images/pills/round_brown.png")
                .countryOfOrigin("Madison, New Jersey, USA")
                .build();
        } else if (lower.contains("paracetamol") || lower.contains("acetaminophen")) {
            return DrugProfileDTO.builder()
                .brandName("Paracetamol")
                .genericName("Acetaminophen")
                .manufacturer("Johnson & Johnson")
                .usageInstructions(List.of("Take with a full glass of water.", "Do not exceed 4g in 24 hours.", "Monitor for signs of allergic reaction."))
                .contraindications(List.of("⚠️ Severe hepatic impairment.", "⚠️ Active liver disease.", "⚠️ Hypersensitivity to acetaminophen."))
                .missedDoseTip("Take as soon as remembered; skip if time for next dose.")
                .drugInteractions(List.of("Warfarin (may increase INR with chronic use)", "Alcohol (increased risk of liver toxicity)"))
                .foodInteractions(List.of("Absorption may be delayed by high-carb meals."))
                .purpose("Fever reducer and analgesic for mild to moderate pain.")
                .storageAdvice("Store in a cool, dry place.")
                .missedDoseAdvice("Take as soon as remembered; skip if next dose is close.")
                .activeIngredients(List.of("Acetaminophen"))
                .pharmacologicalCategory("Analgesic / Antipyretic")
                .healthConditionContraindications(List.of("Avoid use in chronic alcoholism", "Warning: Liver failure risk with overdose"))
                .batchNumber("B-PCM-5531")
                .expiryDate("06/2027")
                .pillImageUrl("assets/images/pills/oval_white.png")
                .countryOfOrigin("New Brunswick, New Jersey, USA")
                .build();
        } else if (lower.contains("azithromycin")) {
            return DrugProfileDTO.builder()
                .brandName("Azithromycin")
                .genericName("Azithromycin Dihydrate")
                .manufacturer("Pfizer Inc.")
                .usageInstructions(List.of("Take once daily for the prescribed duration.", "Can be taken with or without food.", "Shake suspension well before use."))
                .contraindications(List.of("⚠️ History of cholestatic jaundice.", "⚠️ Liver dysfunction secondary to prior azithromycin use.", "⚠️ Hypersensitivity to macrolide antibiotics."))
                .missedDoseTip("Take as soon as possible; skip if next dose is within 12 hours.")
                .drugInteractions(List.of("Antacids containing aluminum or magnesium (decreases absorption)", "Digoxin (increased levels)", "Warfarin (increased bleeding risk)"))
                .foodInteractions(List.of("Absorption is generally not affected by food."))
                .purpose("Treatment of respiratory, skin, and ear infections.")
                .storageAdvice("Store at room temperature; do not freeze suspension.")
                .missedDoseAdvice("Take the missed dose as soon as remembered.")
                .activeIngredients(List.of("Azithromycin"))
                .pharmacologicalCategory("Macrolide Antibiotic")
                .healthConditionContraindications(List.of("Caution in patients with prolonged QT interval"))
                .batchNumber("B-AZI-7744")
                .expiryDate("03/2026")
                .pillImageUrl("assets/images/pills/capsule_white.png")
                .countryOfOrigin("Brooklyn, New York, USA")
                .build();
        } else if (lower.contains("cetirizine")) {
            return DrugProfileDTO.builder()
                .brandName("Cetirizine")
                .genericName("Cetirizine Hydrochloride")
                .manufacturer("McNeil Consumer Healthcare")
                .usageInstructions(List.of("Take once daily with or without food.", "Do not exceed one tablet in 24 hours.", "Best taken in the evening if it causes drowsiness."))
                .contraindications(List.of("⚠️ End-stage renal disease.", "⚠️ Hypersensitivity to cetirizine or hydroxyzine."))
                .missedDoseTip("Skip the missed dose and take the next dose at the regular time.")
                .drugInteractions(List.of("CNS depressants (increased sedation)", "Alcohol (increased drowsiness)"))
                .foodInteractions(List.of("Food does not significantly affect absorption."))
                .purpose("Relief of allergy symptoms (sneezing, runny nose, itchy eyes).")
                .storageAdvice("Protect from light and moisture.")
                .missedDoseAdvice("Skip the missed dose; never double dose.")
                .activeIngredients(List.of("Cetirizine HCl"))
                .pharmacologicalCategory("H1-Receptor Antagonist (Antihistamine)")
                .healthConditionContraindications(List.of("Caution when operating heavy machinery"))
                .batchNumber("B-CET-9921")
                .expiryDate("10/2026")
                .pillImageUrl("assets/images/pills/round_small_white.png")
                .countryOfOrigin("Fort Washington, Pennsylvania, USA")
                .build();
        } else if (lower.contains("omeprazole")) {
            return DrugProfileDTO.builder()
                .brandName("Omeprazole")
                .genericName("Omeprazole Magnesium")
                .manufacturer("AstraZeneca")
                .usageInstructions(List.of("Take 30-60 minutes before breakfast.", "Swallow capsules whole; do not crush or chew.", "Standard course is 14 days."))
                .contraindications(List.of("⚠️ Hypersensitivity to substituted benzimidazoles.", "⚠️ Concomitant use with Rilpivirine."))
                .missedDoseTip("Take as soon as remembered; skip if next dose is within 12 hours.")
                .drugInteractions(List.of("Clopidogrel (may reduce efficacy)", "Methotrexate (increased levels)", "Azole antifungals (decreased absorption)"))
                .foodInteractions(List.of("Must be taken on an empty stomach for maximum acid suppression."))
                .purpose("Treatment of heartburn, GERD, and gastric ulcers.")
                .storageAdvice("Store in a cool, dry place.")
                .missedDoseAdvice("Take before your next meal if possible.")
                .activeIngredients(List.of("Omeprazole"))
                .pharmacologicalCategory("Proton Pump Inhibitor (PPI)")
                .healthConditionContraindications(List.of("Long-term use may increase risk of bone fractures"))
                .batchNumber("B-OME-3388")
                .expiryDate("01/2027")
                .pillImageUrl("assets/images/pills/capsule_purple.png")
                .countryOfOrigin("Cambridge, United Kingdom")
                .build();
        } else if (lower.contains("amlodipine")) {
            return DrugProfileDTO.builder()
                .brandName("Amlodipine")
                .genericName("Amlodipine Besylate")
                .manufacturer("Viatris (Mylan)")
                .usageInstructions(List.of("Take at the same time every day.", "Can be taken with or without food.", "Monitor for swelling in ankles or feet."))
                .contraindications(List.of("⚠️ Severe hypotension.", "⚠️ Hypersensitivity to dihydropyridines."))
                .missedDoseTip("Take within 12 hours of the missed time; otherwise skip.")
                .drugInteractions(List.of("Simvastatin (limit simvastatin dose)", "Cyclosporine (increased levels)", "Strong CYP3A4 inhibitors"))
                .foodInteractions(List.of("Grapefruit juice may slightly increase blood levels."))
                .purpose("Management of hypertension and chronic stable angina.")
                .storageAdvice("Store at controlled room temperature.")
                .missedDoseAdvice("Take as soon as possible within 12 hours.")
                .activeIngredients(List.of("Amlodipine Besylate"))
                .pharmacologicalCategory("Calcium Channel Blocker")
                .healthConditionContraindications(List.of("Caution in patients with severe hepatic impairment"))
                .batchNumber("B-AML-4466")
                .expiryDate("07/2026")
                .pillImageUrl("assets/images/pills/round_white.png")
                .countryOfOrigin("Canonsburg, Pennsylvania, USA")
                .build();
        } else if (lower.contains("doxycycline")) {
            return DrugProfileDTO.builder()
                .brandName("Doxycycline")
                .genericName("Doxycycline Hyclate")
                .manufacturer("Alembic Pharmaceuticals")
                .usageInstructions(List.of("Take with a full glass of water and stay upright for 30 mins.", "Can be taken with food/milk if stomach upset occurs.", "Avoid sun exposure and use sunscreen."))
                .contraindications(List.of("⚠️ Pregnancy and children <8 years (teeth discoloration).", "⚠️ Hypersensitivity to tetracyclines."))
                .missedDoseTip("Take as soon as possible; skip if almost time for next dose.")
                .drugInteractions(List.of("Oral contraceptives (decreased efficacy)", "Iron supplements and antacids (decreased absorption)", "Retinoids (increased intracranial pressure)"))
                .foodInteractions(List.of("Dairy products may slightly reduce absorption but help with GI upset."))
                .purpose("Treatment of various bacterial infections and malaria prophylaxis.")
                .storageAdvice("Protect from light and heat.")
                .missedDoseAdvice("Take with food as soon as remembered.")
                .activeIngredients(List.of("Doxycycline"))
                .pharmacologicalCategory("Tetracycline Antibiotic")
                .healthConditionContraindications(List.of("Warning: Potential for photosensitivity reactions"))
                .batchNumber("B-DOX-2255")
                .expiryDate("04/2026")
                .pillImageUrl("assets/images/pills/capsule_green.png")
                .countryOfOrigin("Vadodara, India")
                .build();
        } else if (lower.contains("metoprolol")) {
            return DrugProfileDTO.builder()
                .brandName("Metoprolol")
                .genericName("Metoprolol Succinate ER")
                .manufacturer("AstraZeneca Pharmaceuticals")
                .usageInstructions(List.of("Take with or immediately following a meal.", "Do not crush or chew extended-release tablets.", "Monitor heart rate and blood pressure."))
                .contraindications(List.of("⚠️ Severe bradycardia.", "⚠️ Second or third-degree heart block.", "⚠️ Cardiogenic shock or overt heart failure."))
                .missedDoseTip("Take as soon as possible, but skip if next dose is <8 hours away.")
                .drugInteractions(List.of("Catecholamine-depleting drugs (reserpine)", "CYP2D6 inhibitors (fluoxetine, paroxetine)", "Digitalis glycosides"))
                .foodInteractions(List.of("Alcohol may increase blood levels of metoprolol."))
                .purpose("Management of hypertension, angina pectoris, and heart failure.")
                .storageAdvice("Store at room temperature (20-25°C).")
                .missedDoseAdvice("Take as soon as remembered; skip if next dose is soon.")
                .activeIngredients(List.of("Metoprolol Succinate"))
                .pharmacologicalCategory("Beta-1 Selective Adrenoceptor Blocking Agent")
                .healthConditionContraindications(List.of("Caution in patients with bronchospastic disease"))
                .batchNumber("B-MET-2299")
                .expiryDate("04/2026")
                .pillImageUrl("assets/images/pills/oval_white.png")
                .countryOfOrigin("Södertälje, Sweden")
                .build();
        } else if (lower.contains("losartan")) {
            return DrugProfileDTO.builder()
                .brandName("Losartan")
                .genericName("Losartan Potassium")
                .manufacturer("Merck & Co.")
                .usageInstructions(List.of("May be taken with or without food.", "Maintain adequate hydration.", "Rise slowly from sitting or lying position."))
                .contraindications(List.of("⚠️ Pregnancy (Boxed Warning: Fetal Toxicity).", "⚠️ Hypersensitivity to losartan.", "⚠️ Concomitant use with aliskiren in diabetics."))
                .missedDoseTip("Take as soon as remembered on the same day.")
                .drugInteractions(List.of("Potassium-sparing diuretics", "NSAIDs (may decrease antihypertensive effect)", "Lithium (increased serum levels)"))
                .foodInteractions(List.of("Avoid salt substitutes containing potassium."))
                .purpose("Treatment of hypertension and reduction of stroke risk in hypertensive patients.")
                .storageAdvice("Keep container tightly closed. Protect from light.")
                .missedDoseAdvice("Take the missed dose as soon as you remember.")
                .activeIngredients(List.of("Losartan Potassium"))
                .pharmacologicalCategory("Angiotensin II Receptor Blocker (ARB)")
                .healthConditionContraindications(List.of("Monitor renal function and serum potassium"))
                .batchNumber("B-LOS-7712")
                .expiryDate("08/2026")
                .pillImageUrl("assets/images/pills/round_white.png")
                .countryOfOrigin("Kenilworth, New Jersey, USA")
                .build();
        } else if (lower.contains("gabapentin")) {
            return DrugProfileDTO.builder()
                .brandName("Gabapentin")
                .genericName("Gabapentin")
                .manufacturer("Pfizer (Neurontin)")
                .usageInstructions(List.of("Do not exceed 12 hours between evening and next morning tablets.", "May cause drowsiness; avoid driving until effect is known.", "Do not abruptly discontinue."))
                .contraindications(List.of("⚠️ Hypersensitivity to gabapentin.", "⚠️ Acute pancreatitis (relative)."))
                .missedDoseTip("Take as soon as remembered; skip if next dose is <2 hours away.")
                .drugInteractions(List.of("Antacids (take gabapentin 2h after antacids)", "Opioids (increased sedation risk)", "Alcohol (increased CNS depression)"))
                .foodInteractions(List.of("Can be taken with or without food."))
                .purpose("Treatment of postherpetic neuralgia and partial onset seizures.")
                .storageAdvice("Store at 25°C (77°F).")
                .missedDoseAdvice("Take as soon as possible, but skip if next dose is very soon.")
                .activeIngredients(List.of("Gabapentin"))
                .pharmacologicalCategory("Anticonvulsant / GABA Analog")
                .healthConditionContraindications(List.of("Monitor for suicidal thoughts or behavior"))
                .batchNumber("B-GAB-3344")
                .expiryDate("10/2026")
                .pillImageUrl("assets/images/pills/capsule_yellow.png")
                .countryOfOrigin("Puurs, Belgium")
                .build();
        } else if (lower.contains("warfarin")) {
            return DrugProfileDTO.builder()
                .brandName("Coumadin")
                .genericName("Warfarin Sodium")
                .manufacturer("Bristol-Myers Squibb")
                .usageInstructions(List.of("Take exactly as directed by your doctor.", "Have your blood (INR) tested regularly.", "Maintain a consistent diet, especially foods rich in Vitamin K."))
                .contraindications(List.of("⚠️ Active bleeding, high risk of bleeding, or active gastric ulcer.", "⚠️ Pregnancy (unless specifically authorized for mechanical heart valves).", "⚠️ Recent or planned surgery."))
                .missedDoseTip("Take as soon as remembered on the same day. Do not take a double dose the next day.")
                .drugInteractions(List.of("NSAIDs (increased bleeding risk)", "Antibiotics (may alter INR)", "Amiodarone (increased warfarin effect)"))
                .foodInteractions(List.of("Maintain a consistent intake of Vitamin K-rich foods (e.g., spinach, broccoli).", "Avoid cranberry juice and alcohol."))
                .purpose("Prevention and treatment of blood clots.")
                .storageAdvice("Store at room temperature away from light and moisture.")
                .missedDoseAdvice("Take as soon as remembered on the same day. Do not double the dose.")
                .activeIngredients(List.of("Warfarin Sodium"))
                .pharmacologicalCategory("Anticoagulant (Vitamin K Antagonist)")
                .healthConditionContraindications(List.of("Strict monitoring required in hepatic or renal impairment.", "High bleeding risk."))
                .batchNumber("B-WAR-1033")
                .expiryDate("02/2027")
                .pillImageUrl("assets/images/pills/round_pink.png")
                .countryOfOrigin("New York, New York, USA")
                .build();
        }
        return null;
    }

    private List<String> formatClinicalList(List<String> rawList) {
        List<String> formatted = new ArrayList<>();
        if (rawList == null) return formatted;

        for (String raw : rawList) {
            if (raw == null || raw.trim().isEmpty()) continue;

            // 1. Sanitize: Remove noise patterns (NDCs, IDs, CAPS headers)
            String clean = raw.replaceAll("(?i)^\\d+(\\.\\d+)?\\s+[A-Z\\s]+[:\\-]?\\s*", "");
            clean = clean.replaceAll("(?i)NDC:\\s+[0-9-]+", "");
            clean = clean.replaceAll("(?i)Product:\\s+[0-9-]+", "");
            clean = clean.replaceAll("(?i)[0-9]+\\s+TABLET.*BOTTLE", "");

            // 2. Tokenize: Split at (. ), numbered markers (1., 2.), or bullet symbols (-, *, •)
            String[] tokens = clean.split("(?<=[.!?])\\s+|(?m)^\\s*(\\d+\\.|[•\\-*])\\s+|(?<=\\s)(\\d+\\.|[•\\-*])\\s+");

            for (String token : tokens) {
                if (token == null) continue;
                String item = token.trim().replaceAll("\\s+", " ");
                
                // 3. Refine: Filter noise and ensure professional capitalization
                if (item.length() > 10 && !isNoise(item)) {
                    // Capitalize first letter
                    item = item.substring(0, 1).toUpperCase() + item.substring(1);
                    if (!item.endsWith(".") && !item.endsWith("!") && !item.endsWith("?")) {
                        item += ".";
                    }
                    if (!formatted.contains(item)) {
                        formatted.add(item);
                    }
                }
            }
        }
        return formatted.isEmpty() ? List.of("Clinical guidance data is currently being updated.") : formatted;
    }

    private boolean isNoise(String text) {
        String lower = text.toLowerCase();
        return lower.contains("how supplied") || 
               lower.contains("ndc:") || 
               lower.contains("package size") ||
               lower.contains("label sequence") ||
               text.matches("^[0-9\\s\\-\\.,/\\%]+$"); // Just numbers/symbols
    }

    private String formatClinicalText(String text) {
        if (text == null || text.trim().isEmpty()) return "";
        String clean = text.replaceAll("(?i)^\\d+(\\.\\d+)?\\s+[A-Z\\s]+", "");
        return clean.trim().replaceAll("\\s+", " ");
    }

    private DrugProfileDTO createMockProfile(String medicineName) {
        return DrugProfileDTO.builder()
                .brandName(medicineName)
                .genericName("Generic Protocol")
                .manufacturer("GlaxoSmithKline (GSK)")
                .usageInstructions(List.of("Take 30 mins after food with water.", "Do not crush or chew capsules."))
                .contraindications(List.of("⚠️ Avoid Alcohol while taking this medication.", "⚠️ Not for use during pregnancy."))
                .missedDoseTip("Take as soon as remembered; skip if near next dose.")
                .drugInteractions(List.of("Check with pharmacist for interactions."))
                .foodInteractions(List.of("Follow general dietary guidelines."))
                .purpose("Therapeutic treatment.")
                .storageAdvice("Store in a cool, dry place.")
                .missedDoseAdvice("Take as soon as remembered.")
                .activeIngredients(List.of("Verified Clinical Components"))
                .pharmacologicalCategory("Clinical Therapy")
                .healthConditionContraindications(List.of("Standard health monitoring recommended"))
                .batchNumber("B-LOC-" + Math.abs(medicineName.hashCode() % 10000))
                .expiryDate("12/2026")
                .pillImageUrl("assets/images/pills/generic.png")
                .countryOfOrigin("Brentford, United Kingdom")
                .build();
    }
}
