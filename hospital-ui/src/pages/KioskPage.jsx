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
  Tooltip
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
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Ticket Modal state
  const [ticketResult, setTicketResult] = useState(null);
  const [openTicketModal, setOpenTicketModal] = useState(false);

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

      const payload = {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        departmentId: selectedDept.departmentId,
        isPriority,
        priorityReason: selectedPrio?.reason || null,
        symptoms: symptoms.trim() || undefined
      };

      const res = await axiosInstance.post('/api/bookings/kiosk', payload);

      if (res.data) {
        const data = res.data;
        // Merge department name for ticket view
        data.departmentName = selectedDept.name;
        data.patientPhone = phoneNumber;
        setTicketResult(data);
        setOpenTicketModal(true);
        handleResetForm();
      }
    } catch (err) {
      console.error("Lỗi cấp phiếu kiosk:", err);
      setErrorMsg(err.message || 'Có lỗi xảy ra khi cấp phiếu, vui lòng liên hệ nhân viên tiếp đón.');
    } finally {
      setSubmitting(false);
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

      {/* Main Content Area */}
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3, display: 'flex', flexDirection: 'column' }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '1.1rem', fontWeight: 600 }} onClose={() => setErrorMsg('')}>
            {errorMsg}
          </Alert>
        )}

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
