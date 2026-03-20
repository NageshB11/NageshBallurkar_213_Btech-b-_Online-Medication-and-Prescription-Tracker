export interface SafetyReport {
    safe: boolean;
    allergyConflicts: string[];
    conditionConflicts: string[];
    severeInteractions: string[];
    moderateInteractions: string[];
    minorInteractions: string[];
    summary: string;
}
