// Dịch vụ quản lý xác thực Quản Trị Viên (Admin Auth Service)

const ADMIN_AUTH_KEY = 'app_admin_is_logged_in';
const ADMIN_PASSWORD_KEY = 'app_admin_password';

// Mật khẩu mặc định: '8888' hoặc 'admin123'
const DEFAULT_ADMIN_PASSWORD = '8888';

export function isAdminLoggedIn(): boolean {
  return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
}

export function getAdminPassword(): string {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
}

export function loginAdmin(input: string): boolean {
  const currentPassword = getAdminPassword();
  const cleanedInput = input.trim();
  // Cho phép đăng nhập bằng mật khẩu hiện tại HOẶC mật khẩu khẩn cấp 'admin' hoặc '8888'
  if (
    cleanedInput === currentPassword ||
    cleanedInput === '8888' ||
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

export function changeAdminPassword(newPassword: string): boolean {
  if (!newPassword || newPassword.trim().length < 4) {
    return false;
  }
  localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword.trim());
  return true;
}
