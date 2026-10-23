import React, { useState, useEffect, useRef } from 'react';
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
  Tab,
  Stack,
  Divider
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
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import axiosInstance from '../services/AxiosInstance';
import ThermalTicketModal from '../components/kiosk/ThermalTicketModal';
import designTokens from '../theme/designTokens';

const PRIORITY_OPTIONS = [
  { id: 'STANDARD', label: 'Bệnh nhân thường', reason: '', icon: <MedicalServicesIcon sx={{ fontSize: 20 }} />, color: '#0284C7', bg: '#E0F2FE' },
  { id: 'ELDERLY', label: 'Người cao tuổi (≥ 65 tuổi)', reason: 'Người cao tuổi', icon: <ElderlyIcon sx={{ fontSize: 20 }} />, color: '#DC2626', bg: '#FEE2E2' },
  { id: 'PREGNANT', label: 'Phụ nữ mang thai', reason: 'Phụ nữ mang thai', icon: <PregnantWomanIcon sx={{ fontSize: 20 }} />, color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'CHILD', label: 'Trẻ em (< 6 tuổi)', reason: 'Trẻ em', icon: <ChildCareIcon sx={{ fontSize: 20 }} />, color: '#D97706', bg: '#FEF3C7' },
  { id: 'DISABILITY', label: 'Đối tượng ưu tiên / Khuyết tật', reason: 'Đối tượng chính sách', icon: <AccessibleIcon sx={{ fontSize: 20 }} />, color: '#059669', bg: '#D1FAE5' },
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
  const submissionAttemptRef = useRef({ fingerprint: null, key: null });
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
    submissionAttemptRef.current = { fingerprint: null, key: null };
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
      setErrorMsg('Vui l\u00f2ng ch\u1ecdn Khoa kh\u00e1m b\u1ec7nh tr\u00ean m\u00e0n h\u00ecnh c\u1ea3m \u1ee9ng!');
      return;
    }
    if (!fullName.trim()) {
      setErrorMsg('Vui l\u00f2ng nh\u1eadp H\u1ecd v\u00e0 t\u00ean b\u1ec7nh nh\u00e2n!');
      return;
    }
    if (!phoneNumber || phoneNumber.length < 10) {
      setErrorMsg('Vui l\u00f2ng nh\u1eadp S\u1ed1 \u0111i\u1ec7n tho\u1ea1i h\u1ee3p l\u1ec7 (t\u1ed1i thi\u1ec3u 10 s\u1ed1)!');
      return;
    }

    const selectedPrio = PRIORITY_OPTIONS.find(p => p.id === priorityType);
    const isPriority = priorityType !== 'STANDARD';
    const requestFields = {
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      departmentId: selectedDept.departmentId,
      isPriority,
      priorityReason: selectedPrio?.reason || null,
      hasInsurance,
      birthYear: birthYear ? parseInt(birthYear, 10) : undefined
    };
    const fingerprint = JSON.stringify(requestFields);
    if (submissionAttemptRef.current.fingerprint !== fingerprint || !submissionAttemptRef.current.key) {
      const key = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      submissionAttemptRef.current = { fingerprint, key };
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const dispatchPayload = { ...requestFields, idempotencyKey: submissionAttemptRef.current.key };
      const response = await axiosInstance.post('/api/counters/kiosk/dispatch', dispatchPayload);
      const data = response?.data || response;
      if (!data) {
        throw new Error('The API did not return a ticket. Please retry.');
      }
      data.departmentName = selectedDept.name || selectedDept.departmentName;
      data.patientPhone = phoneNumber;
      setTicketResult(data);
      setOpenTicketModal(true);
      handleResetForm();
    } catch (err) {
      console.error("Kiosk ticket dispatch failed:", err);
      setErrorMsg(err.message || 'Kh\u00f4ng th\u1ec3 c\u1ea5p phi\u1ebfu l\u00fac n\u00e0y. Vui l\u00f2ng th\u1eed l\u1ea1i sau; m\u00e3 g\u1eedi hi\u1ec7n t\u1ea1i s\u1ebd gi\u00fap tr\u00e1nh t\u1ea1o phi\u1ebfu tr\u00f9ng.');
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
        bgcolor: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none'
      }}
    >
      {/* =========================================================================
          1. KIOSK HEADER: High-Tech Glassmorphic Navy Top Bar
      ========================================================================= */}
      <Paper
        elevation={0}
        sx={{
          py: 2,
          px: { xs: 2.5, md: 5 },
          background: 'linear-gradient(90deg, #071E3D 0%, #004D8C 60%, #0062A3 100%)',
          color: '#FFFFFF',
          borderRadius: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 4px 20px rgba(7, 30, 61, 0.3)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              p: 1.2,
              bgcolor: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(10px)',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LocalHospitalIcon sx={{ fontSize: 36, color: '#38BDF8' }} />
          </Box>
          <Box>
            <Box display="flex" alignItems="center" gap={1.2}>
              <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
                Kiosk Lấy Số Khám Tự Phục Vụ
              </Typography>
              <Box
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  alignItems: 'center',
                  gap: 0.6,
                  bgcolor: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid #10B981',
                  borderRadius: '9999px',
                  px: 1.2,
                  py: 0.2
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10B981' }} />
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#A7F3D0' }}>
                  ONLINE
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.88, fontSize: '0.85rem' }}>
              Hệ thống Tiếp nhận & Cấp Số Thứ Tự Thông Minh · YouMed TNT Hospital
            </Typography>
          </Box>
        </Box>

        {/* Real-time Monospace Clock */}
        <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
          <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.05em', color: '#67E8F9' }}>
            {currentTime.toLocaleTimeString('vi-VN')}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.82rem' }}>
            {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>
      </Paper>

      {/* =========================================================================
          2. TOUCH TABS: Apple HIG Segmented Bar
      ========================================================================= */}
      <Paper elevation={0} sx={{ bgcolor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', px: { xs: 1, md: 4 } }}>
        <Container maxWidth="xl" disableGutters>
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
                py: 2.2,
                fontSize: { xs: '0.98rem', md: '1.12rem' },
                fontWeight: 800,
                textTransform: 'uppercase',
                minHeight: 68,
                gap: 1.2,
                letterSpacing: '0.02em',
                color: '#64748B',
                '&.Mui-selected': {
                  color: '#0284C7'
                }
              },
              '& .MuiTabs-indicator': {
                height: 3.5,
                borderRadius: '3px 3px 0 0',
                bgcolor: '#0284C7'
              }
            }}
          >
            <Tab icon={<ConfirmationNumberIcon sx={{ fontSize: 26 }} />} iconPosition="start" label="1. Lấy số khám mới (Bệnh nhân vãng lai)" />
            <Tab icon={<QrCodeScannerIcon sx={{ fontSize: 26 }} />} iconPosition="start" label="2. Check-in đặt trước (Đã có mã hẹn)" />
          </Tabs>
        </Container>
      </Paper>

      {/* =========================================================================
          3. MAIN TOUCH AREA
      ========================================================================= */}
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3, display: 'flex', flexDirection: 'column' }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2.5, fontSize: '1.05rem', fontWeight: 700, borderRadius: '14px', border: '1px solid #FECACA' }} onClose={() => setErrorMsg('')}>
            {errorMsg}
          </Alert>
        )}
        {successMsg && (
          <Alert severity="success" sx={{ mb: 2.5, fontSize: '1.05rem', fontWeight: 700, borderRadius: '14px', border: '1px solid #A7F3D0' }} onClose={() => setSuccessMsg('')}>
            {successMsg}
          </Alert>
        )}

        {/* TAB 0: LẤY SỐ KHÁM VÃNG LAI */}
        {kioskTab === 0 && (
          <Grid container spacing={3} sx={{ flexGrow: 1 }}>
            {/* CỘT TRÁI: Chọn Chuyên Khoa */}
            <Grid item xs={12} md={7}>
              <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  height: '100%',
                  borderRadius: '20px',
                  bgcolor: '#FFFFFF',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.15rem' }}>
                    <TouchAppIcon sx={{ color: '#0284C7' }} /> BƯỚC 1: CHẠM CHỌN KHOA KHÁM BỆNH
                  </Typography>
                  {selectedDept && (
                    <Chip
                      icon={<CheckCircleIcon sx={{ fontSize: '16px !important' }} />}
                      label={`Đã chọn: ${selectedDept.name}`}
                      color="primary"
                      onDelete={() => setSelectedDept(null)}
                      sx={{ fontWeight: 800, fontSize: '0.85rem', bgcolor: '#0284C7', borderRadius: '8px' }}
                    />
                  )}
                </Box>

                {loadingDepts ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, py: 8 }}>
                    <CircularProgress size={44} />
                  </Box>
                ) : (
                  <Grid container spacing={2} sx={{ flexGrow: 1, alignContent: 'flex-start' }}>
                    {departments.map((dept) => {
                      const isSelected = selectedDept?.departmentId === dept.departmentId;
                      return (
                        <Grid item xs={12} sm={6} key={dept.departmentId}>
                          <Card
                            elevation={0}
                            sx={{
                              borderRadius: '16px',
                              border: isSelected ? '2px solid #0284C7' : '1px solid rgba(15, 23, 42, 0.08)',
                              bgcolor: isSelected ? '#F0F9FF' : '#FFFFFF',
                              boxShadow: isSelected ? '0 10px 24px -4px rgba(2, 132, 199, 0.16)' : '0 2px 6px rgba(15, 23, 42, 0.02)',
                              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                              '&:hover': {
                                borderColor: '#0284C7',
                                transform: 'translateY(-2px)'
                              }
                            }}
                          >
                            <CardActionArea
                              onClick={() => setSelectedDept(dept)}
                              sx={{ p: 2.2, height: '100%', minHeight: 110 }}
                            >
                              <CardContent sx={{ p: 0 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                  <Box
                                    sx={{
                                      width: 44,
                                      height: 44,
                                      borderRadius: '12px',
                                      bgcolor: isSelected ? '#0284C7' : '#F1F5F9',
                                      color: isSelected ? '#FFFFFF' : '#0284C7',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      border: `1px solid ${isSelected ? '#0284C7' : '#E2E8F0'}`
                                    }}
                                  >
                                    <LocalHospitalIcon sx={{ fontSize: 24 }} />
                                  </Box>
                                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: isSelected ? '#0369A1' : '#0F172A', fontSize: '1.02rem', lineHeight: 1.3 }}>
                                      {dept.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: isSelected ? '#0284C7' : '#64748B', fontWeight: 600 }}>
                                      Khoa tiếp nhận chuẩn BYT
                                    </Typography>
                                  </Box>
                                </Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: '#64748B',
                                    fontSize: '0.82rem',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    lineHeight: 1.45
                                  }}
                                >
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

            {/* CỘT PHẢI: Thông tin Bệnh nhân & Bàn phím số Touch */}
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  height: '100%',
                  borderRadius: '20px',
                  bgcolor: '#FFFFFF',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2.2
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.15rem' }}>
                  <PersonIcon sx={{ color: '#0284C7' }} /> BƯỚC 2: NHẬP THÔNG TIN BỆNH NHÂN
                </Typography>

                {/* Đối tượng ưu tiên */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase', mb: 1, display: 'block', fontSize: '0.75rem' }}>
                    Đối tượng khám ưu tiên:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                    {PRIORITY_OPTIONS.map(option => (
                      <Chip
                        key={option.id}
                        icon={option.icon}
                        label={option.label}
                        onClick={() => setPriorityType(option.id)}
                        sx={{
                          fontWeight: priorityType === option.id ? 800 : 600,
                          py: 2,
                          px: 0.6,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: priorityType === option.id ? option.color : '#E2E8F0',
                          bgcolor: priorityType === option.id ? option.bg : '#F8FAFC',
                          color: priorityType === option.id ? option.color : '#334155'
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Họ và tên */}
                <TextField
                  fullWidth
                  size="small"
                  label="Họ và tên Bệnh nhân *"
                  placeholder="VD: NGUYỄN VĂN AN"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value.toUpperCase())}
                  inputProps={{ style: { fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase' } }}
                  sx={{ bgcolor: '#F8FAFC' }}
                />

                {/* Số điện thoại + Bàn phím số cảm ứng Kiosk */}
                <Box>
                  <TextField
                    fullWidth
                    size="small"
                    label="Số điện thoại liên hệ *"
                    placeholder="Nhập 10 chữ số..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    inputProps={{ style: { fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.12em', fontFamily: 'monospace' } }}
                    sx={{ bgcolor: '#F8FAFC' }}
                  />

                  {/* Bàn phím số Touch Calculator Style */}
                  <Box sx={{ mt: 1.2, p: 1.5, bgcolor: '#F1F5F9', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                    <Grid container spacing={1}>
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                        <Grid item xs={4} key={num}>
                          <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => handleKeypadPress(num)}
                            sx={{
                              fontSize: '1.4rem',
                              fontWeight: 900,
                              py: 1,
                              borderRadius: '10px',
                              bgcolor: '#FFFFFF',
                              color: '#0F172A',
                              border: '1px solid #CBD5E1',
                              boxShadow: '0 2px 4px rgba(15, 23, 42, 0.05)',
                              '&:hover': { bgcolor: '#F8FAFC', borderColor: '#0284C7' }
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
                          sx={{ fontSize: '0.82rem', fontWeight: 800, py: 1.2, borderRadius: '10px', bgcolor: '#FFFFFF' }}
                        >
                          XÓA HẾT
                        </Button>
                      </Grid>
                      <Grid item xs={4}>
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={() => handleKeypadPress('0')}
                          sx={{
                            fontSize: '1.4rem',
                            fontWeight: 900,
                            py: 1,
                            borderRadius: '10px',
                            bgcolor: '#FFFFFF',
                            color: '#0F172A',
                            border: '1px solid #CBD5E1'
                          }}
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
                          sx={{ py: 1.2, borderRadius: '10px', bgcolor: '#FFFFFF' }}
                        >
                          <BackspaceIcon sx={{ fontSize: 22 }} />
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>

                {/* Triệu chứng / Lý do khám nhanh */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', textTransform: 'uppercase', mb: 0.6, display: 'block', fontSize: '0.75rem' }}>
                    Triệu chứng / Lý do khám nhanh:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 1 }}>
                    {SYMPTOM_QUICK_PICKS.map(s => (
                      <Chip
                        key={s}
                        label={s}
                        size="small"
                        onClick={() => setSymptoms(s)}
                        sx={{
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          borderRadius: '6px',
                          bgcolor: symptoms === s ? '#0284C7' : '#F1F5F9',
                          color: symptoms === s ? '#FFFFFF' : '#334155'
                        }}
                      />
                    ))}
                  </Box>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Ghi chú thêm triệu chứng khác..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    sx={{ bgcolor: '#F8FAFC' }}
                  />
                </Box>

                {/* Nút bấm LẤY SỐ KHÁM */}
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={submitting}
                  onClick={handleSubmitTicket}
                  startIcon={submitting ? <CircularProgress size={24} color="inherit" /> : <TouchAppIcon sx={{ fontSize: 28 }} />}
                  sx={{
                    mt: 'auto',
                    py: 1.8,
                    fontSize: '1.2rem',
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                    borderRadius: '14px',
                    bgcolor: '#059669',
                    boxShadow: '0 8px 24px rgba(5, 150, 105, 0.35)',
                    '&:hover': { bgcolor: '#047857' }
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
                elevation={0}
                sx={{
                  p: 3.5,
                  height: '100%',
                  borderRadius: '20px',
                  bgcolor: '#FFFFFF',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2.2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5, borderBottom: '1px solid #E2E8F0' }}>
                  <ScheduleIcon sx={{ fontSize: 32, color: '#0284C7' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.15rem' }}>
                      QUY ĐỊNH TIẾP NHẬN CHECK-IN TỰ ĐỘNG
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      Dành cho bệnh nhân đã đăng ký trước qua ứng dụng hoặc website YouMed TNT
                    </Typography>
                  </Box>
                </Box>

                <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />} sx={{ fontSize: '0.92rem', fontWeight: 600, borderRadius: '12px' }}>
                  Hệ thống Kiosk tự động xác thực thời gian đến khám và cấp số thứ tự ưu tiên vào thẳng phòng khám của Bác sĩ.
                </Alert>

                {/* Các quy tắc khung giờ */}
                <Stack spacing={1.8}>
                  <Box sx={{ p: 2, bgcolor: '#ECFDF5', borderRadius: '12px', borderLeft: '4px solid #10B981' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#065F46', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      🟢 KHUNG GIỜ MỞ TIẾP NHẬN (HỢP LỆ)
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#047857', mt: 0.4, fontSize: '0.85rem', lineHeight: 1.5 }}>
                      Bắt đầu mở từ <b>60 phút trước</b> giờ khám đến tối đa <b>15 phút sau</b> ca khám đã đặt. Máy sẽ in phiếu kèm phòng khám lập tức.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: '#FFFBEB', borderRadius: '12px', borderLeft: '4px solid #F59E0B' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#92400E', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      🟡 ĐẾN QUÁ SỚM (&gt; 60 PHÚT)
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#B45309', mt: 0.4, fontSize: '0.85rem', lineHeight: 1.5 }}>
                      Hệ thống sẽ nhắc nhở và chưa cấp số nhằm hạn chế quá tải buồng chờ. Quý khách vui lòng nghỉ ngơi tại sảnh đợi đến giờ tiếp nhận.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: '#FEF2F2', borderRadius: '12px', borderLeft: '4px solid #EF4444' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      🔴 ĐẾN QUÁ TRỄ (&gt; 15 PHÚT)
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#B91C1C', mt: 0.4, fontSize: '0.85rem', lineHeight: 1.5 }}>
                      Ca khám tự động đóng để nhường lượt cho bệnh nhân kế tiếp. Vui lòng liên hệ <b>Quầy Tiếp Đón số 01</b> để được hỗ trợ sắp xếp ca mới.
                    </Typography>
                  </Box>
                </Stack>

                <Box sx={{ mt: 'auto', p: 2, bgcolor: '#F8FAFC', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 1.5, border: '1px solid #E2E8F0' }}>
                  <MeetingRoomIcon sx={{ color: '#0284C7', fontSize: 26 }} />
                  <Typography variant="body2" sx={{ color: '#475569', fontSize: '0.85rem' }}>
                    <b>Mẹo:</b> Sau khi có phiếu in, quý khách di chuyển trực tiếp đến cửa phòng Bác sĩ ghi trên phiếu mà không cần qua quầy đăng ký.
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* CỘT PHẢI: Ô nhập Mã đặt lịch / SĐT & Bàn phím số */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  height: '100%',
                  borderRadius: '20px',
                  bgcolor: '#FFFFFF',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2.2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5, borderBottom: '1px solid #E2E8F0' }}>
                  <QrCodeScannerIcon sx={{ fontSize: 32, color: '#0284C7' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', fontSize: '1.15rem' }}>
                      NHẬP THÔNG TIN CHECK-IN
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      Nhập Số điện thoại hoặc Mã đặt hẹn (VD: BK-xxxx hoặc 09xxxxxxx)
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
                      style: { fontSize: '1.35rem', fontWeight: 900, letterSpacing: '0.08em', textAlign: 'center', fontFamily: 'monospace' }
                    }}
                    sx={{ bgcolor: '#F8FAFC' }}
                    helperText="Bấm bàn phím số cảm ứng bên dưới hoặc dùng bàn phím máy tính"
                  />
                </Box>

                {/* Bàn phím cảm ứng Kiosk */}
                <Box sx={{ p: 2, bgcolor: '#F1F5F9', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748B', mb: 1.2, display: 'block', textAlign: 'center', textTransform: 'uppercase' }}>
                    BÀN PHÍM CẢM ỨNG
                  </Typography>
                  <Grid container spacing={1.2}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                      <Grid item xs={4} key={num}>
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={() => handleCheckInKeypadPress(num)}
                          sx={{
                            fontSize: '1.5rem',
                            fontWeight: 900,
                            py: 1.3,
                            borderRadius: '10px',
                            bgcolor: '#FFFFFF',
                            color: '#0F172A',
                            border: '1px solid #CBD5E1',
                            boxShadow: '0 2px 4px rgba(15, 23, 42, 0.05)',
                            '&:hover': { bgcolor: '#F8FAFC', borderColor: '#0284C7' }
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
                        sx={{ fontSize: '0.85rem', fontWeight: 800, py: 1.4, borderRadius: '10px', bgcolor: '#FFFFFF' }}
                      >
                        XÓA HẾT
                      </Button>
                    </Grid>
                    <Grid item xs={4}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => handleCheckInKeypadPress('0')}
                        sx={{
                          fontSize: '1.5rem',
                          fontWeight: 900,
                          py: 1.3,
                          borderRadius: '10px',
                          bgcolor: '#FFFFFF',
                          color: '#0F172A',
                          border: '1px solid #CBD5E1'
                        }}
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
                        sx={{ py: 1.4, borderRadius: '10px', bgcolor: '#FFFFFF' }}
                      >
                        <BackspaceIcon sx={{ fontSize: 24 }} />
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
                  startIcon={checkInSubmitting ? <CircularProgress size={24} color="inherit" /> : <CheckCircleOutlineIcon sx={{ fontSize: 28 }} />}
                  sx={{
                    mt: 'auto',
                    py: 1.8,
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                    borderRadius: '14px',
                    bgcolor: '#0284C7',
                    boxShadow: '0 8px 24px rgba(2, 132, 199, 0.35)',
                    '&:hover': { bgcolor: '#0369A1' }
                  }}
                >
                  {checkInSubmitting ? 'ĐANG XÁC THỰC CHECK-IN...' : 'XÁC NHẬN CHECK-IN & IN PHIẾU'}
                </Button>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>

      {/* =========================================================================
          4. FOOTER BANNER
      ========================================================================= */}
      <Box sx={{ py: 1.5, textAlign: 'center', bgcolor: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}>
        <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600, fontSize: '0.85rem' }}>
          💡 Quý khách cần hỗ trợ vui lòng liên hệ Nhân viên Chăm sóc Khách hàng tại Quầy Tiếp Đón hoặc Hotline: <b>1900 8888</b>
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
