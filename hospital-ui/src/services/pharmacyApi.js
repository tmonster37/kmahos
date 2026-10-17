import axiosInstance from "./AxiosInstance";

export const pharmacyApi = {
    // 1. Quản lý kho dược (Pharmacy Warehouses)
    getWarehouses: () => axiosInstance.get("/api/pharmacy/warehouses"),
    getWarehouseById: (id) => axiosInstance.get(`/api/pharmacy/warehouses/${id}`),
    createWarehouse: (data) => axiosInstance.post("/api/pharmacy/warehouses", data),
    getWarehouseStock: (warehouseId) => axiosInstance.get(`/api/pharmacy/warehouses/${warehouseId}/stock`),

    // 2. Quản lý Lô thuốc & Nhập kho theo lô (Medicine Batches)
    getBatches: (medicineId) =>
        axiosInstance.get("/api/pharmacy/batches", { params: medicineId ? { medicineId } : {} }),
    receiveGoodsBatch: (data) => {
        // Chuẩn hóa tên trường khớp 100% với ReceiveGoodsBatchRequest backend
        const payload = {
            warehouseId: data.warehouseId,
            medicineId: data.medicineId,
            batchNumber: data.batchNumber,
            manufacturingDate: data.manufacturingDate || data.manufactureDate || null,
            expiryDate: data.expiryDate,
            quantity: data.quantity != null ? data.quantity : data.quantityReceived,
            purchasePrice: data.purchasePrice != null ? data.purchasePrice : data.unitImportPrice,
            unitPrice: data.unitPrice != null ? data.unitPrice : data.unitSellingPrice,
            manufacturer: data.manufacturer
        };
        return axiosInstance.post("/api/pharmacy/goods-receipt", payload);
    },

    // 3. Quản lý Điều chuyển kho nội bộ (Stock Transfers)
    getTransfers: (warehouseId) =>
        axiosInstance.get("/api/pharmacy/transfers", { params: warehouseId ? { warehouseId } : {} }),
    createTransfer: (data) => {
        // Chuẩn hóa tên trường khớp CreateStockTransferRequest backend
        const payload = {
            fromWarehouseId: data.fromWarehouseId || data.sourceWarehouseId,
            toWarehouseId: data.toWarehouseId || data.destinationWarehouseId,
            reason: data.reason || data.notes || "Điều chuyển kho nội bộ",
            items: (data.items || []).map(item => ({
                medicineId: item.medicineId,
                batchId: item.batchId,
                quantity: item.quantity != null ? item.quantity : (item.requestedQuantity || 1),
                notes: item.notes || ""
            }))
        };
        return axiosInstance.post("/api/pharmacy/transfers", payload);
    },
    sendTransfer: (id) => axiosInstance.post(`/api/pharmacy/transfers/${id}/send`),
    approveTransfer: (id) => axiosInstance.post(`/api/pharmacy/transfers/${id}/approve`),

    // 4. Cấp phát thuốc theo đơn chuẩn FEFO (Prescription Dispense)
    getPrescriptions: (params) =>
        axiosInstance.get("/api/pharmacy/prescriptions", { params }),
    dispensePrescription: (data) => {
        const pId = data.prescriptionId;
        const payload = {
            warehouseId: data.warehouseId,
            dispenserStaffId: data.dispenserStaffId || null,
            notes: data.notes || "Cấp phát thuốc theo đơn"
        };
        return axiosInstance.post(`/api/pharmacy/prescriptions/${pId}/dispense`, payload);
    },
    getDispenses: (prescriptionId) =>
        axiosInstance.get("/api/pharmacy/dispenses", { params: prescriptionId ? { prescriptionId } : {} }),

    // 5. Cảnh báo dược (Alerts)
    getExpiringAlerts: (days) =>
        axiosInstance.get("/api/pharmacy/alerts/near-expiry", { params: days ? { days } : {} }),
    getLowStockAlerts: (warehouseId) =>
        axiosInstance.get("/api/pharmacy/alerts/low-stock", { params: warehouseId ? { warehouseId } : {} }),
};

export default pharmacyApi;
