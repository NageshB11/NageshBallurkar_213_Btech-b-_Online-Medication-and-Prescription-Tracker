import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { PrescriptionService } from '../../services/prescription.service';
import { PharmacistService } from '../../services/pharmacist.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-prescription',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './prescription.component.html',
    styleUrls: ['./prescription.component.css']
})
export class PrescriptionComponent implements OnInit {
    prescriptionForm: FormGroup;
    selectedFile: File | null = null;
    fileError: string | null = null;
    message: string | null = null;
    isSubmitting: boolean = false;

    // For demonstration, we might load an existing prescription
    currentPrescriptionId: number | null = null;
    currentPrescriptionStatus: string | null = null;

    availablePharmacists: any[] = [];
    selectedPharmacistId: number | null = null;

    constructor(
        private fb: FormBuilder,
        private prescriptionService: PrescriptionService,
        private pharmacistService: PharmacistService,
        private route: ActivatedRoute
    ) {
        this.prescriptionForm = this.fb.group({
            patientEmail: ['', [Validators.required, Validators.email]],

            items: this.fb.array([])
        });
    }

    ngOnInit(): void {
        this.pharmacistService.getAllPharmacists().subscribe({
            next: (data) => this.availablePharmacists = data,
            error: (err) => console.error('Failed to load pharmacists', err)
        });

        this.route.queryParams.subscribe(params => {
            const id = params['id'];
            const cloneId = params['cloneId'];
            const patientEmail = params['patientEmail'];

            if (id) {
                this.loadPrescription(id);
            } else if (cloneId) {
                this.loadPrescriptionForCloning(cloneId);
            } else {
                if (patientEmail) {
                    this.prescriptionForm.patchValue({ patientEmail: patientEmail });
                }
                this.addItem();
            }
        });
    }

    loadPrescription(id: number): void {
        this.prescriptionService.getPrescription(id).subscribe({
            next: (data) => {
                this.currentPrescriptionId = data.id!;
                this.currentPrescriptionStatus = data.status!;
                this.populateForm(data);
            },
            error: (err) => {
                this.message = 'Error loading prescription: ' + err.message;
            }
        });
    }

    loadPrescriptionForCloning(id: number): void {
        this.prescriptionService.getPrescription(id).subscribe({
            next: (data) => {
                this.currentPrescriptionId = null; // New prescription
                this.currentPrescriptionStatus = 'PENDING';
                this.populateForm(data);
                // Optionally clear dates or set defaults for new
                this.prescriptionForm.patchValue({
                    expiryDate: '' // Force new expiry
                });
                this.message = 'Cloning prescription #' + id;
            },
            error: (err) => {
                this.message = 'Error loading prescription for cloning: ' + err.message;
            }
        });
    }

    populateForm(data: any): void {
        this.prescriptionForm.patchValue({
            patientEmail: data.patientEmail || (data.patient ? data.patient.email : ''),
            expiryDate: data.expiryDate
        });

        this.items.clear();
        if (data.items && data.items.length > 0) {
            data.items.forEach((item: any) => {
                this.items.push(this.fb.group({
                    medicineName: [item.medicineName, Validators.required],
                    dosage: [item.dosage, Validators.required],
                    quantity: [item.quantity, [Validators.required, Validators.min(1)]],
                    dosageTiming: [item.dosageTiming, Validators.required],
                    startDate: [item.startDate, Validators.required],
                    endDate: [item.endDate, Validators.required]
                }));
            });
        } else {
            this.addItem();
        }
    }

    get items(): FormArray {
        return this.prescriptionForm.get('items') as FormArray;
    }

    get patientEmail() {
        return this.prescriptionForm.get('patientEmail');
    }



    newItem(): FormGroup {
        return this.fb.group({
            medicineName: ['', Validators.required],
            dosage: ['', Validators.required],
            quantity: [1, [Validators.required, Validators.min(1)]],
            dosageTiming: ['', Validators.required],
            startDate: ['', Validators.required],
            endDate: ['', Validators.required]
        });
    }

    addItem(): void {
        this.items.push(this.newItem());
    }

    removeItem(index: number): void {
        this.items.removeAt(index);
    }

    saveDraft(): void {
        this.createPrescription(true);
    }

    createPrescription(isDraft: boolean): void {
        if (this.prescriptionForm.invalid) {
            this.prescriptionForm.markAllAsTouched();
            return;
        }
        this.isSubmitting = true;

        const formValue = this.prescriptionForm.value;
        const prescriptionData: any = {
            patientEmail: formValue.patientEmail,
            expiryDate: formValue.expiryDate,
            items: formValue.items,
            isDraft: isDraft
        };

        const request$ = this.currentPrescriptionId
            ? this.prescriptionService.updatePrescription(this.currentPrescriptionId, prescriptionData, "Updated by Doctor", "Doctor")
            : this.prescriptionService.createPrescription(prescriptionData);

        request$.subscribe({
            next: (res) => {
                this.message = isDraft ? 'Draft saved successfully!' : 'Prescription issued successfully!';
                this.currentPrescriptionId = res.id!;
                this.currentPrescriptionStatus = res.status!;
                this.isSubmitting = false;

                if (!isDraft) {
                    if (!this.route.snapshot.queryParams['id']) {
                        this.prescriptionForm.reset();
                        this.items.clear();
                        this.addItem();
                    }
                }
            },
            error: (err: any) => {
                this.message = 'Error: ' + (err.error?.message || err.message);
                this.isSubmitting = false;
            }
        });
    }

    onFileSelected(event: any): void {
        const file: File = event.target.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                this.fileError = 'Only PDF files are allowed.';
                this.selectedFile = null;
            } else if (file.size > 2 * 1024 * 1024) {
                this.fileError = 'PDF file size must not exceed 2 MB.';
                this.selectedFile = null;
            } else {
                this.fileError = null;
                this.selectedFile = file;
            }
        }
    }

    uploadPrescriptionFile(): void {
        if (!this.selectedFile) {
            this.fileError = 'Please select a file first.';
            return;
        }

        const patientEmail = this.prescriptionForm.get('patientEmail')?.value;

        const formData = new FormData();
        formData.append('file', this.selectedFile);
        if (patientEmail) {
            formData.append('patientEmail', patientEmail);
        }

        this.isSubmitting = true;
        this.prescriptionService.uploadPrescription(formData).subscribe({
            next: (res) => {
                this.message = 'Prescription uploaded successfully!';
                this.currentPrescriptionId = res.id!;
                this.currentPrescriptionStatus = res.status!;
                this.isSubmitting = false;
                this.selectedFile = null;

                if (!this.route.snapshot.queryParams['id']) {
                    this.prescriptionForm.reset();
                    this.items.clear();
                    this.addItem();
                    const fileInput = document.getElementById('prescriptionFile') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                }
            },
            error: (err: any) => {
                this.message = 'Error uploading prescription: ' + (err.error?.message || err.message);
                this.isSubmitting = false;
            }
        });
    }

    onSubmit(): void {
        this.createPrescription(false);
    }

    validatePrescription(): void {
        if (this.currentPrescriptionId) {
            this.prescriptionService.validatePrescription(this.currentPrescriptionId!, this.selectedPharmacistId || undefined).subscribe({
                next: (res) => {
                    this.message = 'Prescription Validated/Signed!';
                    this.currentPrescriptionStatus = res.status!;
                },
                error: (err) => {
                    this.message = 'Error validating: ' + err.message;
                }
            });
        }
    }
}
