import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Typography,
    IconButton,
    Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Alert,
    Tooltip,
    Chip,
    Paper,
    Stack,
    Divider,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import MedicationIcon from "@mui/icons-material/Medication";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import axiosInstance from "../../services/AxiosInstance";
import { formatCurrency } from "../../utils/formatters";

// Danh mục dược phẩm chuẩn bệnh viện (hỗ trợ offline/fallback)
export const FALLBACK_MEDICINES = [
    { medicineId: 1, medicineName: "Paracetamol 500mg", activeIngredient: "Paracetamol", unit: "Viên", price: 1500, stockQuantity: 500 },
    { medicineId: 2, medicineName: "Amoxicillin 500mg (Kháng sinh Penicillin)", activeIngredient: "Amoxicillin", unit: "Viên", price: 3500, stockQuantity: 300 },
    { medicineId: 3, medicineName: "Decolgen Forte (Cảm cúm)", activeIngredient: "Paracetamol + Phenylephrine", unit: "Viên", price: 2500, stockQuantity: 200 },
    { medicineId: 4, medicineName: "Berberin 100mg (Tiêu hóa)", activeIngredient: "Berberin", unit: "Viên", price: 1000, stockQuantity: 400 },
    { medicineId: 5, medicineName: "Gói bù nước Oresol 27.9g", activeIngredient: "Glucose + Điện giải", unit: "Gói", price: 6000, stockQuantity: 150 },
    { medicineId: 6, medicineName: "Vitamin C 500mg (Tăng đề kháng)", activeIngredient: "Ascorbic acid", unit: "Viên", price: 2000, stockQuantity: 300 },
    { medicineId: 7, medicineName: "Omeprazol 20mg (Dạ dày)", activeIngredient: "Omeprazol", unit: "Viên", price: 4000, stockQuantity: 250 },
    { medicineId: 8, medicineName: "Phosphalugel (Gel chữ P dạ dày)", activeIngredient: "Aluminium phosphate", unit: "Gói", price: 5500, stockQuantity: 200 },
    { medicineId: 9, medicineName: "Alpha Choay (Kháng viêm phù nề)", activeIngredient: "Chymotrypsin", unit: "Viên", price: 3000, stockQuantity: 350 },
    { medicineId: 10, medicineName: "Amlodipin 5mg (Hạ huyết áp)", activeIngredient: "Amlodipin", unit: "Viên", price: 2500, stockQuantity: 400 },
    { medicineId: 11, medicineName: "Vitamin 3B (B1+B6+B12)", activeIngredient: "Thiamin + Pyridoxin + Cyanocobalamin", unit: "Viên", price: 2200, stockQuantity: 300 },
    { medicineId: 12, medicineName: "Azithromycin 500mg (Kháng sinh Macrolid)", activeIngredient: "Azithromycin", unit: "Viên", price: 12000, stockQuantity: 180 },
    { medicineId: 13, medicineName: "Cefuroxim 500mg (Kháng sinh Cephalosporin)", activeIngredient: "Cefuroxim", unit: "Viên", price: 8500, stockQuantity: 220 },
    { medicineId: 14, medicineName: "Men vi sinh Enterogermina", activeIngredient: "Bacillus clausii", unit: "Ống", price: 9000, stockQuantity: 160 }
];

