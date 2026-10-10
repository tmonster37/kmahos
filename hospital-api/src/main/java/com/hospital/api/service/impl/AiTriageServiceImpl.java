package com.hospital.api.service.impl;

import com.hospital.api.dto.request.AiConsultationRequest;
import com.hospital.api.dto.response.AiConsultationResponse;
import com.hospital.api.entity.Department;
import com.hospital.api.entity.Doctor;
import com.hospital.api.repository.DepartmentRepository;
import com.hospital.api.repository.DoctorRepository;
import com.hospital.api.service.AiTriageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AiTriageServiceImpl implements AiTriageService {

    private final DepartmentRepository departmentRepository;
    private final DoctorRepository doctorRepository;

    private static final List<String> QUICK_PROMPTS = List.of(
            "Tôi bị đau tức ngực và khó thở khi đi lại nhanh",
            "Bị đau đầu dữ dội kèm chóng mặt, buồn nôn",
            "Trẻ 3 tuổi bị sốt 39 độ, ho có đờm nhiều ngày",
            "Đau khớp gối và phát ra tiếng kêu khi co duỗi",
            "Bị đau thượng vị, ợ chua và đầy bụng sau khi ăn",
            "Tư vấn quy trình và chi phí khám sức khỏe tổng quát"
    );

    @Override
    public List<String> getQuickPrompts() {
        return QUICK_PROMPTS;
    }

    @Override
    public AiConsultationResponse consult(AiConsultationRequest request) {
        String query = request.message().trim();
        String lowerQuery = query.toLowerCase();

        // 1. Kiểm tra dấu hiệu khẩn cấp (Emergency Red Flags)
        boolean isEmergency = checkEmergencyFlags(lowerQuery);
        String emergencyAlert = null;
        String triageLevel = isEmergency ? "EMERGENCY" : "ROUTINE";

        if (isEmergency) {
            emergencyAlert = "🚨 CẢNH BÁO NGUY CẤP: Dấu hiệu bạn mô tả có thể là tình trạng cần cấp cứu y tế khẩn cấp! "
                    + "Vui lòng gọi ngay Hotline Cấp Cứu 1900 8888 hoặc đến ngay khoa Cấp cứu bệnh viện gần nhất, không nên tự điều trị tại nhà.";
        }

        // 2. Tìm kiếm Chuyên khoa phù hợp nhất từ Database
        List<Department> allDepts = departmentRepository.findAllByDeletedFalse();
        Department matchedDept = matchDepartment(lowerQuery, allDepts);

        // 3. Lấy danh sách Bác sĩ tiêu biểu của Chuyên khoa
        List<AiConsultationResponse.DoctorSummary> doctorSummaries = new ArrayList<>();
        if (matchedDept != null) {
            List<Doctor> doctors = doctorRepository.findAllByDepartment_DepartmentIdAndDeletedFalse(matchedDept.getDepartmentId());
            for (Doctor doc : doctors.stream().limit(3).toList()) {
                doctorSummaries.add(AiConsultationResponse.DoctorSummary.builder()
                        .doctorId(doc.getDoctorId())
                        .fullName(doc.getAccount() != null ? doc.getAccount().getFullName() : "Bác sĩ Chuyên khoa")
                        .academicTitle(doc.getDegree() != null ? doc.getDegree().name() : "Bác sĩ")
                        .specialty(matchedDept.getDepartmentName())
                        .build());
            }
        }

        // 4. Sinh nội dung tư vấn y khoa bài bản (Markdown)
        String replyText = generateMedicalResponse(query, lowerQuery, matchedDept, isEmergency);

        // 5. Xây dựng thẻ hành động Đặt khám 1-Click
        AiConsultationResponse.BookingAction bookingAction = null;
        if (matchedDept != null) {
            String encodedSymptoms = URLEncoder.encode(query, StandardCharsets.UTF_8);
            bookingAction = AiConsultationResponse.BookingAction.builder()
                    .departmentId(matchedDept.getDepartmentId())
                    .departmentName(matchedDept.getDepartmentName())
                    .symptoms(query)
                    .actionUrl("/booking?departmentId=" + matchedDept.getDepartmentId() + "&symptoms=" + encodedSymptoms)
                    .buttonLabel("👉 Đặt Lịch Khám " + matchedDept.getDepartmentName() + " Ngay")
                    .build();
        }

        // 6. Danh mục tài liệu tham khảo chính thống
        List<AiConsultationResponse.CitationItem> citations = generateCitations(matchedDept);

        return AiConsultationResponse.builder()
                .replyText(replyText)
                .triageLevel(triageLevel)
                .emergencyAlert(emergencyAlert)
                .suggestedDepartment(matchedDept != null ? AiConsultationResponse.DepartmentInfo.builder()
                        .departmentId(matchedDept.getDepartmentId())
                        .name(matchedDept.getDepartmentName())
                        .description(matchedDept.getDescription())
                        .icon("LocalHospital")
                        .build() : null)
                .suggestedDoctors(doctorSummaries)
                .bookingAction(bookingAction)
                .medicalCitations(citations)
                .build();
    }

    private boolean checkEmergencyFlags(String text) {
        return text.contains("đột quỵ") || text.contains("méo miệng") || text.contains("liệt nửa người")
                || text.contains("nhồi máu cơ tim") || text.contains("đau thắt ngực dữ dội") || text.contains("ngất xỉu")
                || text.contains("co giật") || text.contains("nôn ra máu") || text.contains("sốc phản vệ")
                || text.contains("khó thở dữ dội") || text.contains("chảy máu không cầm") || text.contains("hôn mê");
    }

    private Department matchDepartment(String text, List<Department> departments) {
        if (departments.isEmpty()) return null;

        Map<String, List<String>> deptKeywords = new LinkedHashMap<>();
        deptKeywords.put("tim mạch", List.of("tim", "ngực", "huyết áp", "mạch", "hồi hộp", "khó thở khi gắng sức", "nhịp tim"));
        deptKeywords.put("nhi", List.of("bé", "trẻ", "cháu", "sơ sinh", "mọc răng", "tay chân miệng", "tiêu chảy ở trẻ", "biếng ăn"));
        deptKeywords.put("cơ xương khớp", List.of("khớp", "gối", "xương", "cột sống", "lưng", "vai gáy", "thoát vị", "gãy xương", "bong gân", "thoái hóa"));
        deptKeywords.put("ngoại", List.of("mổ", "phẫu thuật", "u", "áp xe", "chấn thương", "vết thương"));
        deptKeywords.put("tai mũi họng", List.of("họng", "tai", "mũi", "amidan", "ù tai", "sổ mũi", "viêm xoang", "chảy máu cam", "khàn tiếng"));
        deptKeywords.put("tiêu hóa", List.of("dạ dày", "bụng", "ợ chua", "trào ngược", "ruột", "gan", "mật", "đại tràng", "trĩ", "tiêu chảy", "táo bón"));
        deptKeywords.put("da liễu", List.of("da", "ngứa", "mề đay", "mẩn đỏ", "dị ứng", "mụn", "vảy nến", "nấm da", "zona"));
        deptKeywords.put("mắt", List.of("mắt", "thị lực", "nhìn mờ", "đau mắt đỏ", "cộm", "chảy nước mắt", "cận thị"));
        deptKeywords.put("thần kinh", List.of("đầu", "đau đầu", "chóng mặt", "mất ngủ", "tiền đình", "tê bì", "trí nhớ", "suy nhược"));
        deptKeywords.put("nội", List.of("sốt", "mệt mỏi", "cảm cúm", "tổng quát", "định kỳ", "sụt cân", "nhiễm trùng"));

        for (Map.Entry<String, List<String>> entry : deptKeywords.entrySet()) {
            for (String kw : entry.getValue()) {
                if (text.contains(kw)) {
                    for (Department d : departments) {
                        String deptNameLower = d.getDepartmentName().toLowerCase();
                        if (deptNameLower.contains(entry.getKey()) || (entry.getKey().equals("cơ xương khớp") && deptNameLower.contains("ngoại"))) {
                            return d;
                        }
                    }
                }
            }
        }

        // Mặc định trả về Khoa Nội hoặc khoa đầu tiên
        return departments.stream()
                .filter(d -> d.getDepartmentName().toLowerCase().contains("nội"))
                .findFirst()
                .orElse(departments.get(0));
    }

    private String generateMedicalResponse(String originalQuery, String lower, Department dept, boolean isEmergency) {
        StringBuilder sb = new StringBuilder();

        sb.append("Chào bạn, **Trợ Lý Y Tế AI 24/7 của Bệnh viện Đa khoa TNT** đã nhận được câu hỏi về triệu chứng của bạn:\n\n");

        if (isEmergency) {
            sb.append("### 🚨 ĐÁNH GIÁ MỨC ĐỘ NGUY HIỂM\n");
            sb.append("Dấu hiệu bạn đang gặp phải có thể là **tình trạng cấp cứu y khoa khẩn cấp**. Bạn cần được can thiệp y tế chuyên sâu ngay lập tức. Hãy gọi người thân hỗ trợ và liên hệ **Hotline Cấp Cứu 1900 8888** hoặc đến khoa Cấp cứu gần nhất!\n\n");
        } else {
            sb.append("### 🔍 1. Phân Tích Triệu Chứng Ban Đầu\n");
            if (dept != null) {
                sb.append("Dựa trên mô tả *\"").append(originalQuery).append("\"*, các triệu chứng này thuộc nhóm bệnh lý liên quan đến **").append(dept.getDepartmentName()).append("**.\n\n");
            } else {
                sb.append("Dựa trên mô tả của bạn, các triệu chứng này cần được theo dõi kỹ lưỡng và thăm khám lâm sàng.\n\n");
            }

            sb.append("### 🩺 2. Các Nguyên Nhân Tiềm Ẩn Phổ Biến\n");
            if (lower.contains("ngực") || lower.contains("tim")) {
                sb.append("- Cơn đau thắt ngực do thiếu máu cơ tim hoặc bệnh lý mạch vành.\n");
                sb.append("- Co thắt cơ thành ngực, viêm dây thần kinh liên sườn.\n");
                sb.append("- Trào ngược dạ dày thực quản (GERD) gây đau rát sau xương ức.\n\n");
            } else if (lower.contains("đầu") || lower.contains("chóng mặt")) {
                sb.append("- Đau nửa đầu Migraine hoặc đau đầu căng thẳng do căng thẳng, thiếu ngủ.\n");
                sb.append("- Rối loạn tiền đình, thiểu năng tuần hoàn não.\n");
                sb.append("- Biến động huyết áp đột ngột.\n\n");
            } else if (lower.contains("khớp") || lower.contains("gối") || lower.contains("lưng")) {
                sb.append("- Thoái hóa khớp gối hoặc cột sống theo độ tuổi/vận động.\n");
                sb.append("- Viêm bao hoạt dịch hoặc tổn thương sụn khớp/dây chằng.\n");
                sb.append("- Thoát vị đĩa đệm chèn ép rễ thần kinh tọa.\n\n");
            } else if (lower.contains("bụng") || lower.contains("dạ dày")) {
                sb.append("- Viêm loét dạ dày - tá tràng, nhiễm khuẩn HP.\n");
                sb.append("- Hội chứng ruột kích thích (IBS) hoặc rối loạn tiêu hóa.\n");
                sb.append("- Trào ngược dạ dày thực quản.\n\n");
            } else {
                sb.append("- Rối loạn chuyển hóa hoặc phản ứng miễn dịch của cơ thể.\n");
                sb.append("- Mệt mỏi do căng thẳng kéo dài, thay đổi thời tiết.\n");
                sb.append("- Bệnh lý viêm nhiễm đường hô hấp/nội khoa thông thường.\n\n");
            }

            sb.append("### 🛡️ 3. Hướng Dẫn Chăm Sóc & Sơ Cứu Tại Nhà\n");
            sb.append("- Nghỉ ngơi tại nơi thoáng khí, giữ tinh thần thư giãn, tránh vận động nặng quá sức.\n");
            sb.append("- Uống đủ nước ấm (1.5 - 2 lít/ngày), chia thành từng ngụm nhỏ.\n");
            sb.append("- **Lưu ý quan trọng**: Không tự ý mua thuốc kháng sinh hoặc thuốc đặc trị khi chưa có chỉ định của Bác sĩ chuyên khoa.\n\n");

            sb.append("### 🏥 4. Khuyến Nghị Chuyên Khoa Thăm Khám\n");
            if (dept != null) {
                sb.append("Chúng tôi khuyến nghị bạn nên đến khám trực tiếp tại **").append(dept.getDepartmentName()).append("** để được Bác sĩ thực hiện các xét nghiệm cận lâm sàng (như chụp X-quang, Siêu âm, Điện tim...) nhằm chẩn đoán chính xác nhất.\n");
                sb.append("Bạn có thể bấm vào **Thẻ Đặt Lịch Khám** bên dưới để chọn Bác sĩ và khung giờ thuận tiện nhất!\n");
            }
        }

        sb.append("\n*⚠️ Lưu ý: Các thông tin trên mang tính chất tư vấn tham khảo, không thay thế chẩn đoán y khoa chính thức của Bác sĩ.*");

        return sb.toString();
    }

    private List<AiConsultationResponse.CitationItem> generateCitations(Department dept) {
        List<AiConsultationResponse.CitationItem> list = new ArrayList<>();
        list.add(AiConsultationResponse.CitationItem.builder()
                .title("Hướng dẫn chẩn đoán và điều trị bệnh lý " + (dept != null ? dept.getDepartmentName() : "Nội khoa"))
                .source("Bộ Y Tế Việt Nam")
                .url("https://kcb.vn")
                .build());
        list.add(AiConsultationResponse.CitationItem.builder()
                .title("Cẩm nang chăm sóc và phòng ngừa bệnh lý tại nhà")
                .source("Bệnh viện Đa khoa Quốc tế TNT")
                .url("https://tnthospital.vn/cam-nang-y-khoa")
                .build());
        return list;
    }
}
