import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  TextField,
  Chip,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import BackspaceIcon from '@mui/icons-material/Backspace';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import PregnantWomanIcon from '@mui/icons-material/PregnantWoman';
import ElderlyIcon from '@mui/icons-material/Elderly';
import AccessibleIcon from '@mui/icons-material/Accessible';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import axiosInstance from '../services/AxiosInstance';
import ThermalTicketModal from '../components/kiosk/ThermalTicketModal';

const PRIORITY_OPTIONS = [
  { id: 'STANDARD', label: 'Bệnh nhân thường', reason: '', icon: <MedicalServicesIcon />, color: 'primary' },
  { id: 'ELDERLY', label: 'Người cao tuổi (≥ 75 tuổi)', reason: 'Người cao tuổi', icon: <ElderlyIcon />, color: 'error' },
  { id: 'PREGNANT', label: 'Phụ nữ mang thai', reason: 'Phụ nữ mang thai', icon: <PregnantWomanIcon />, color: 'secondary' },
  { id: 'CHILD', label: 'Trẻ em (< 6 tuổi)', reason: 'Trẻ em', icon: <ChildCareIcon />, color: 'warning' },
  { id: 'DISABILITY', label: 'Người khuyết tật / Ưu tiên', reason: 'Đối tượng chính sách', icon: <AccessibleIcon />, color: 'info' },
];

const SYMPTOM_QUICK_PICKS = [
  'Khám tổng quát',
  'Đau đầu / Chóng mặt',
  'Sốt / Mệt mỏi',
  'Đau ngực / Tim mạch',
  'Đau bụng / Tiêu hóa',
  'Ho / Khó thở'
];

