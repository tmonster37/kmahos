/**
 * Utility functions for patient follow-up schedule aggregation and formatting.
 * Strictly operates on calendar date strings (YYYY-MM-DD) without timezone shifts.
 */

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Checks if a given year is a leap year in the Gregorian calendar.
 * @param {number} year
 * @returns {boolean}
 */
export function isLeapYear(year) {
    if (typeof year !== "number" || isNaN(year)) return false;
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Validates whether a given string is a valid ISO date-only string (YYYY-MM-DD),
 * including strict calendar month day boundaries and leap years.
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isValidDateOnly(dateStr) {
    if (typeof dateStr !== "string") return false;
    const trimmed = dateStr.trim();
    if (!DATE_REGEX.test(trimmed)) return false;

    const [yearStr, monthStr, dayStr] = trimmed.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    const daysInMonth = [
        31,
        isLeapYear(year) ? 29 : 28,
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31
    ];

    const maxDays = daysInMonth[month - 1];
    return day >= 1 && day <= maxDays;
}

/**
 * Formats a calendar date (YYYY-MM-DD) to dd/MM/yyyy without UTC timezone conversion.
 * @param {string} dateIso
 * @returns {string} Formatted date string, or empty string if invalid.
 */
export function formatFollowUpDate(dateIso) {
    if (!isValidDateOnly(dateIso)) return "";
    const [year, month, day] = dateIso.trim().split("-");
    return `${day}/${month}/${year}`;
}

/**
 * Returns today's local date as an ISO date-only string (YYYY-MM-DD).
 * @returns {string}
 */
export function getLocalTodayIso() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Filters, deduplicates, and sorts doctor-recommended follow-up records.
 * 
 * Rules:
 * - Only records with state === "DONE"
 * - reExaminationDate must be a valid real calendar date string (YYYY-MM-DD)
 * - reExaminationDate >= todayIso (upcoming and today included)
 * - Unique by recordId
 * - Patient name from record.patientName if present, otherwise profile.fullName
 * - Sorted ascending by reExaminationDate
 * 
 * @param {Array<{ patientProfileId: string, fullName: string, records: Array }>} recordsByProfile
 * @param {string} [todayIso] Default is local today
 * @returns {Array<{ recordId: string, patientProfileId: string, patientName: string, doctorName: string, treatmentPlan: string, reExaminationDate: string }>}
 */
export function getUpcomingFollowUps(recordsByProfile, todayIso) {
    if (!Array.isArray(recordsByProfile)) return [];

    const effectiveToday = isValidDateOnly(todayIso) ? todayIso.trim() : getLocalTodayIso();
    const seenRecordIds = new Set();
    const followUps = [];

    for (const profile of recordsByProfile) {
        if (!profile) continue;
        const profileId = profile.patientProfileId || profile.id || "";
        const profileFullName = (profile.fullName && typeof profile.fullName === "string") ? profile.fullName.trim() : "";
        const records = Array.isArray(profile.records) ? profile.records : [];

        for (const record of records) {
            if (!record) continue;
            if (record.state !== "DONE") continue;

            const examDate = record.reExaminationDate;
            if (!isValidDateOnly(examDate)) continue;

            // Calendar comparison: YYYY-MM-DD strings compare lexicographically correctly
            if (examDate < effectiveToday) continue;

            const recId = record.recordId || record.id;
            if (!recId || seenRecordIds.has(recId)) continue;
            seenRecordIds.add(recId);

            const patientName = (record.patientName && typeof record.patientName === "string" && record.patientName.trim())
                ? record.patientName.trim()
                : profileFullName;

            const doctorName = (record.doctorName && typeof record.doctorName === "string")
                ? record.doctorName.trim()
                : "";

            const treatmentPlan = (record.treatmentPlan && typeof record.treatmentPlan === "string")
                ? record.treatmentPlan.trim()
                : "";

            followUps.push({
                recordId: recId,
                patientProfileId: record.patientProfileId || profileId,
                patientName,
                doctorName,
                treatmentPlan,
                reExaminationDate: examDate
            });
        }
    }

    // Stable sort ascending by date
    followUps.sort((a, b) => a.reExaminationDate.localeCompare(b.reExaminationDate));

    return followUps;
}
