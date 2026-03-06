MedTrack Plus: Clinical Fulfillment & Adherence EcosystemMedTrack Plus is a professional, role-based healthcare platform designed to bridge the gap between clinical prescriptions and daily patient adherence.It ensures a secure, "Closed-Loop" handshake between Doctors, Pharmacists, and Patients.


## Core High-Integrity FeaturesAudit Vault (v1.0 → v1.1)
       Every modification to a prescription triggers a JSON snapshot and a version increment for legal compliance.Nutritional Synchronization: Doctors lock clinical constraints (Before/After Food) for Breakfast, Lunch, and Dinner slots.Directed Dispatch: A secure, targeted routing system between verified Doctors and Pharmacists.

Adherence Risk Engine: Real-time Circular Progress Gauges that flag patients as "High Risk" if adherence drops below 70%.
Event-Driven Notifications: Interactive reminders with Snooze (15 min) and Mark as Taken capabilities.## Technical ArchitectureLayerTechnologyKey ResponsibilityFrontendAngular 17+Apollo Glassmorphic UI and RxJS-based real-time state management.BackendSpring BootJWT Security, Entity Listeners for auditing, and task scheduling.

DatabaseMySQLRelational storage for Versioned Audit Logs and User Roles.


## Quick StartBackend: 
Configure application.properties with your MySQL credentials and run ./mvnw spring-boot:run.Frontend: Run npm install followed by ng serve to launch the Apollo Dashboard at localhost:4200.Governance: Log in as Admin to verify Doctor/Pharmacist licenses before clinical use.