// Danh mục Đơn thuốc mẫu chuẩn lâm sàng (Prescription Templates)
export const PRESCRIPTION_TEMPLATES = [
    {
        id: "tpl_cold",
        name: "Cảm cúm & Viêm mũi họng cấp (J00 / J02.9)",
        icon: "🤧",
        category: "Hô hấp",
        description: "Hạ sốt, giảm xuất tiết mũi họng, tăng cường sức đề kháng",
        doctorNotes: "Uống thuốc sau khi ăn no. Uống đủ 2 - 2.5 lít nước ấm mỗi ngày, súc họng bằng nước muối sinh lý 3-4 lần/ngày. Nghỉ ngơi nhiều, tái khám sau 3 ngày nếu sốt cao liên tục không hạ.",
        items: [
            { query: "Paracetamol", quantity: 10, morningAmount: 1, noonAmount: 0, afternoonAmount: 1, eveningAmount: 0, dosageInstruction: "Uống 1 viên sau ăn sáng và chiều (hoặc khi sốt > 38.5°C cách 4-6 tiếng)" },
            { query: "Decolgen", quantity: 10, morningAmount: 1, noonAmount: 0, afternoonAmount: 0, eveningAmount: 1, dosageInstruction: "Uống 1 viên sau ăn sáng và tối trước khi ngủ để giảm sổ mũi, nghẹt mũi" },
            { query: "Vitamin C", quantity: 10, morningAmount: 1, noonAmount: 0, afternoonAmount: 0, eveningAmount: 0, dosageInstruction: "Uống 1 viên sau khi ăn sáng no nhằm nâng cao thể trạng" },
        ]
    },
    {
        id: "tpl_bronchitis",
        name: "Viêm phế quản cấp / Nhiễm khuẩn hô hấp (J20.9)",
        icon: "🫁",
        category: "Hô hấp",
        description: "Kháng sinh đường uống, chống viêm giảm phù nề, hạ sốt",
        doctorNotes: "Uống kháng sinh đủ 7 ngày liên tục, tuyệt đối không được tự ý giảm liều hoặc bỏ thuốc khi thấy đỡ. Uống nhiều nước, giữ ấm vùng cổ ngực.",
        items: [
            { query: "Amoxicillin", fallbackQuery: "Azithromycin", quantity: 14, morningAmount: 1, noonAmount: 0, afternoonAmount: 1, eveningAmount: 0, dosageInstruction: "Uống 1 viên sau ăn sáng và tối (cách 12 giờ). Không bẻ vụn thuốc." },
            { query: "Alpha Choay", quantity: 14, morningAmount: 2, noonAmount: 0, afternoonAmount: 0, eveningAmount: 2, dosageInstruction: "Ngậm dưới lưỡi 2 viên sau ăn sáng và tối để giảm viêm sưng" },
            { query: "Paracetamol", quantity: 10, morningAmount: 1, noonAmount: 0, afternoonAmount: 1, eveningAmount: 0, dosageInstruction: "Uống 1 viên sau ăn khi sốt hoặc đau rát họng" },
            { query: "Vitamin C", quantity: 10, morningAmount: 1, noonAmount: 0, afternoonAmount: 0, eveningAmount: 0, dosageInstruction: "Uống 1 viên sau khi ăn sáng" },
        ]
    },
    {
        id: "tpl_gerd",
        name: "Viêm dạ dày cấp & Trào ngược GERD (K29.7 / K21.9)",
        icon: "🛡️",
        category: "Tiêu hóa",
        description: "Giảm tiết acid dạ dày, bảo vệ niêm mạc, chống trào ngược",
        doctorNotes: "Uống thuốc trước bữa ăn sáng và tối 30 phút. Kiêng bia rượu, cà phê, thuốc lá, đồ chua cay, dầu mỡ. Không ăn quá no, không nằm ngay sau khi ăn.",
        items: [
            { query: "Omeprazol", quantity: 14, morningAmount: 1, noonAmount: 0, afternoonAmount: 0, eveningAmount: 1, dosageInstruction: "Uống 1 viên trước bữa ăn sáng và tối 30 phút" },
            { query: "Phosphalugel", quantity: 14, morningAmount: 1, noonAmount: 0, afternoonAmount: 1, eveningAmount: 0, dosageInstruction: "Uống 1 gói khi đau rát dạ dày hoặc sau ăn 1-2 tiếng" },
        ]
    },
    {
        id: "tpl_diarrhea",
        name: "Rối loạn tiêu hóa / Tiêu chảy cấp (A09)",
        icon: "🍵",
        category: "Tiêu hóa",
        description: "Kháng khuẩn đường ruột tự nhiên, bù nước và điện giải",
        doctorNotes: "Pha đúng 1 gói Oresol với 1000ml nước đun sôi để nguội, uống rải rác trong ngày. Ăn cháo loãng với muối hoặc thịt nạc, kiêng dầu mỡ, sữa tươi.",
        items: [
            { query: "Berberin", quantity: 20, morningAmount: 2, noonAmount: 0, afternoonAmount: 2, eveningAmount: 0, dosageInstruction: "Uống 2 viên sau ăn sáng và chiều" },
            { query: "Oresol", quantity: 5, morningAmount: 1, noonAmount: 1, afternoonAmount: 1, eveningAmount: 0, dosageInstruction: "Pha 1 gói với 1 lít nước sôi để nguội, uống rải rác khi khát/sau đi tiêu" },
        ]
    },
    {
        id: "tpl_arthritis",
        name: "Đau mỏi cơ xương khớp / Thoái hóa khớp (M54.5)",
        icon: "🦴",
        category: "Cơ xương khớp",
        description: "Giảm đau nhức, chống viêm phù nề, dưỡng thần kinh cơ",
        doctorNotes: "Uống thuốc sau ăn no. Tránh mang vác vật nặng, không đứng/ngồi một tư thế quá lâu, tập các bài thể dục nhẹ nhàng khớp cột sống.",
        items: [
            { query: "Paracetamol", quantity: 10, morningAmount: 1, noonAmount: 0, afternoonAmount: 1, eveningAmount: 0, dosageInstruction: "Uống 1 viên sau ăn sáng và chiều khi đau nhức" },
            { query: "Alpha Choay", quantity: 14, morningAmount: 2, noonAmount: 0, afternoonAmount: 0, eveningAmount: 2, dosageInstruction: "Ngậm dưới lưỡi 2 viên sau ăn sáng và tối" },
            { query: "Vitamin 3B", quantity: 20, morningAmount: 1, noonAmount: 0, afternoonAmount: 1, eveningAmount: 0, dosageInstruction: "Uống 1 viên sau ăn sáng và chiều bổ thần kinh khớp" },
        ]
    },
    {
        id: "tpl_hypertension",
        name: "Tăng huyết áp nguyên phát (I10)",
        icon: "❤️",
        category: "Tim mạch",
        description: "Kiểm soát chỉ số huyết áp hằng ngày, phòng ngừa tai biến",
        doctorNotes: "Uống thuốc huyết áp đúng giờ cố định mỗi sáng lúc 8h00. Đo và ghi sổ theo dõi huyết áp sáng - chiều. Ăn nhạt (giảm muối), kiêng mỡ động vật, không thức khuya.",
        items: [
            { query: "Amlodipin", quantity: 30, morningAmount: 1, noonAmount: 0, afternoonAmount: 0, eveningAmount: 0, dosageInstruction: "Uống 1 viên vào 8h00 sáng mỗi ngày cố định" },
        ]
    }
];

