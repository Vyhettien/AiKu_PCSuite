# AiKu_PCSuite

Bộ bản vá tiếng Việt và tiếng Anh cho **vivo PC Suite (vivo办公套件)** bản ROM Trung Quốc.

[Read in English (README.md)](README.md)

Nếu bạn đang dùng điện thoại vivo hoặc iQOO nội địa (ROM Trung Quốc), bạn buộc phải cài vivo PC Suite bản Trung Quốc mới kết nối được. Khổ nỗi bản này khóa cứng tiếng Trung giản thể, còn nếu đổi cờ `IS_EXPORT` sang quốc tế thì lại mất kết nối với máy nội địa. Dự án này vá trực tiếp giao diện và gỡ các đoạn khóa cứng `zh_CN` sang **tiếng Việt** hoặc **tiếng Anh**, giữ nguyên hoàn toàn khả năng kết nối với máy ROM Trung Quốc.

Công cụ chạy trực tiếp trên nhân Electron có sẵn của PC Suite nên bạn không cần cài thêm Node.js hay Python. Trước khi ghi đè, script sẽ tự sao lưu tệp gốc theo từng phiên bản để bạn khôi phục về tiếng Trung bất kỳ lúc nào; các bản vá cũng lưu ngữ cảnh xung quanh nên vẫn chạy ổn khi vivo ra bản cập nhật mới.

Đã kiểm tra thực tế trên Windows 11 với **PC Suite 7.0.6** và **VClaw 1.5.7**.

## Những phần được dịch

| Thành phần | Tiếng Anh | Tiếng Việt |
|---|:---:|:---:|
| PC Suite (Trang chủ, Thiết bị, Quản lý tệp, Ghi chú, Lịch, Album, Trình ghi âm, Cài đặt, Đồng bộ, Công cụ, Trợ lý ảo BlueLM) | Có | Có |
| Cửa sổ Điều khiển PC từ xa (Remote PC) | Có | Có |
| Phản chiếu điện thoại (Phone Mirroring) | Có | Có¹ |
| Trợ lý AI VClaw (Trò chuyện, Kỹ năng, Tác vụ định kỳ, Tệp, Cài đặt, Điểm AI) | Có | Có |

¹ Phản chiếu điện thoại thực chất đã có sẵn gói tiếng Việt `.qm` của vivo bên trong bộ cài Trung Quốc, nhưng app mặc định ép load `zh-CN`. Bản vá chỉ đổi giá trị mặc định này sang `vi-VN` (hoặc `en-US`).

## Cách dùng nhanh

Yêu cầu Windows 10 hoặc 11, đã cài sẵn vivo PC Suite bản Trung Quốc (mặc định ở `C:\Program Files (x86)\pcsuite`, cài ở ổ khác script vẫn tự tìm được hoặc truyền qua `-InstallDir`) và bấm đồng ý quyền Administrator (UAC) một lần để chép tệp vào `Program Files`.

1. Tải repo về (**Code -> Download ZIP**) rồi giải nén, hoặc `git clone`.
2. Nhấn đúp vào tệp bạn cần:

   | Tệp | Tác dụng |
   |---|---|
   | `2. Tiếng Việt.cmd` | Chuyển toàn bộ PC Suite, PC từ xa, Phản chiếu điện thoại và VClaw sang tiếng Việt |
   | `1. English.cmd` | Chuyển toàn bộ sang tiếng Anh |
   | `3. Restore original (Chinese).cmd` | Khôi phục lại bản gốc tiếng Trung |

3. Bấm **Yes** khi Windows hỏi quyền quản trị. PC Suite và VClaw (nếu đang chạy) sẽ tự đóng, áp bản vá và mở lại.