export default function KioskPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  // Kiosk Form state
  const [selectedDept, setSelectedDept] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [priorityType, setPriorityType] = useState('STANDARD');
  const [symptoms, setSymptoms] = useState('');
  const [hasInsurance, setHasInsurance] = useState(false);
  const [birthYear, setBirthYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Ticket Modal state
  const [ticketResult, setTicketResult] = useState(null);
  const [openTicketModal, setOpenTicketModal] = useState(false);

  // Kiosk Tab & Check-in state
  const [kioskTab, setKioskTab] = useState(0); // 0: Lấy số vãng lai, 1: Check-in đặt trước
  const [checkInCodeOrPhone, setCheckInCodeOrPhone] = useState('');
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch departments
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoadingDepts(true);
      const res = await axiosInstance.get('/api/departments');
      const list = res.data && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      if (list.length > 0) {
        setDepartments(list.map(d => ({
          departmentId: d.departmentId,
          name: d.departmentName || d.name,
          description: d.description || 'Khám chuyên khoa tiêu chuẩn'
        })));
      }
    } catch (err) {
      console.error("Lỗi tải danh sách chuyên khoa:", err);
      // Fallback placeholder departments if network fails
      setDepartments([
        { departmentId: 1, name: 'Khoa Nội Tổng Quát', description: 'Khám tim mạch, hô hấp, tiêu hóa, nội tiết' },
        { departmentId: 2, name: 'Khoa Tim Mạch Can Thiệp', description: 'Khám mạch vành, huyết áp, loạn nhịp tim' },
        { departmentId: 3, name: 'Khoa Nhi', description: 'Khám sức khỏe trẻ sơ sinh, trẻ nhỏ và thiếu nhi' },
        { departmentId: 4, name: 'Khoa Răng Hàm Mặt', description: 'Khám và điều trị nha khoa, răng hàm mặt' },
        { departmentId: 5, name: 'Khoa Tai Mũi Họng', description: 'Khám và điều trị các bệnh tai mũi họng' },
        { departmentId: 6, name: 'Khoa Da Liễu', description: 'Khám và tư vấn bệnh ngoài da, dị ứng' }
      ]);
    } finally {
      setLoadingDepts(false);
    }
  };

  // Touch Keypad handler for Phone
  const handleKeypadPress = (digit) => {
    if (phoneNumber.length < 11) {
      setPhoneNumber(prev => prev + digit);
    }
  };

  const handleKeypadDelete = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setPhoneNumber('');
  };

  const handleResetForm = () => {
    setSelectedDept(null);
    setFullName('');
    setPhoneNumber('');
    setPriorityType('STANDARD');
    setSymptoms('');
    setHasInsurance(false);
    setBirthYear('');
    setErrorMsg('');
  };

  const handleSubmitTicket = async () => {
    if (!selectedDept) {
      setErrorMsg('Vui lòng chọn Khoa khám bệnh!');
      return;
    }
    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập Họ và tên bệnh nhân!');
      return;
    }
    if (!phoneNumber || phoneNumber.length < 9) {
      setErrorMsg('Vui lòng nhập Số điện thoại hợp lệ (tối thiểu 10 số)!');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const selectedPrio = PRIORITY_OPTIONS.find(p => p.id === priorityType);
      const isPriority = priorityType !== 'STANDARD';

      const dispatchPayload = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        departmentId: selectedDept.departmentId,
        isPriority,
        priorityReason: selectedPrio?.reason || null,
        hasInsurance,
        birthYear: birthYear ? parseInt(birthYear) : undefined,
        bookingCode: undefined
      };

      try {
        const res = await axiosInstance.post('/api/counters/kiosk/dispatch', dispatchPayload);
        if (res.data) {
          const data = res.data;
          data.departmentName = selectedDept.name;
          data.patientPhone = phoneNumber;
          setTicketResult(data);
          setOpenTicketModal(true);
          handleResetForm();
          return;
        }
      } catch (counterErr) {
        console.warn("Lỗi khi điều phối quầy tiếp đón, chuyển sang fallback:", counterErr);
        const legacyPayload = {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          departmentId: selectedDept.departmentId,
          isPriority,
          priorityReason: selectedPrio?.reason || null,
          symptoms: symptoms.trim() || undefined
        };
        const resLegacy = await axiosInstance.post('/api/bookings/kiosk', legacyPayload);
        if (resLegacy.data) {
          const data = resLegacy.data;
          data.departmentName = selectedDept.name;
          data.patientPhone = phoneNumber;
          setTicketResult(data);
          setOpenTicketModal(true);
          handleResetForm();
        }
      }
    } catch (err) {
      console.error("Lỗi cấp phiếu kiosk:", err);
      setErrorMsg(err.message || 'Có lỗi xảy ra khi cấp phiếu, vui lòng liên hệ nhân viên tiếp đón.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers for Check-in Tab
  const handleCheckInKeypadPress = (digit) => {
    if (checkInCodeOrPhone.length < 20) {
      setCheckInCodeOrPhone(prev => prev + digit);
    }
  };

  const handleCheckInKeypadDelete = () => {
    setCheckInCodeOrPhone(prev => prev.slice(0, -1));
  };

  const handleCheckInKeypadClear = () => {
    setCheckInCodeOrPhone('');
  };

  const handleCheckInSubmit = async () => {
    if (!checkInCodeOrPhone.trim()) {
      setErrorMsg('Vui lòng nhập Mã đặt lịch hoặc Số điện thoại đã đặt hẹn!');
      return;
    }

    try {
      setCheckInSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await axiosInstance.post('/api/bookings/kiosk/check-in', {
        bookingCodeOrPhone: checkInCodeOrPhone.trim()
      });

      if (res.data) {
        const data = res.data;
        setTicketResult(data);
        setOpenTicketModal(true);
        setCheckInCodeOrPhone('');
        setSuccessMsg(data.message || `Check-in thành công: Bệnh nhân ${data.patientName || ''} - STT: ${data.formattedQueueNumber || data.queueNumber}`);
      }
    } catch (err) {
      console.error("Lỗi check-in kiosk:", err);
      const msg = err.response?.data?.message || err.message || 'Lỗi khi check-in tại Kiosk. Vui lòng liên hệ nhân viên tiếp đón.';
      setErrorMsg(msg);
    } finally {
      setCheckInSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f4f7fb',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none'
      }}
    >
      {/* Kiosk Header Bar */}
      <Paper
        elevation={3}
        sx={{
          py: 2,
          px: { xs: 2, md: 4 },
          bgcolor: '#0d47a1',
          color: '#ffffff',
          borderRadius: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '4px solid #1976d2'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.2,
              bgcolor: 'rgba(255,255,255,0.15)',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LocalHospitalIcon sx={{ fontSize: 40, color: '#ffeb3b' }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
              Kiosk Lấy Số Khám Tự Động
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Hệ thống Tiếp nhận & Phân luồng Bệnh nhân Thông minh
            </Typography>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon />
            {currentTime.toLocaleTimeString('vi-VN')}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>
      </Paper>

      {/* Tabs Chuyển đổi: 1. Lấy số vãng lai / 2. Check-in đặt trước */}
      <Paper square elevation={1} sx={{ bgcolor: '#ffffff', borderBottom: '2px solid #e0e0e0' }}>
        <Container maxWidth="xl">
          <Tabs
            value={kioskTab}
            onChange={(e, val) => {
              setKioskTab(val);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              '& .MuiTab-root': {
                py: 2,
                fontSize: { xs: '0.95rem', md: '1.1rem' },
                fontWeight: 800,
                textTransform: 'uppercase',
                minHeight: 64,
                gap: 1
              }
            }}
          >
            <Tab icon={<ConfirmationNumberIcon sx={{ fontSize: 26 }} />} iconPosition="start" label="1. Lấy số khám mới (Vãng lai)" />
            <Tab icon={<QrCodeScannerIcon sx={{ fontSize: 26 }} />} iconPosition="start" label="2. Check-in lịch hẹn (Đã đặt trước)" />
          </Tabs>
        </Container>
      </Paper>

      {/* Main Content Area */}
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3, display: 'flex', flexDirection: 'column' }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '1.1rem', fontWeight: 600 }} onClose={() => setErrorMsg('')}>
            {errorMsg}
          </Alert>
        )}
        {successMsg && (
          <Alert severity="success" sx={{ mb: 2, fontSize: '1.1rem', fontWeight: 600 }} onClose={() => setSuccessMsg('')}>
            {successMsg}
          </Alert>
        )}

        {/* TAB 0: LẤY SỐ KHÁM VÃNG LAI */}
        {kioskTab === 0 && (
          <Grid container spacing={3} sx={{ flexGrow: 1 }}>
            {/* CỘT TRÁI: Chọn Chuyên Khoa */}
            <Grid item xs={12} md={7}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: '100%',
                borderRadius: 3,
                bgcolor: '#ffffff',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0d47a1', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TouchAppIcon color="primary" /> BƯỚC 1: CHỌN KHOA KHÁM BỆNH
                </Typography>
                {selectedDept && (
                  <Chip
                    label={`Đã chọn: ${selectedDept.name}`}
                    color="primary"
                    onDelete={() => setSelectedDept(null)}
                    sx={{ fontWeight: 700, fontSize: '0.9rem' }}
                  />
                )}
              </Box>

              {loadingDepts ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, py: 8 }}>
                  <CircularProgress size={48} />
                </Box>
              ) : (
                <Grid container spacing={2} sx={{ flexGrow: 1, alignContent: 'flex-start' }}>
                  {departments.map((dept) => {
                    const isSelected = selectedDept?.departmentId === dept.departmentId;
                    return (
                      <Grid item xs={12} sm={6} key={dept.departmentId}>
                        <Card
                          elevation={isSelected ? 6 : 1}
                          sx={{
                            borderRadius: 2.5,
                            border: isSelected ? '3px solid #1976d2' : '2px solid #e0e0e0',
                            bgcolor: isSelected ? '#e3f2fd' : '#ffffff',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: '#1976d2',
                              transform: 'translateY(-2px)'
                            }
                          }}
                        >
                          <CardActionArea
                            onClick={() => setSelectedDept(dept)}
                            sx={{ p: 2, height: '100%', minHeight: 110 }}
                          >
                            <CardContent sx={{ p: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8 }}>
                                <LocalHospitalIcon color={isSelected ? "primary" : "action"} fontSize="large" />
                                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isSelected ? '#0d47a1' : '#222' }}>
                                  {dept.name}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ color: '#666', fontSize: '0.82rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {dept.description || 'Tiếp nhận khám và chẩn đoán điều trị chuyên sâu'}
                              </Typography>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Paper>
          </Grid>

          {/* CỘT PHẢI: Thông tin & Bàn phím số Kiosk */}
          <Grid item xs={12} md={5}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                height: '100%',
                borderRadius: 3,
                bgcolor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0d47a1', display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon color="primary" /> BƯỚC 2: THÔNG TIN BỆNH NHÂN
              </Typography>

              {/* Đối tượng ưu tiên */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#444', mb: 1 }}>
                  Đối tượng khám:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {PRIORITY_OPTIONS.map(option => (
                    <Chip
                      key={option.id}
                      icon={option.icon}
                      label={option.label}
                      color={priorityType === option.id ? option.color : 'default'}
                      variant={priorityType === option.id ? 'filled' : 'outlined'}
                      onClick={() => setPriorityType(option.id)}
                      sx={{
                        fontWeight: 700,
                        py: 2.2,
                        px: 1,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        borderRadius: 2
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Họ và tên */}
              <TextField
                fullWidth
                label="Họ và tên Bệnh nhân *"
                placeholder="VD: NGUYỄN VĂN AN"
                value={fullName}
                onChange={(e) => setFullName(e.target.value.toUpperCase())}
                inputProps={{ style: { fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase' } }}
              />

              {/* Số điện thoại + Màn hình hiển thị số */}
              <Box>
                <TextField
                  fullWidth
                  label="Số điện thoại liên hệ *"
                  placeholder="Nhập 10 chữ số..."
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  inputProps={{ style: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: 2 } }}
                />

                {/* Bàn phím số cảm ứng trên Kiosk */}
                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                  <Grid container spacing={1}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                      <Grid item xs={4} key={num}>
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={() => handleKeypadPress(num)}
                          sx={{
                            fontSize: '1.4rem',
                            fontWeight: 800,
                            py: 1.2,
                            borderRadius: 2,
                            bgcolor: '#fff',
                            color: '#1a237e'
                          }}
                        >
                          {num}
                        </Button>
                      </Grid>
                    ))}
                    <Grid item xs={4}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        onClick={handleKeypadClear}
                        sx={{ fontSize: '0.9rem', fontWeight: 700, py: 1.5, borderRadius: 2 }}
                      >
                        XÓA HẾT
                      </Button>
                    </Grid>
                    <Grid item xs={4}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => handleKeypadPress('0')}
                        sx={{ fontSize: '1.4rem', fontWeight: 800, py: 1.2, borderRadius: 2, bgcolor: '#fff', color: '#1a237e' }}
                      >
                        0
                      </Button>
                    </Grid>
                    <Grid item xs={4}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="warning"
                        onClick={handleKeypadDelete}
                        sx={{ py: 1.5, borderRadius: 2 }}
                      >
                        <BackspaceIcon />
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </Box>

              {/* Triệu chứng / Lý do khám nhanh */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#444', mb: 0.8 }}>
                  Lý do / Triệu chứng (nếu có):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1 }}>
                  {SYMPTOM_QUICK_PICKS.map(s => (
                    <Chip
                      key={s}
                      label={s}
                      size="small"
                      variant={symptoms === s ? 'filled' : 'outlined'}
                      color="info"
                      onClick={() => setSymptoms(s)}
                      sx={{ cursor: 'pointer', fontWeight: 600 }}
                    />
                  ))}
                </Box>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ghi chú thêm triệu chứng khác..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                />
              </Box>

              {/* Nút bấm LẤY SỐ KHÁM */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={submitting}
                onClick={handleSubmitTicket}
                startIcon={submitting ? <CircularProgress size={24} color="inherit" /> : <TouchAppIcon sx={{ fontSize: 32 }} />}
                sx={{
                  mt: 'auto',
                  py: 2,
                  fontSize: '1.3rem',
                  fontWeight: 900,
                  letterSpacing: 1,
                  borderRadius: 3,
                  bgcolor: '#2e7d32',
                  '&:hover': { bgcolor: '#1b5e20' },
                  boxShadow: '0 6px 20px rgba(46,125,50,0.35)'
                }}
              >
                {submitting ? 'ĐANG CẤP SỐ...' : 'XÁC NHẬN IN PHIẾU KHÁM'}
              </Button>
            </Paper>
          </Grid>
        </Grid>
        )}

        {/* TAB 1: CHECK-IN LỊCH HẸN ĐÃ ĐẶT TRƯỚC (WINDOW GUARD) */}
        {kioskTab === 1 && (
          <Grid container spacing={3} sx={{ flexGrow: 1 }}>
            {/* CỘT TRÁI: Hướng dẫn Khung giờ tiếp nhận (Check-in Window Guard) */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: 3,
                  bgcolor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2.5
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, borderBottom: '2px solid #e3f2fd' }}>
                  <ScheduleIcon sx={{ fontSize: 32, color: '#0d47a1' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0d47a1' }}>
                      QUY ĐỊNH TIẾP NHẬN CHECK-IN TỰ ĐỘNG
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Áp dụng cho bệnh nhân đã đăng ký khám trước qua ứng dụng / website
                    </Typography>
                  </Box>
                </Box>

                <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />} sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  Hệ thống Kiosk tự động xác thực thời gian đến khám và cấp số thứ tự ưu tiên vào thẳng phòng khám của Bác sĩ phụ trách.
                </Alert>

                {/* Các quy tắc khung giờ */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 2, borderLeft: '5px solid #2e7d32' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1b5e20', display: 'flex', alignItems: 'center', gap: 1 }}>
                      🟢 KHUNG GIỜ MỞ TIẾP NHẬN (HỢP LỆ)
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#333', mt: 0.5 }}>
                      Bắt đầu mở từ <strong>60 phút trước</strong> giờ khám cho đến tối đa <strong>15 phút sau</strong> ca khám đã đặt. Khi check-in thành công, máy sẽ in phiếu kèm số phòng khám ngay lập tức.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: '#fffde7', borderRadius: 2, borderLeft: '5px solid #fbc02d' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#f57f17', display: 'flex', alignItems: 'center', gap: 1 }}>
                      🟡 ĐẾN QUÁ SỚM (&gt; 60 PHÚT)
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#333', mt: 0.5 }}>
                      Nếu đến trước ca khám trên 60 phút, hệ thống sẽ nhắc nhở và chưa cấp số nhằm hạn chế quá tải buồng chờ. Quý khách vui lòng nghỉ ngơi tại sảnh chờ đến khung giờ tiếp nhận.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 2, borderLeft: '5px solid #d32f2f' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#b71c1c', display: 'flex', alignItems: 'center', gap: 1 }}>
                      🔴 ĐẾN QUÁ TRỄ (&gt; 15 PHÚT)
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#333', mt: 0.5 }}>
                      Nếu đến trễ quá 15 phút sau giờ khám, ca khám tự động đóng để nhường lượt cho bệnh nhân kế tiếp. Quý khách vui lòng liên hệ <strong>Quầy tiếp đón số 01</strong> để được hỗ trợ sắp xếp ca khám mới.
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 'auto', p: 2, bgcolor: '#f5f5f5', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <MeetingRoomIcon sx={{ color: '#0d47a1', fontSize: 28 }} />
                  <Typography variant="body2" sx={{ color: '#555' }}>
                    <strong>Mẹo:</strong> Sau khi có phiếu in, quý khách di chuyển trực tiếp đến cửa phòng Bác sĩ ghi trên phiếu mà không cần qua quầy đăng ký.
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* CỘT PHẢI: Ô nhập Mã đặt lịch / SĐT & Bàn phím số */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: 3,
                  bgcolor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2.5
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, borderBottom: '2px solid #e3f2fd' }}>
                  <QrCodeScannerIcon sx={{ fontSize: 32, color: '#0d47a1' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0d47a1' }}>
                      NHẬP THÔNG TIN CHECK-IN
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Nhập Số điện thoại đăng ký hoặc Mã đặt hẹn (VD: BK-xxxx hoặc 09xxxxxxx)
                    </Typography>
                  </Box>
                </Box>

                {/* Input Text Field */}
                <Box>
                  <TextField
                    fullWidth
                    label="Mã đặt lịch hoặc Số điện thoại *"
                    placeholder="VD: 0912345678 hoặc BK-1234..."
                    value={checkInCodeOrPhone}
                    onChange={(e) => setCheckInCodeOrPhone(e.target.value.toUpperCase())}
                    inputProps={{
                      style: { fontSize: '1.4rem', fontWeight: 800, letterSpacing: 1.5, textAlign: 'center' }
                    }}
                    helperText="Quý khách có thể bấm bàn phím số cảm ứng bên dưới hoặc dùng bàn phím máy tính"
                  />
                </Box>

                {/* Bàn phím cảm ứng Kiosk */}
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2.5, border: '1px solid #e0e0e0' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#666', mb: 1, display: 'block', textAlign: 'center' }}>
                    BÀN PHÍM CẢM ỨNG
                  </Typography>
                  <Grid container spacing={1.5}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                      <Grid item xs={4} key={num}>
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={() => handleCheckInKeypadPress(num)}
                          sx={{
                            fontSize: '1.6rem',
                            fontWeight: 800,
                            py: 1.5,
                            borderRadius: 2,
                            bgcolor: '#fff',
                            color: '#1a237e'
                          }}
                        >
                          {num}
                        </Button>
                      </Grid>
                    ))}
                    <Grid item xs={4}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        onClick={handleCheckInKeypadClear}
                        sx={{ fontSize: '1rem', fontWeight: 800, py: 1.5, borderRadius: 2 }}
                      >
                        XÓA HẾT
                      </Button>
                    </Grid>
                    <Grid item xs={4}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => handleCheckInKeypadPress('0')}
                        sx={{ fontSize: '1.6rem', fontWeight: 800, py: 1.5, borderRadius: 2, bgcolor: '#fff', color: '#1a237e' }}
                      >
                        0
                      </Button>
                    </Grid>
                    <Grid item xs={4}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="warning"
                        onClick={handleCheckInKeypadDelete}
                        sx={{ py: 1.5, borderRadius: 2 }}
                      >
                        <BackspaceIcon sx={{ fontSize: 28 }} />
                      </Button>
                    </Grid>
                  </Grid>
                </Box>

                {/* Nút bấm XÁC NHẬN CHECK-IN */}
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={checkInSubmitting}
                  onClick={handleCheckInSubmit}
                  startIcon={checkInSubmitting ? <CircularProgress size={28} color="inherit" /> : <CheckCircleOutlineIcon sx={{ fontSize: 32 }} />}
                  sx={{
                    mt: 'auto',
                    py: 2.2,
                    fontSize: '1.35rem',
                    fontWeight: 900,
                    letterSpacing: 1,
                    borderRadius: 3,
                    bgcolor: '#0d47a1',
                    '&:hover': { bgcolor: '#08306b' },
                    boxShadow: '0 6px 20px rgba(13,71,161,0.35)'
                  }}
                >
                  {checkInSubmitting ? 'ĐANG XÁC THỰC CHECK-IN...' : 'XÁC NHẬN CHECK-IN & IN PHIẾU'}
                </Button>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>

      {/* Footer Banner */}
      <Box sx={{ py: 1.5, textAlign: 'center', bgcolor: '#e8eaf6', borderTop: '1px solid #c5cae9' }}>
        <Typography variant="body2" sx={{ color: '#3949ab', fontWeight: 600 }}>
          💡 Quý khách cần hỗ trợ vui lòng liên hệ Nhân viên Chăm sóc Khách hàng tại Quầy tiếp đón hoặc Hotline: 1900 6868
        </Typography>
      </Box>

      {/* Modal In Phiếu 80mm */}
      <ThermalTicketModal
        open={openTicketModal}
        onClose={() => setOpenTicketModal(false)}
        ticketData={ticketResult}
        autoResetSeconds={8}
      />
    </Box>
  );
}
