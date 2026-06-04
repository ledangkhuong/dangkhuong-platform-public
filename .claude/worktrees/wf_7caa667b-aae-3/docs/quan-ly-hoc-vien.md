# Hướng Dẫn Quản Lý Học Viên (Dành cho Admin)

## Invite học viên mới

### Cách 1: Qua GitHub Web (Đơn giản nhất)

1. Vào https://github.com/ledangkhuong/dangkhuong-platform
2. Click **Settings** (tab trên cùng)
3. Menu trái → **Collaborators**  
4. Click **Add people**
5. Gõ GitHub username của học viên
6. Chọn quyền **Read** (mặc định)
7. Click **Add [username] to this repository**

Học viên sẽ nhận email mời từ GitHub.
Sau khi accept, họ có thể xem code và Fork repo.

### Cách 2: Qua GitHub CLI (Nhanh hơn khi invite nhiều người)

```bash
# Invite 1 người
gh api repos/ledangkhuong/dangkhuong-platform/collaborators/USERNAME -X PUT -f permission=read

# Invite nhiều người (tạo file danh sách)
# students.txt — mỗi dòng 1 username
# nguyenvana
# tranthib
# levanc

# Chạy lệnh:
while read username; do
  gh api repos/ledangkhuong/dangkhuong-platform/collaborators/$username -X PUT -f permission=read
  echo "Invited: $username"
done < students.txt
```

---

## Xem danh sách học viên đã invite

### Trên GitHub Web:
Settings → Collaborators → thấy danh sách tất cả collaborators

### Qua CLI:
```bash
gh api repos/ledangkhuong/dangkhuong-platform/collaborators --jq '.[].login'
```

---

## Thu hồi quyền truy cập (khi học viên vi phạm)

### Trên GitHub Web:
1. Settings → Collaborators
2. Tìm username cần xóa
3. Click **Remove** bên cạnh tên

### Qua CLI:
```bash
gh api repos/ledangkhuong/dangkhuong-platform/collaborators/USERNAME -X DELETE
```

> **Lưu ý:** Thu hồi quyền chỉ ngăn học viên xem repo gốc.
> Nếu họ đã Fork, bản fork vẫn tồn tại trên tài khoản họ.
> Tuy nhiên, họ sẽ không nhận được updates mới từ anh nữa.

---

## Theo dõi ai đã Fork repo

```bash
gh api repos/ledangkhuong/dangkhuong-platform/forks --jq '.[].owner.login'
```

---

## Checklist khi nhận học viên mới

- [ ] Kiểm tra order code trên Admin Dashboard (dangkhuong.com/admin/orders)
- [ ] Verify email khớp với đơn hàng
- [ ] Invite GitHub username vào repo (quyền Read)
- [ ] Gửi email xác nhận kèm link hướng dẫn
- [ ] Ghi chú vào spreadsheet quản lý (tên, email, GitHub, ngày cấp)

## Checklist khi thu hồi quyền

- [ ] Remove collaborator trên GitHub
- [ ] Ghi chú lý do thu hồi
- [ ] Thông báo cho học viên qua email