Nếu sau này vivo tự cập nhật làm giao diện quay về tiếng Trung, bạn chỉ cần nhấn đúp lại đúng tệp `.cmd` đó là được. Tệp gốc được giữ riêng theo từng phiên bản trong `backup_original_<phiên bản>\` nên bản dịch luôn được dựng lại từ nguồn sạch.

## Ảnh chụp màn hình (Bản gốc và Tiếng Việt)

Toàn bộ ảnh dưới đây chụp trực tiếp trên bản cài PC Suite 7.0.6 / VClaw 1.5.7 khi chưa cắm điện thoại. Các thông tin riêng tư (mã thiết bị PC từ xa, email tài khoản, tên máy, đường dẫn thư mục và tiêu đề đoạn chat) đều đã được làm mờ. Bấm vào từng ảnh để xem cỡ đầy đủ; file gốc nằm trong thư mục [`img/`](img), còn ảnh bản tiếng Anh ở [README.md](README.md).

<p align="center">
  <img src="img/zh_CN/01-home.png" width="49%" alt="Gốc (tiếng Trung)">
  <img src="img/vi_VN/01-home.png" width="49%" alt="Tiếng Việt">
  <br><sub>Trang chủ: bản gốc tiếng Trung và tiếng Việt</sub>
</p>

<details open>
<summary><b>Trang chủ, Ghi chú, Album, Trình ghi âm</b> (7)</summary>

| Màn hình | Gốc (tiếng Trung) | Tiếng Việt |
|---|---|---|
| Trang chủ | <a href="img/zh_CN/01-home.png"><img src="img/zh_CN/01-home.png" width="400"></a> | <a href="img/vi_VN/01-home.png"><img src="img/vi_VN/01-home.png" width="400"></a> |
| Ghi chú | <a href="img/zh_CN/02-notes.png"><img src="img/zh_CN/02-notes.png" width="400"></a> | <a href="img/vi_VN/02-notes.png"><img src="img/vi_VN/02-notes.png" width="400"></a> |
| Ghi chú (menu thêm) | <a href="img/zh_CN/03-notes-menu.png"><img src="img/zh_CN/03-notes-menu.png" width="400"></a> | <a href="img/vi_VN/03-notes-menu.png"><img src="img/vi_VN/03-notes-menu.png" width="400"></a> |
| Album | <a href="img/zh_CN/11-album.png"><img src="img/zh_CN/11-album.png" width="400"></a> | <a href="img/vi_VN/11-album.png"><img src="img/vi_VN/11-album.png" width="400"></a> |
| Trình ghi âm | <a href="img/zh_CN/12-recorder.png"><img src="img/zh_CN/12-recorder.png" width="400"></a> | <a href="img/vi_VN/12-recorder.png"><img src="img/vi_VN/12-recorder.png" width="400"></a> |
| Menu Công cụ | <a href="img/zh_CN/13-tools-menu.png"><img src="img/zh_CN/13-tools-menu.png" width="400"></a> | <a href="img/vi_VN/13-tools-menu.png"><img src="img/vi_VN/13-tools-menu.png" width="400"></a> |
| Lịch sử truyền | <a href="img/zh_CN/23-transfer-history.png"><img src="img/zh_CN/23-transfer-history.png" width="400"></a> | <a href="img/vi_VN/23-transfer-history.png"><img src="img/vi_VN/23-transfer-history.png" width="400"></a> |

</details>

<details>
<summary><b>Lịch và Việc cần làm</b> (7)</summary>

| Màn hình | Gốc (tiếng Trung) | Tiếng Việt |
|---|---|---|
| Lịch (tháng) | <a href="img/zh_CN/04-calendar-month.png"><img src="img/zh_CN/04-calendar-month.png" width="400"></a> | <a href="img/vi_VN/04-calendar-month.png"><img src="img/vi_VN/04-calendar-month.png" width="400"></a> |
| Lịch (tuần) | <a href="img/zh_CN/05-calendar-week.png"><img src="img/zh_CN/05-calendar-week.png" width="400"></a> | <a href="img/vi_VN/05-calendar-week.png"><img src="img/vi_VN/05-calendar-week.png" width="400"></a> |
| Lịch (năm) | <a href="img/zh_CN/06-calendar-year.png"><img src="img/zh_CN/06-calendar-year.png" width="400"></a> | <a href="img/vi_VN/06-calendar-year.png"><img src="img/vi_VN/06-calendar-year.png" width="400"></a> |
| Sự kiện mới | <a href="img/zh_CN/07-calendar-new-event.png"><img src="img/zh_CN/07-calendar-new-event.png" width="400"></a> | <a href="img/vi_VN/07-calendar-new-event.png"><img src="img/vi_VN/07-calendar-new-event.png" width="400"></a> |
| Tùy chọn lặp lại | <a href="img/zh_CN/08-calendar-repeat.png"><img src="img/zh_CN/08-calendar-repeat.png" width="400"></a> | <a href="img/vi_VN/08-calendar-repeat.png"><img src="img/vi_VN/08-calendar-repeat.png" width="400"></a> |
| Việc cần làm mới | <a href="img/zh_CN/09-calendar-new-todo.png"><img src="img/zh_CN/09-calendar-new-todo.png" width="400"></a> | <a href="img/vi_VN/09-calendar-new-todo.png"><img src="img/vi_VN/09-calendar-new-todo.png" width="400"></a> |
| Danh sách việc cần làm | <a href="img/zh_CN/10-todo.png"><img src="img/zh_CN/10-todo.png" width="400"></a> | <a href="img/vi_VN/10-todo.png"><img src="img/vi_VN/10-todo.png" width="400"></a> |

</details>

<details>
<summary><b>Cài đặt và kết nối</b> (9)</summary>

| Màn hình | Gốc (tiếng Trung) | Tiếng Việt |
|---|---|---|
| Cài đặt: đồng bộ | <a href="img/zh_CN/14-settings-sync.png"><img src="img/zh_CN/14-settings-sync.png" width="400"></a> | <a href="img/vi_VN/14-settings-sync.png"><img src="img/vi_VN/14-settings-sync.png" width="400"></a> |
| Cài đặt: chung | <a href="img/zh_CN/15-settings-general.png"><img src="img/zh_CN/15-settings-general.png" width="400"></a> | <a href="img/vi_VN/15-settings-general.png"><img src="img/vi_VN/15-settings-general.png" width="400"></a> |
| Cài đặt: kết nối thiết bị | <a href="img/zh_CN/16-settings-devices.png"><img src="img/zh_CN/16-settings-devices.png" width="400"></a> | <a href="img/vi_VN/16-settings-devices.png"><img src="img/vi_VN/16-settings-devices.png" width="400"></a> |
| Cài đặt: Lịch | <a href="img/zh_CN/17-settings-calendar.png"><img src="img/zh_CN/17-settings-calendar.png" width="400"></a> | <a href="img/vi_VN/17-settings-calendar.png"><img src="img/vi_VN/17-settings-calendar.png" width="400"></a> |
| Cài đặt: Trợ lý ảo BlueLM | <a href="img/zh_CN/18-settings-bluelm.png"><img src="img/zh_CN/18-settings-bluelm.png" width="400"></a> | <a href="img/vi_VN/18-settings-bluelm.png"><img src="img/vi_VN/18-settings-bluelm.png" width="400"></a> |
| Cài đặt: phiên bản | <a href="img/zh_CN/19-settings-about.png"><img src="img/zh_CN/19-settings-about.png" width="400"></a> | <a href="img/vi_VN/19-settings-about.png"><img src="img/vi_VN/19-settings-about.png" width="400"></a> |
| Kết nối thiết bị | <a href="img/zh_CN/20-connect-device.png"><img src="img/zh_CN/20-connect-device.png" width="400"></a> | <a href="img/vi_VN/20-connect-device.png"><img src="img/vi_VN/20-connect-device.png" width="400"></a> |
| Kết nối USB | <a href="img/zh_CN/21-connect-usb.png"><img src="img/zh_CN/21-connect-usb.png" width="400"></a> | <a href="img/vi_VN/21-connect-usb.png"><img src="img/vi_VN/21-connect-usb.png" width="400"></a> |
| Trợ lý ảo BlueLM | <a href="img/zh_CN/22-bluelm.png"><img src="img/zh_CN/22-bluelm.png" width="400"></a> | <a href="img/vi_VN/22-bluelm.png"><img src="img/vi_VN/22-bluelm.png" width="400"></a> |

</details>

<details>
<summary><b>PC từ xa và VClaw</b> (9)</summary>

| Màn hình | Gốc (tiếng Trung) | Tiếng Việt |
|---|---|---|
| PC từ xa | <a href="img/zh_CN/24-remote-pc.png"><img src="img/zh_CN/24-remote-pc.png" width="400"></a> | <a href="img/vi_VN/24-remote-pc.png"><img src="img/vi_VN/24-remote-pc.png" width="400"></a> |
| VClaw: trò chuyện | <a href="img/zh_CN/25-vclaw-chat.png"><img src="img/zh_CN/25-vclaw-chat.png" width="400"></a> | <a href="img/vi_VN/25-vclaw-chat.png"><img src="img/vi_VN/25-vclaw-chat.png" width="400"></a> |
| VClaw: kỹ năng | <a href="img/zh_CN/26-vclaw-skills.png"><img src="img/zh_CN/26-vclaw-skills.png" width="400"></a> | <a href="img/vi_VN/26-vclaw-skills.png"><img src="img/vi_VN/26-vclaw-skills.png" width="400"></a> |
| VClaw: tác vụ định kỳ | <a href="img/zh_CN/27-vclaw-tasks.png"><img src="img/zh_CN/27-vclaw-tasks.png" width="400"></a> | <a href="img/vi_VN/27-vclaw-tasks.png"><img src="img/vi_VN/27-vclaw-tasks.png" width="400"></a> |
| VClaw: tệp | <a href="img/zh_CN/28-vclaw-files.png"><img src="img/zh_CN/28-vclaw-files.png" width="400"></a> | <a href="img/vi_VN/28-vclaw-files.png"><img src="img/vi_VN/28-vclaw-files.png" width="400"></a> |
| VClaw: cài đặt | <a href="img/zh_CN/29-vclaw-settings.png"><img src="img/zh_CN/29-vclaw-settings.png" width="400"></a> | <a href="img/vi_VN/29-vclaw-settings.png"><img src="img/vi_VN/29-vclaw-settings.png" width="400"></a> |
| VClaw: bảo vệ | <a href="img/zh_CN/30-vclaw-security.png"><img src="img/zh_CN/30-vclaw-security.png" width="400"></a> | <a href="img/vi_VN/30-vclaw-security.png"><img src="img/vi_VN/30-vclaw-security.png" width="400"></a> |
| VClaw: kênh từ xa | <a href="img/zh_CN/31-vclaw-channels.png"><img src="img/zh_CN/31-vclaw-channels.png" width="400"></a> | <a href="img/vi_VN/31-vclaw-channels.png"><img src="img/vi_VN/31-vclaw-channels.png" width="400"></a> |
| VClaw: điểm AI | <a href="img/zh_CN/32-vclaw-credits.png"><img src="img/zh_CN/32-vclaw-credits.png" width="400"></a> | <a href="img/vi_VN/32-vclaw-credits.png"><img src="img/vi_VN/32-vclaw-credits.png" width="400"></a> |

</details>

Một vài chỗ vẫn còn tiếng Trung là do giữ nguyên có chủ ý hoặc tải từ máy chủ vivo: tên tài khoản chưa đặt (`未设置昵称`), gợi ý của BlueLM, câu trả lời AI, thông báo từ server, trang tài khoản vivo, tên thư mục do điện thoại tạo và ảnh có chữ vẽ cứng. Một số nút bấm có nhãn tiếng Việt dài ("Thay đổi", "Khởi tạo kết nối") bị xuống dòng là do lấy nguyên từ gói `vi_VN` chính thức của vivo. Phản chiếu điện thoại và Quản lý tệp cần cắm điện thoại mới hiện nên không có trong bộ ảnh trên.

## Tùy chọn PowerShell

Nếu muốn chạy trực tiếp từ PowerShell thay vì nhấp đúp `.cmd`:

```powershell
.\Translate-PCSuite.ps1                            # tiếng Anh (mặc định)
.\Translate-PCSuite.ps1 -Language vi_VN            # tiếng Việt (hoặc tên thư mục bất kỳ trong patches\)
.\Translate-PCSuite.ps1 -Restore                   # khôi phục lại tệp gốc tiếng Trung
.\Translate-PCSuite.ps1 -BuildOnly                 # chỉ dựng ra build\<ngôn ngữ>\ (không cần admin, không chép đè)
.\Translate-PCSuite.ps1 -InstallDir "D:\pcsuite"   # chỉ định thư mục cài đặt nếu không nằm ở ổ C
```

Mỗi lần chạy đều ghi chi tiết vào `translate_log.txt`.

## Những dữ liệu không sửa

Để đảm bảo các tính năng chạy đúng và không lỗi giao tiếp với máy chủ, bản vá cố tình bỏ qua:

- Nội dung lấy online từ vivo (câu trả lời AI, thông báo, trang tài khoản, một số trường hồ sơ)
- Tên thư mục do điện thoại tạo ra và ảnh bitmap có sẵn chữ Trung
- Chuỗi logic nội bộ: prompt gửi lên AI, khóa so sánh, log/telemetry và dữ liệu lịch âm

## Xử lý lỗi thường gặp

| Lỗi gặp phải | Cách xử lý |
|---|---|
| PC Suite không tự mở lại sau khi vá | Mở Task Manager, đóng hết các tiến trình `pcsuite.exe` còn sót rồi mở lại app. |
| Báo "No backup for version …" lúc khôi phục | Phiên bản đang cài chưa từng được sao lưu trước khi vá; bạn cài đè lại bộ cài gốc PC Suite là xong. |
| Báo "Installed files are already translated but there is no original backup" | Tệp đang cài đã bị dịch sẵn nhưng mất bản sao lưu; cài lại PC Suite để lấy tệp gốc rồi chạy lại script. |
| Vẫn thấy chữ Trung ở một số màn hình | Mở `translate_log.txt` xem có dòng `not found` hay `left untranslated` không, rồi tạo issue kèm ảnh chụp màn hình. |

## Nguyên lý hoạt động

`patches/en_US` là bộ bản vá tiếng Anh làm thủ công, thay phần chữ Trung trong các tệp `.asar` của Electron và gỡ những chỗ bị ép `zh_CN`. Các ngôn ngữ khác (như tiếng Việt) được tạo tự động từ bản tiếng Anh thông qua từ điển `translations/<locale>/strings.json` bằng `tools/make-lang.js`.

Mỗi điểm vá lưu vị trí cũ kèm 60 ký tự ngữ cảnh xung quanh. Khi vivo cập nhật bản mới, đoạn nào lệch vị trí sẽ được tìm lại theo ngữ cảnh; đoạn nào không khớp chắc chắn sẽ được bỏ qua, và bất kỳ tệp JS nào không vượt qua bước kiểm tra cú pháp đều tự động trả về nguyên bản để app không bao giờ bị lỗi không mở được. Cờ `IS_EXPORT` hoàn toàn không bị đụng tới.

## Đóng góp & nguồn tham khảo

Rất hoan nghênh mọi đóng góp về bản dịch, cập nhật cho phiên bản vivo mới hoặc thêm ngôn ngữ khác. Toàn bộ ghi chú kỹ thuật, quy trình build và danh sách kiểm tra nằm trong **[AGENTS.md](AGENTS.md)**.

Dự án được phát triển dựa trên [Lordlorio/Vivo-PC-Suite-PC-Companion-Suite-Chinese-Version-English-Translation](https://github.com/Lordlorio/Vivo-PC-Suite-PC-Companion-Suite-Chinese-Version-English-Translation) (bản PC Suite 7.0.5), mở rộng sang bản 7.0.6, bổ sung tiếng Việt đầy đủ và hỗ trợ thêm VClaw.

## Giấy phép & miễn trừ trách nhiệm

Mã nguồn script, công cụ và nội dung dịch trong repo này được phát hành theo [giấy phép MIT](LICENSE). Phần mềm vivo PC Suite và VClaw thuộc bản quyền của vivo; repo này không lưu trữ tệp cài đặt hay file `.asar` nào của hãng. Đây là dự án cộng đồng không chính thức, không liên kết với vivo, bạn tự cân nhắc khi sử dụng.