// Hàm kiểm tra dị ứng giữa thuốc và tiền sử dị ứng của bệnh nhân
export const checkDrugAllergy = (medicine, patientAllergies) => {
    if (!medicine || !patientAllergies) return null;
    const cleanAllergy = String(patientAllergies).toLowerCase().trim();
    if (
        cleanAllergy === "" ||
        cleanAllergy.includes("chưa ghi nhận") ||
        cleanAllergy.includes("không có") ||
        cleanAllergy.includes("không dị ứng") ||
        cleanAllergy === "none"
    ) {
        return null;
    }

    const medName = (medicine.medicineName || "").toLowerCase();
    const activeIng = (medicine.activeIngredient || "").toLowerCase();

    // Các bộ luật phản ứng chéo dị ứng kinh điển trong dược lâm sàng
    const allergyRules = [
        {
            keywords: ["penicillin", "pénicilline", "amoxicillin", "ampicillin", "beta-lactam", "betalactam"],
            targets: ["penicillin", "amoxicillin", "ampicillin", "augmentin", "clamoxyl"],
            warningMsg: "Bệnh nhân có tiền sử dị ứng kháng sinh nhóm Penicillin / Beta-lactam! Thuốc này có nguy cơ gây SỐC PHẢN VỆ nguy hiểm tính mạng!"
        },
        {
            keywords: ["cephalosporin", "cefa", "cefuroxim", "cefixim", "ceftriaxon"],
            targets: ["cephalosporin", "cefuroxim", "cefixim", "ceftriaxon", "cefaclor", "cefotaxim"],
            warningMsg: "Bệnh nhân có tiền sử dị ứng kháng sinh nhóm Cephalosporin! Chống chỉ định dùng thuốc này!"
        },
        {
            keywords: ["aspirin", "nsaid", "ibuprofen", "diclofenac", "meloxicam"],
            targets: ["aspirin", "ibuprofen", "diclofenac", "meloxicam", "celecoxib", "nsaid"],
            warningMsg: "Bệnh nhân dị ứng nhóm giảm đau chống viêm Non-steroid (Aspirin/NSAID)!"
        },
        {
            keywords: ["paracetamol", "acetaminophen", "panadol", "efferalgan"],
            targets: ["paracetamol", "acetaminophen", "panadol", "efferalgan", "decolgen"],
            warningMsg: "Bệnh nhân dị ứng Paracetamol / Acetaminophen! Nguy cơ phát ban da hoặc tổn thương gan!"
        },
        {
            keywords: ["sulfonamid", "sulfa", "bactrim", "cotrimoxazol"],
            targets: ["sulfonamid", "sulfa", "bactrim", "cotrimoxazol", "sulfamethoxazol"],
            warningMsg: "Bệnh nhân dị ứng kháng sinh nhóm Sulfamid / Bactrim!"
        }
    ];

    // 1. Kiểm tra đối chiếu theo nhóm dược lý
    for (const rule of allergyRules) {
        const matchesAllergy = rule.keywords.some((kw) => cleanAllergy.includes(kw));
        if (matchesAllergy) {
            const matchesDrug = rule.targets.some((tg) => medName.includes(tg) || activeIng.includes(tg));
            if (matchesDrug) {
                return {
                    level: "CRITICAL",
                    reason: rule.warningMsg,
                    matchedTerm: rule.keywords.find((kw) => cleanAllergy.includes(kw))
                };
            }
        }
    }

    // 2. Kiểm tra chuỗi trực tiếp từng cụm từ dị ứng
    const allergyWords = cleanAllergy
        .split(/[,;+\n/]/)
        .map((w) => w.replace(/dị ứng|thuốc|tiền sử/gi, "").trim())
        .filter((w) => w.length >= 3);

    for (const word of allergyWords) {
        if (medName.includes(word) || activeIng.includes(word)) {
            return {
                level: "HIGH",
                reason: `Thuốc có hoạt chất/tên trùng với tiền sử dị ứng [${word.toUpperCase()}] của bệnh nhân!`,
                matchedTerm: word
            };
        }
    }

    return null;
};

