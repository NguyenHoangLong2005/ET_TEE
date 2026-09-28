import re

file_path = r'C:\userdata\fashion-recommendation-system\web\src\app\(staff)\admin\dashboard\page.tsx'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

replacements = {
    'Lm mi': 'Làm mới',
    'Lm m?i': 'Làm mới',
    'Ti khon Nhn s': 'Tài khoản Nhân sự',
    'Nht k Audit': 'Nhật ký Audit',
    'Nht ky Audit': 'Nhật ký Audit',
    'H thng Email': 'Hệ thống Email',
    'Ti JVM': 'Tải JVM',
    'B nh heap': 'Bộ nhớ heap',
    'Kt ni hot dng': 'Kết nối hoạt động',
    'dang s dng': 'đang sử dụng',
    'Khng c d liu pool': 'Không có dữ liệu pool',
    'Thi gian hot dng lin tc': 'Thời gian hoạt động liên tục',
    'Khng c li gn dy': 'Không có lỗi gần đây',
    'Trng thi n dnh': 'Trạng thái ổn định',
    'Truy cp nhanh': 'Truy cập nhanh',
    'Theo doi mi thao tc qun tr v tra cu nhy cm t CSKH': 'Theo dõi mọi thao tác quản trị và tra cứu nhạy cảm từ CSKH',
    'Hnh dng Qun tr': 'Hành động Quản trị',
    'Tra cu CSKH': 'Tra cứu CSKH',
    'Xem tt c Audit Logs': 'Xem tất cả Audit Logs',
    'Chua c nht k h thng': 'Chưa có nhật ký hệ thống',
    'Chua c nht ky h thng': 'Chưa có nhật ký hệ thống',
    'Cc thao tc qun tr s t dng xut hin ti dy khi pht sinh.': 'Các thao tác quản trị sẽ tự động xuất hiện tại đây khi phát sinh.',
    'Chua c nht k tra cu CSKH': 'Chưa có nhật ký tra cứu CSKH',
    'Chua c nht ky tra cu CSKH': 'Chưa có nhật ký tra cứu CSKH',
    'Lch s tra cu don hng ca nhn vin CSKH s hin th ti dy.': 'Lịch sử tra cứu đơn hàng của nhân viên CSKH sẽ hiển thị tại đây.',
    'Email Logs H Thng': 'Email Logs Hệ Thống',
    'Gim st gi email thng bo don hng, xc thc ti khon v ma OTP': 'Giám sát gửi email thông báo đơn hàng, xác thực tài khoản và mã OTP',
    'da gi': 'đã gửi',
    'tht bi': 'thất bại',
    'Xem ton b lch s Email': 'Xem toàn bộ lịch sử Email',
    'Chua c nht k email': 'Chưa có nhật ký email',
    'Chua c nht ky email': 'Chưa có nhật ký email',
    'Chua c bn ghi gi email no trong co s d liu.': 'Chưa có bản ghi gửi email nào trong cơ sở dữ liệu.'
}

# Also try regex matching if the exact string fails
# The  is \ufffd
import re
text = re.sub(r'L\ufffdm m\ufffdi', 'Làm mới', text)
text = re.sub(r'H\ufffd Th\ufffdng', 'Hệ Thống', text)
text = re.sub(r'h\ufffd th\ufffdng', 'hệ thống', text)
text = re.sub(r'Nh\ufffdt ky', 'Nhật ký', text)
text = re.sub(r'Nh\ufffdt k\ufffd', 'Nhật ký', text)
text = re.sub(r'B\ufffd nh\ufffd heap', 'Bộ nhớ heap', text)
text = re.sub(r'K\ufffdt n\ufffdi ho\ufffdt d\ufffdng', 'Kết nối hoạt động', text)
text = re.sub(r'dang s\ufffd d\ufffdng', 'đang sử dụng', text)
text = re.sub(r'Kh\ufffdng c\ufffd', 'Không có', text)
text = re.sub(r'd\ufffd li\ufffdu pool', 'dữ liệu pool', text)
text = re.sub(r'Th\ufffdi gian ho\ufffdt d\ufffdng li\ufffdn t\ufffdc', 'Thời gian hoạt động liên tục', text)
text = re.sub(r'l\ufffdi g\ufffdn d\ufffdy', 'lỗi gần đây', text)
text = re.sub(r'Tr\ufffdng th\ufffdi \ufffdn d\ufffdnh', 'Trạng thái ổn định', text)
text = re.sub(r'Truy c\ufffdp nhanh', 'Truy cập nhanh', text)
text = re.sub(r'H\ufffdnh d\ufffdng Qu\ufffdn tr\ufffd', 'Hành động Quản trị', text)
text = re.sub(r'Tra c\ufffdu CSKH', 'Tra cứu CSKH', text)
text = re.sub(r'Xem t\ufffdt c\ufffd', 'Xem tất cả', text)
text = re.sub(r'Chua c\ufffd', 'Chưa có', text)
text = re.sub(r'C\ufffdc thao t\ufffdc qu\ufffdn tr\ufffd s\ufffd t\ufffd d\ufffdng xu\ufffdt hi\ufffdn t\ufffdi d\ufffdy khi ph\ufffdt sinh\.', 'Các thao tác quản trị sẽ tự động xuất hiện tại đây khi phát sinh.', text)
text = re.sub(r'L\ufffdch s\ufffd tra c\ufffdu don h\ufffdng c\ufffda nh\ufffdn vi\ufffdn CSKH s\ufffd hi\ufffdn th\ufffd t\ufffdi d\ufffdy\.', 'Lịch sử tra cứu đơn hàng của nhân viên CSKH sẽ hiển thị tại đây.', text)
text = re.sub(r'Gi\ufffdm s\ufffdt g\ufffdi email th\ufffdng b\ufffdo don h\ufffdng, x\ufffdc th\ufffdc t\ufffdi kho\ufffdn v\ufffd ma OTP', 'Giám sát gửi email thông báo đơn hàng, xác thực tài khoản và mã OTP', text)
text = re.sub(r'da g\ufffdi', 'đã gửi', text)
text = re.sub(r'th\ufffdt b\ufffdi', 'thất bại', text)
text = re.sub(r'Xem to\ufffdn b\ufffd l\ufffdch s\ufffd Email', 'Xem toàn bộ lịch sử Email', text)
text = re.sub(r'b\ufffdn ghi g\ufffdi email n\ufffdo trong co s\ufffd d\ufffd li\ufffdu\.', 'bản ghi gửi email nào trong cơ sở dữ liệu.', text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)
    
print("Fixed fonts.")
