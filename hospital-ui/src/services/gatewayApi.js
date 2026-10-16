import axiosInstance from "./AxiosInstance";

export const gatewayApi = {
    // 1. Quản lý EHR Concept Dictionary (OpenMRS & FHIR)
    getConcepts: (departmentId) =>
        axiosInstance.get("/api/clinical/concepts", { params: departmentId ? { departmentId } : {} }),
    createConcept: (data) => axiosInstance.post("/api/clinical/concepts", data),
    searchObservations: (params) => axiosInstance.get("/api/ehr/observations/search", { params }),
    searchEncounters: (params) => axiosInstance.get("/api/ehr/encounters/search", { params }),
    migrateAllToEhr: () => axiosInstance.post("/api/ehr/migrate"),

    // 2. RIS / PACS Gateway (Modality Worklist & Webhook)
    getModalityWorklist: (modality) =>
        axiosInstance.get("/api/gateway/ris/worklist", { params: modality ? { modality } : {} }),
    sendPacsCallback: (data) => axiosInstance.post("/api/gateway/pacs/callback", data),

    // 3. LIS Gateway (Automated Machine Result Webhook)
    sendLisMachineResults: (data) => axiosInstance.post("/api/gateway/lis/results", data),
};

export default gatewayApi;