export default function PrescriptionModal({ open, onClose, recordId, onPrescribed, patientAllergies = "" }) {
    const [medicines, setMedicines] = useState([]);
    const [items, setItems] = useState([]);
    const [doctorNotes, setDoctorNotes] = useState("Uống thuốc đúng giờ sau khi ăn no. Uống nhiều nước và tái khám đúng hẹn.");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [interactions, setInteractions] = useState([]);
    const [allergyAlerts, setAllergyAlerts] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [templateNotice, setTemplateNotice] = useState("");

    useEffect(() => {
        if (open) {
            fetchMedicines();
            setItems([
                {
                    medicineId: 1,
                    quantity: 10,
                    morningAmount: 1,
                    noonAmount: 0,
                    afternoonAmount: 1,
                    eveningAmount: 0,
                    dosageInstruction: "Uống 1 viên sau ăn sáng và chiều",
                },
            ]);
            setError("");
            setSelectedTemplateId("");
            setTemplateNotice("");
        }
    }, [open]);

    // Kiểm tra tương tác thuốc và dị ứng
    useEffect(() => {
        // 1. Kiểm tra dị ứng thuốc với tiền sử bệnh nhân
        const aAlerts = [];
        items.forEach((item) => {
            const med = medicines.find((m) => m.medicineId === Number(item.medicineId));
            if (med) {
                const allergyCheck = checkDrugAllergy(med, patientAllergies);
                if (allergyCheck) {
                    aAlerts.push({
                        medicineName: med.medicineName,
                        level: allergyCheck.level,
                        reason: allergyCheck.reason,
                    });
                }
            }
        });
        setAllergyAlerts(aAlerts);

        // 2. Kiểm tra trùng lặp hoạt chất / tương tác thuốc
        if (items.length <= 1) {
            setInteractions([]);
            return;
        }

        const alerts = [];
        const activeIngredientsMap = {};

        items.forEach((item) => {
            const med = medicines.find((m) => m.medicineId === Number(item.medicineId));
            if (med && med.activeIngredient) {
                const ingredients = med.activeIngredient.split("+").map((s) => s.trim().toLowerCase());
                ingredients.forEach((ing) => {
                    if (activeIngredientsMap[ing]) {
                        alerts.push({
                            type: "warning",
                            message: `Cảnh báo trùng lặp hoạt chất [${ing.toUpperCase()}]: Thuốc "${med.medicineName}" và "${activeIngredientsMap[ing]}" đều chứa hoạt chất này. Chú ý nguy cơ quá liều!`,
                        });
                    } else {
                        activeIngredientsMap[ing] = med.medicineName;
                    }
                });
            }
        });

        setInteractions(alerts);
    }, [items, medicines, patientAllergies]);

    const fetchMedicines = async () => {
        try {
            const res = await axiosInstance.get("/api/clinical/medicines");
            const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            if (data && data.length > 0) {
                setMedicines(data);
            } else {
                setMedicines(FALLBACK_MEDICINES);
            }
        } catch (err) {
            console.error("Lỗi lấy danh mục thuốc:", err);
            setMedicines(FALLBACK_MEDICINES);
        }
    };

    // Áp dụng toa thuốc mẫu
    const handleApplyTemplate = (template) => {
        if (!template) return;
        setSelectedTemplateId(template.id);

        const newItems = [];
        const allergyWarnings = [];

        template.items.forEach((tItem) => {
            // Tìm thuốc trong kho phù hợp nhất
            let matchedMed = medicines.find((m) =>
                m.medicineName.toLowerCase().includes(tItem.query.toLowerCase()) ||
                (m.activeIngredient && m.activeIngredient.toLowerCase().includes(tItem.query.toLowerCase()))
            );

            // Kiểm tra xem thuốc này có bị dị ứng không
            if (matchedMed && patientAllergies) {
                const check = checkDrugAllergy(matchedMed, patientAllergies);
                if (check) {
                    allergyWarnings.push(`Thuốc "${matchedMed.medicineName}" trùng với dị ứng [${patientAllergies}]`);
                    // Thử tìm thuốc thay thế (nếu có fallbackQuery)
                    if (tItem.fallbackQuery) {
                        const fallbackMed = medicines.find((m) =>
                            m.medicineName.toLowerCase().includes(tItem.fallbackQuery.toLowerCase())
                        );
                        if (fallbackMed && !checkDrugAllergy(fallbackMed, patientAllergies)) {
                            matchedMed = fallbackMed;
                        }
                    }
                }
            }

            if (!matchedMed && medicines.length > 0) {
                matchedMed = medicines[0];
            }

            if (matchedMed) {
                newItems.push({
                    medicineId: matchedMed.medicineId,
                    quantity: tItem.quantity,
                    morningAmount: tItem.morningAmount,
                    noonAmount: tItem.noonAmount,
                    afternoonAmount: tItem.afternoonAmount,
                    eveningAmount: tItem.eveningAmount,
                    dosageInstruction: tItem.dosageInstruction,
                });
            }
        });

        if (newItems.length > 0) {
            setItems(newItems);
            setDoctorNotes(template.doctorNotes);

            if (allergyWarnings.length > 0) {
                setTemplateNotice(`⚠️ Đã nạp toa mẫu "${template.name}". LƯU Ý: ${allergyWarnings.join("; ")}! Hệ thống đã cảnh báo đỏ để Bác sĩ xem xét.`);
            } else {
                setTemplateNotice(`✨ Đã nạp thành công đơn thuốc mẫu: "${template.name}"`);
            }
        }
    };

    const handleAddItem = () => {
        const defaultMed = medicines[0] || { medicineId: 1 };
        setItems([
            ...items,
            {
                medicineId: defaultMed.medicineId,
                quantity: 10,
                morningAmount: 1,
                noonAmount: 0,
                afternoonAmount: 1,
                eveningAmount: 0,
                dosageInstruction: "Uống sau ăn",
            },
        ]);
    };

    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => {
            const med = medicines.find((m) => m.medicineId === Number(item.medicineId));
            return sum + (med ? Number(med.price || 0) * Number(item.quantity || 0) : 0);
        }, 0);
    };

    const handleSubmit = async () => {
        if (items.length === 0) {
            setError("Đơn thuốc phải có ít nhất 1 loại thuốc!");
            return;
        }

        // Cảnh báo nếu đang kê thuốc dị ứng
        if (allergyAlerts.length > 0) {
            const confirmAllergy = window.confirm(
                `🚨 CẢNH BÁO NGUY HIỂM:\nĐơn thuốc đang có ${allergyAlerts.length} thuốc có nguy cơ gây DỊ ỨNG với bệnh nhân (${patientAllergies})!\n\nBạn có CHẮC CHẮN vẫn muốn xuất đơn thuốc này không?`
            );
            if (!confirmAllergy) return;
        }

        // Validate tồn kho thuốc
        for (const item of items) {
            const med = medicines.find((m) => m.medicineId === Number(item.medicineId));
            if (!med) continue;

            const requestedQty = Number(item.quantity);
            const stockQty = Number(med.stockQuantity || 0);

            if (isNaN(requestedQty) || requestedQty <= 0) {
                setError(`Số lượng thuốc [${med.medicineName}] phải lớn hơn 0!`);
                return;
            }

            if (requestedQty > stockQty) {
                setError(`Thuốc [${med.medicineName}] chỉ còn tồn kho ${stockQty} ${med.unit || "viên"}, không đủ số lượng ${requestedQty} yêu cầu!`);
                return;
            }
        }

        setLoading(true);
        setError("");
        try {
            await axiosInstance.post(`/api/clinical/records/${recordId}/prescriptions`, {
                doctorNotes,
                items: items.map((it) => ({
                    medicineId: Number(it.medicineId),
                    quantity: Number(it.quantity),
                    morningAmount: Number(it.morningAmount || 0),
                    noonAmount: Number(it.noonAmount || 0),
                    afternoonAmount: Number(it.afternoonAmount || 0),
                    eveningAmount: Number(it.eveningAmount || 0),
                    dosageInstruction: it.dosageInstruction,
                })),
            });
            if (onPrescribed) onPrescribed();
            onClose();
        } catch (err) {
            setError(err.message || "Lỗi kê đơn thuốc!");
        } finally {
            setLoading(false);
        }
    };

    // Kiểm tra xem bệnh nhân có ghi nhận dị ứng không
    const hasKnownAllergy = patientAllergies &&
        !patientAllergies.toLowerCase().includes("chưa ghi nhận") &&
        !patientAllergies.toLowerCase().includes("không có") &&
        !patientAllergies.toLowerCase().includes("không dị ứng") &&
        patientAllergies.trim() !== "";

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ pb: 1.5, borderBottom: "1px solid #E2E8F0" }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 2.5,
                                bgcolor: "success.light",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "success.dark",
                            }}
                        >
                            <MedicationIcon sx={{ fontSize: 28 }} />
                        </Box>
                        <Box>
                            <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="h6" fontWeight="bold" color="success.dark">
                                    Kê Đơn Thuốc Điện Tử & Toa Thuốc Mẫu
                                </Typography>
                                <Chip
                                    label="Dược Lâm Sàng BV"
                                    size="small"
                                    color="success"
                                    sx={{ fontWeight: 700, fontSize: "0.68rem", height: 20 }}
                                />
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                                Tự động kiểm tra tồn kho Dược, đối chiếu dị ứng thuốc và tương tác hoạt chất
                            </Typography>
                        </Box>
                    </Box>

                    {/* Badge Dị ứng bệnh nhân hiển thị ngay trên Header */}
                    <Box>
                        {hasKnownAllergy ? (
                            <Chip
                                icon={<ReportProblemIcon sx={{ color: "#ffffff !important" }} />}
                                label={`Dị ứng: ${patientAllergies}`}
                                size="small"
                                sx={{
                                    bgcolor: "#ef4444",
                                    color: "#ffffff",
                                    fontWeight: 800,
                                    fontSize: "0.75rem",
                                    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.35)",
                                    py: 1.8
                                }}
                            />
                        ) : (
                            <Chip
                                label="Chưa ghi nhận dị ứng thuốc"
                                size="small"
                                sx={{ bgcolor: "#f1f5f9", color: "#64748b", fontWeight: 600, fontSize: "0.72rem" }}
                            />
                        )}
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 2.5 }}>
                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                {/* 1. KHU VỰC CẢNH BÁO AN TOÀN DỊ ỨNG NỔI BẬT */}
                {allergyAlerts.length > 0 && (
                    <Alert
                        severity="error"
                        icon={<WarningAmberIcon sx={{ fontSize: 30 }} />}
                        sx={{
                            mb: 2,
                            borderRadius: 2.5,
                            border: "2px solid #ef4444",
                            bgcolor: "#fef2f2",
                            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.15)",
                            "& .MuiAlert-message": { width: "100%" }
                        }}
                    >
                        <Box>
                            <Typography variant="subtitle2" fontWeight={900} sx={{ color: "#991b1b", textTransform: "uppercase" }}>
                                🚨 CẢNH BÁO NGUY HIỂM: PHÁT HIỆN THUỐC TRÙNG TIỀN SỬ DỊ ỨNG CỦA BỆNH NHÂN!
                            </Typography>
                            <Typography variant="body2" sx={{ color: "#b91c1c", mt: 0.5 }}>
                                Tiền sử dị ứng ghi nhận: <b>"{patientAllergies}"</b>
                            </Typography>
                            {allergyAlerts.map((al, idx) => (
                                <Box key={idx} sx={{ mt: 0.8, p: 0.8, bgcolor: "#fee2e2", borderRadius: 1.5, border: "1px dashed #f87171" }}>
                                    <Typography variant="body2" fontWeight={800} color="#7f1d1d">
                                        • {al.medicineName}:
                                    </Typography>
                                    <Typography variant="caption" color="#991b1b" sx={{ display: "block" }}>
                                        {al.reason}
                                    </Typography>
                                </Box>
                            ))}
                            <Typography variant="caption" sx={{ color: "#991b1b", fontStyle: "italic", mt: 1, display: "block" }}>
                                * Khuyến nghị Bác sĩ đổi sang nhóm thuốc khác hoặc xóa thuốc bị dị ứng khỏi danh sách kê đơn!
                            </Typography>
                        </Box>
                    </Alert>
                )}

                {/* Cảnh báo tương tác thuốc trùng lặp hoạt chất */}
                {interactions.map((alert, idx) => (
                    <Alert
                        key={idx}
                        severity={alert.type}
                        icon={<WarningAmberIcon />}
                        sx={{ mb: 2, borderRadius: 2, fontWeight: 500 }}
                    >
                        {alert.message}
                    </Alert>
                ))}

                {/* Thông báo nạp template thành công */}
                {templateNotice && (
                    <Alert
                        severity={templateNotice.includes("LƯU Ý") ? "warning" : "info"}
                        sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}
                        onClose={() => setTemplateNotice("")}
                    >
                        {templateNotice}
                    </Alert>
                )}

                {/* 2. THANH KÊ ĐƠN THUỐC MẪU (PRESCRIPTION TEMPLATES TOOLBAR) */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 1.8,
                        mb: 2.5,
                        borderRadius: 2.5,
                        bgcolor: "#f8fafc",
                        border: "1px solid #cbd5e1"
                    }}
                >
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1.2}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <AutoAwesomeIcon sx={{ color: "#0284c7", fontSize: 20 }} />
                            <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#0f172a" }}>
                                Kê Đơn Nhanh Theo Phác Đồ Mẫu (Prescription Templates):
                            </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: "#64748b" }}>
                            Nhấp chọn 1 mẫu để tự động điền danh mục thuốc, cữ uống và lời dặn chuẩn
                        </Typography>
                    </Box>

                    {/* Quick Template Chips */}
                    <Box display="flex" flexWrap="wrap" gap={0.8}>
                        {PRESCRIPTION_TEMPLATES.map((tpl) => {
                            const isSelected = selectedTemplateId === tpl.id;
                            return (
                                <Tooltip key={tpl.id} title={`${tpl.description} - Lời dặn: ${tpl.doctorNotes.slice(0, 60)}...`}>
                                    <Chip
                                        icon={<span style={{ fontSize: "1rem" }}>{tpl.icon}</span>}
                                        label={tpl.name}
                                        onClick={() => handleApplyTemplate(tpl)}
                                        variant={isSelected ? "filled" : "outlined"}
                                        color={isSelected ? "primary" : "default"}
                                        sx={{
                                            fontWeight: isSelected ? 800 : 600,
                                            fontSize: "0.78rem",
                                            borderRadius: 2,
                                            py: 2,
                                            px: 0.5,
                                            cursor: "pointer",
                                            bgcolor: isSelected ? "#0284c7" : "#ffffff",
                                            borderColor: isSelected ? "#0284c7" : "#cbd5e1",
                                            boxShadow: isSelected ? "0 2px 8px rgba(2, 132, 199, 0.25)" : "none",
                                            "&:hover": {
                                                bgcolor: isSelected ? "#0369a1" : "#f1f5f9",
                                                borderColor: "#0284c7"
                                            }
                                        }}
                                    />
                                </Tooltip>
                            );
                        })}
                    </Box>
                </Paper>

                {/* 3. DANH SÁCH THUỐC KÊ TOA */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                            Danh sách thuốc kê toa ({items.length}):
                        </Typography>
                        {items.length > 0 && (
                            <Typography variant="caption" color="text.secondary">
                                (Đã tính tự động liều sáng - trưa - chiều - tối và đối chiếu tồn kho)
                            </Typography>
                        )}
                    </Box>
                    <Button
                        startIcon={<AddCircleOutlineIcon />}
                        variant="contained"
                        size="small"
                        color="success"
                        onClick={handleAddItem}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                    >
                        Thêm Thuốc Mới
                    </Button>
                </Box>

                <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: "hidden", mb: 2.5, borderColor: "#cbd5e1" }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: "#F1F5F9" }}>
                            <TableRow>
                                <TableCell width={30}>#</TableCell>
                                <TableCell width={330}><b>Tên thuốc & Hoạt chất</b></TableCell>
                                <TableCell width={130} align="center"><b>Số lượng & Tồn</b></TableCell>
                                <TableCell width={220} align="center"><b>Cữ uống (S - T - C - T)</b></TableCell>
                                <TableCell><b>Cách dùng / Dặn dò cụ thể</b></TableCell>
                                <TableCell width={130} align="right"><b>Thành tiền</b></TableCell>
                                <TableCell width={45} align="center"></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((item, idx) => {
                                const selectedMed = medicines.find((m) => m.medicineId === Number(item.medicineId));
                                const itemTotal = selectedMed ? Number(selectedMed.price) * Number(item.quantity || 0) : 0;
                                const isOutOfStock = selectedMed && Number(item.quantity) > Number(selectedMed.stockQuantity);
                                const itemAllergy = checkDrugAllergy(selectedMed, patientAllergies);

                                return (
                                    <TableRow
                                        key={idx}
                                        hover
                                        sx={{
                                            bgcolor: itemAllergy
                                                ? "rgba(239, 68, 68, 0.12)"
                                                : (isOutOfStock ? "rgba(245, 158, 11, 0.1)" : "inherit"),
                                            borderLeft: itemAllergy ? "4px solid #ef4444" : "none"
                                        }}
                                    >
                                        <TableCell sx={{ fontWeight: 700, color: "#64748b" }}>{idx + 1}</TableCell>
                                        <TableCell>
                                            <TextField
                                                select
                                                fullWidth
                                                size="small"
                                                value={item.medicineId}
                                                onChange={(e) => handleItemChange(idx, "medicineId", e.target.value)}
                                                SelectProps={{ native: true }}
                                                sx={{
                                                    "& .MuiOutlinedInput-root": {
                                                        borderColor: itemAllergy ? "#ef4444" : undefined
                                                    }
                                                }}
                                            >
                                                {medicines.map((m) => (
                                                    <option key={m.medicineId} value={m.medicineId}>
                                                        {m.medicineName} ({formatCurrency(m.price)}/{m.unit || "đv"})
                                                    </option>
                                                ))}
                                            </TextField>
                                            <Box display="flex" gap={1} alignItems="center" mt={0.5} flexWrap="wrap">
                                                {selectedMed && (
                                                    <Chip
                                                        label={`Kho: ${selectedMed.stockQuantity} ${selectedMed.unit || "đv"}`}
                                                        size="small"
                                                        color={selectedMed.stockQuantity > 20 ? "default" : "warning"}
                                                        sx={{ fontSize: "0.7rem", height: 20, fontWeight: 600 }}
                                                    />
                                                )}
                                                {selectedMed && selectedMed.activeIngredient && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                                                        HC: {selectedMed.activeIngredient}
                                                    </Typography>
                                                )}
                                                {/* Badge Dị ứng ngay dưới thuốc */}
                                                {itemAllergy && (
                                                    <Tooltip title={itemAllergy.reason}>
                                                        <Chip
                                                            icon={<ReportProblemIcon sx={{ fontSize: "13px !important", color: "#ffffff !important" }} />}
                                                            label="🚨 CẢNH BÁO DỊ ỨNG!"
                                                            size="small"
                                                            sx={{
                                                                bgcolor: "#ef4444",
                                                                color: "#ffffff",
                                                                fontSize: "0.68rem",
                                                                height: 20,
                                                                fontWeight: 900
                                                            }}
                                                        />
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <TextField
                                                type="number"
                                                size="small"
                                                error={isOutOfStock}
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                                                inputProps={{ min: 1, max: selectedMed?.stockQuantity || 999, style: { textAlign: "center", fontWeight: "bold" } }}
                                                sx={{ width: 85 }}
                                            />
                                            {isOutOfStock && (
                                                <Typography variant="caption" color="error" display="block" fontWeight="bold">
                                                    Quá tồn kho!
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box display="flex" gap={0.5} justifyContent="center">
                                                <Tooltip title="Sáng">
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={item.morningAmount}
                                                        onChange={(e) => handleItemChange(idx, "morningAmount", e.target.value)}
                                                        inputProps={{ min: 0, style: { textAlign: "center", width: 28, padding: 4, fontWeight: "bold" } }}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Trưa">
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={item.noonAmount}
                                                        onChange={(e) => handleItemChange(idx, "noonAmount", e.target.value)}
                                                        inputProps={{ min: 0, style: { textAlign: "center", width: 28, padding: 4, fontWeight: "bold" } }}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Chiều">
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={item.afternoonAmount}
                                                        onChange={(e) => handleItemChange(idx, "afternoonAmount", e.target.value)}
                                                        inputProps={{ min: 0, style: { textAlign: "center", width: 28, padding: 4, fontWeight: "bold" } }}
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Tối">
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={item.eveningAmount}
                                                        onChange={(e) => handleItemChange(idx, "eveningAmount", e.target.value)}
                                                        inputProps={{ min: 0, style: { textAlign: "center", width: 28, padding: 4, fontWeight: "bold" } }}
                                                    />
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                value={item.dosageInstruction}
                                                onChange={(e) => handleItemChange(idx, "dosageInstruction", e.target.value)}
                                                placeholder="VD: Uống sau ăn 30 phút..."
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Typography variant="body2" fontWeight="bold" color="primary">
                                                {formatCurrency(itemTotal)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Paper>

                <Grid container spacing={2}>
                    <Grid item xs={12} md={7}>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Lời dặn của Bác sĩ / Lưu ý chế độ sinh hoạt & kiêng cữ"
                            value={doctorNotes}
                            onChange={(e) => setDoctorNotes(e.target.value)}
                            placeholder="Nhập hướng dẫn dùng thuốc, chế độ ăn uống, kiêng cữ..."
                        />
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Paper sx={{ p: 2, bgcolor: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 2.5 }}>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="body2" color="text.secondary">Tổng số loại thuốc:</Typography>
                                <Typography variant="body2" fontWeight="bold">{items.length} loại</Typography>
                            </Box>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="body2" color="text.secondary">Tổng số lượng viên/gói:</Typography>
                                <Typography variant="body2" fontWeight="bold">
                                    {items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)}
                                </Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle1" fontWeight="bold" color="success.dark">
                                    Tổng tiền đơn thuốc:
                                </Typography>
                                <Typography variant="h6" fontWeight="bold" color="success.main">
                                    {formatCurrency(calculateTotal())}
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #E2E8F0" }}>
                <Button onClick={onClose} variant="outlined" color="inherit" sx={{ borderRadius: 2, textTransform: "none" }}>
                    Hủy bỏ
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="success"
                    disabled={loading}
                    startIcon={loading ? null : <CheckCircleOutlineIcon />}
                    sx={{ borderRadius: 2, textTransform: "none", fontWeight: 800, px: 3 }}
                >
                    {loading ? "Đang xử lý xuất đơn..." : "Xác Nhận & Xuất Đơn Thuốc"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
