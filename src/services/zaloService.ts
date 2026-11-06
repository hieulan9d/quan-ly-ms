import { ZaloConfig } from '../types';

export interface SendZaloOptions {
  webhookUrl?: string;
  recipientType: 'boss' | 'group';
  targetNameOrId?: string;
  title: string;
  message: string;
  extraData?: Record<string, any>;
}

export interface ZaloSendResult {
  success: boolean;
  message: string;
  status?: number;
  deliveryMethod: 'webhook' | 'manual_clipboard';
}

/**
 * Gửi tin nhắn qua Webhook Zalo (n8n, Make, Custom Bot Server, Zalo OpenAPI)
 */
export async function sendZaloWebhook(options: SendZaloOptions): Promise<ZaloSendResult> {
  const { webhookUrl, recipientType, targetNameOrId, title, message, extraData } = options;

  if (!webhookUrl || !webhookUrl.trim()) {
    return {
      success: false,
      message: 'Chưa cấu hình Webhook URL cho ' + (recipientType === 'boss' ? 'Sếp' : 'Nhóm Zalo') + '. Bạn có thể dùng nút "Mở Zalo Gửi 1 Chạm" hoặc cấu hình Webhook URL trong Cài Đặt.',
      deliveryMethod: 'webhook',
    };
  }

  const endpoint = webhookUrl.trim();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const payload = {
    source: 'MS_MANAGEMENT_AI_AGENT',
    recipientType,
    target: targetNameOrId || (recipientType === 'boss' ? 'Boss' : 'Group'),
    title,
    message,
    text: message, // Tương thích phổ thông với bot chat webhook (n8n, Slack, Telegram, Zalo)
    timestamp: new Date().toISOString(),
    ...extraData,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      let respData: any = null;
      try {
        respData = await response.json();
      } catch {
        // Có thể server trả về text hoặc 204 No Content
      }
      return {
        success: true,
        message: respData?.message || `Đã bắn tin nhắn thành công qua Webhook Zalo (${recipientType === 'boss' ? 'Báo cáo Sếp' : 'Thông báo Nhóm'})!`,
        status: response.status,
        deliveryMethod: 'webhook',
      };
    } else {
      const errText = await response.text().catch(() => '');
      return {
        success: false,
        message: `Webhook phản hồi lỗi HTTP ${response.status}: ${errText.slice(0, 150) || 'Không có chi tiết'}`,
        status: response.status,
        deliveryMethod: 'webhook',
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'Gửi Webhook thất bại do quá thời gian chờ (12s Timeout). Vui lòng kiểm tra lại đường dẫn Webhook!',
        deliveryMethod: 'webhook',
      };
    }
    return {
      success: false,
      message: `Không thể gửi tới Webhook: ${err.message || 'Lỗi mạng hoặc CORS'}. Hãy kiểm tra xem server webhook của bạn đã bật CORS chưa.`,
      deliveryMethod: 'webhook',
    };
  }
}

/**
 * Giải pháp 1-chạm: Tự động copy nội dung báo cáo & mở ứng dụng Zalo trên Web/Mobile
 */
export async function copyAndOpenZalo(params: {
  message: string;
  phoneOrId?: string;
  isGroup?: boolean;
}): Promise<boolean> {
  const { message, phoneOrId, isGroup } = params;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
    }
  } catch (e) {
    console.warn('Clipboard write failed, continuing to open link', e);
  }

  // Nếu có số điện thoại cá nhân (gửi cho sếp) và không phải nhóm
  if (phoneOrId && !isGroup) {
    const cleanPhone = phoneOrId.replace(/[^0-9]/g, '');
    if (cleanPhone) {
      window.open(`https://zalo.me/${cleanPhone}`, '_blank');
      return true;
    }
  }

  // Mở Zalo Web chat hoặc app
  window.open('https://chat.zalo.me/', '_blank');
  return true;
}

/**
 * Kiểm tra kết nối Webhook Zalo
 */
export async function testZaloWebhookConnection(
  webhookUrl: string,
  recipientType: 'boss' | 'group',
  targetName: string
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.trim()) {
    return {
      success: false,
      message: 'Vui lòng nhập Webhook URL trước khi bấm kiểm tra!',
    };
  }

  const testMessage = `🤖 [TEST KẾT NỐI AI AGENT]\nChào bạn! Đây là tin nhắn kiểm tra từ Hệ Thống Quản Lý Chấm Công & Tiến Độ (MS Management).\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}\n🎯 Đích nhận: ${recipientType === 'boss' ? 'Sếp' : 'Nhóm Zalo: ' + targetName}\n✓ Kết nối Webhook hoạt động bình thường!`;

  const res = await sendZaloWebhook({
    webhookUrl,
    recipientType,
    targetNameOrId: targetName,
    title: 'Test Kết Nối AI Agent Zalo',
    message: testMessage,
  });

  return {
    success: res.success,
    message: res.message,
  };
}
