// Dịch vụ quản lý xác thực Quản Trị Viên (Admin Auth Service)
import { getSupabaseClient } from './db';

const ADMIN_AUTH_KEY = 'app_admin_is_logged_in';
const ADMIN_PASSWORD_KEY = 'app_admin_password';

// Mật khẩu khởi tạo ban đầu khi chưa từng đổi: '8888'
const INITIAL_DEFAULT_PASSWORD = '8888';

export function isAdminLoggedIn(): boolean {
  return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
}

export function getAdminPassword(): string {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || INITIAL_DEFAULT_PASSWORD;
}

export function hasCustomAdminPassword(): boolean {
  return !!localStorage.getItem(ADMIN_PASSWORD_KEY);
}

export function loginAdmin(input: string): boolean {
  const currentPassword = getAdminPassword();
  const cleanedInput = input.trim();
  const hasCustom = hasCustomAdminPassword();

  // Nếu người dùng ĐÃ ĐỔI mật khẩu riêng -> CHỈ chấp nhận mật khẩu mới này!
  // Tuyệt đối không cho phép 8888 hay admin nữa để đảm bảo an toàn.
  if (hasCustom) {
    if (cleanedInput === currentPassword) {
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      return true;
    }
    return false;
  }

  // Nếu CHƯA TỪNG đổi mật khẩu -> Chấp nhận mật khẩu ban đầu '8888' hoặc 'admin'
  if (
    cleanedInput === INITIAL_DEFAULT_PASSWORD ||
    cleanedInput === 'admin' ||
    cleanedInput === 'admin123'
  ) {
    localStorage.setItem(ADMIN_AUTH_KEY, 'true');
    return true;
  }
  return false;
}

export function logoutAdmin(): void {
  localStorage.setItem(ADMIN_AUTH_KEY, 'false');
}

export async function changeAdminPassword(
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const currentPassword = getAdminPassword();
  const cleanedOld = oldPassword.trim();
  const cleanedNew = newPassword.trim();
  const hasCustom = hasCustomAdminPassword();

  // Xác thực mật khẩu cũ
  const isOldValid = hasCustom
    ? cleanedOld === currentPassword
    : (cleanedOld === currentPassword || cleanedOld === 'admin' || cleanedOld === 'admin123');

  if (!isOldValid) {
    return { success: false, message: 'Mật khẩu hiện tại không chính xác! Vui lòng kiểm tra lại.' };
  }

  if (cleanedNew.length < 4) {
    return { success: false, message: 'Mật khẩu mới phải có ít nhất 4 ký tự!' };
  }

  if (cleanedNew === cleanedOld) {
    return { success: false, message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại!' };
  }

  // Cập nhật vào localStorage
  localStorage.setItem(ADMIN_PASSWORD_KEY, cleanedNew);
  localStorage.setItem(ADMIN_AUTH_KEY, 'true');

  // Đồng bộ lên Supabase Cloud nếu có kết nối
  try {
    const client = getSupabaseClient();
    if (client) {
      await client.from('app_records').upsert(
        {
          collection: 'meta',
          id: 'admin_auth',
          data: { password: cleanedNew },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'collection,id' }
      );
    }
  } catch (err) {
    console.error('Lỗi đồng bộ mật khẩu lên Supabase:', err);
  }

  return { success: true, message: 'Đổi mật khẩu Quản Trị Viên thành công!' };
}
