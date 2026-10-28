# Khẩu ngữ Trung cấp · Copy nhanh cho Doubao Voice

Web app tra cứu kịch bản 13 đề thi khẩu ngữ Trung cấp và copy nhanh 1-chạm vào Doubao (chế độ Voice).
Tối ưu hóa 100% cho giao diện điện thoại (iPhone / Android).

## 🚀 Tính năng chính

- **⚡ Copy cho Doubao (1 chạm)**: Tự động ghép Prompt chung + Toàn bộ 18 câu thoại theo đúng định dạng. Dán vào Doubao là bot tự đóng vai A, bạn đóng vai B ngay lập tức!
- **📋 Chỉ copy Script**: Dành cho khi thread chat của Doubao đã có sẵn Prompt từ trước.
- **👀 Xem Script trực tiếp**: Kịch bản 18 câu chia vai rõ ràng (`🤖 A` Doubao, `🗣️ B` Bạn), chữ to, rõ nét, chạm vào câu nào copy câu đó.
- **Toggle Pinyin**: Bật/tắt phiên âm Pinyin nhanh chóng bằng nút gạt trên thanh công cụ.
- **📚 Sinh từ & Mẫu câu**: Mở bảng từ vựng và ngữ pháp ví dụ của từng bài ngay trên điện thoại.
- **🔍 Tìm kiếm tức thì**: Lọc theo bài hoặc gõ tên đề tiếng Việt / chữ Hán.
- **📱 Hỗ trợ PWA**: Lưu trang ra Màn hình chính (Add to Home Screen) để dùng như một app native, có hỗ trợ offline.

## 📱 Cách mở trên điện thoại

### Cách 1: Dùng qua GitHub Pages (Khuyên dùng - dùng mọi lúc mọi nơi kể cả 4G)
Truy cập link GitHub Pages trên Safari hoặc Chrome điện thoại:
```
https://lekhanh2099.github.io/khau-ngu-doubao/
```
*(Trên Safari: Bấm nút **Chia sẻ** → Chọn **Thêm vào MH chính** để dùng như ứng dụng)*

### Cách 2: Mở qua mạng Wi-Fi nội bộ
1. Nháy đúp file `start.command` trên máy tính.
2. Mở trình duyệt trên điện thoại (đang kết nối cùng Wi-Fi) và nhập địa chỉ hiển thị trong terminal (ví dụ: `http://192.168.1.19:5173`).

---

## 🛠️ Cập nhật nội dung (khi sửa file Word)

Nếu bạn thay đổi nội dung file Word trong thư mục `source/`:
```bash
cd tools
node build-data.mjs
```
Dữ liệu sẽ tự động chuyển đổi và làm mới file `data.js`.
