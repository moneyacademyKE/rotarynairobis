/**
 * Telegram Bot API Utility (Rich Hickey "Pure Data" Style)
 * 
 * Focuses on simple, stateless functions that transform data and 
 * interact with the Telegram API.
 */

export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
}

export interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
    title?: string;
  };
  date: number;
  text?: string;
  caption?: string;
  author_signature?: string;
  photo?: {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }[];
}

const TELEGRAM_BASE_URL = "https://api.telegram.org/bot";

/**
 * Sets the webhook for the bot.
 * 
 * Bug H8 fix: accepts allowedUpdates parameter, defaults to channel_post + edited_channel_post.
 * Bug H9 fix: checks response.ok and data.ok, throws descriptive errors on failure.
 */
export async function setWebhook(
  token: string,
  url: string,
  secretToken?: string,
  allowedUpdates: string[] = ["channel_post", "edited_channel_post"]
) {
  const response = await fetch(`${TELEGRAM_BASE_URL}${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: secretToken,
      allowed_updates: allowedUpdates,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram setWebhook HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  if (!data.ok) {
    throw new Error(`Telegram setWebhook failed: ${data.description}`);
  }

  return data;
}

/**
 * Gets file information from Telegram.
 * 
 * Bug M10 fix: fileId is URI-encoded to prevent injection.
 */
export async function getFile(token: string, fileId: string): Promise<TelegramFile> {
  const response = await fetch(
    `${TELEGRAM_BASE_URL}${token}/getFile?file_id=${encodeURIComponent(fileId)}`
  );

  if (!response.ok) {
    throw new Error(`Telegram getFile HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  if (!data.ok) throw new Error(`Telegram getFile failed: ${data.description}`);
  return data.result;
}

/**
 * Generates the download URL for a file.
 */
export function getDownloadUrl(token: string, filePath: string): string {
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

/**
 * Sends a simple text message back to a chat.
 * 
 * Bug H9 fix: checks response.ok and data.ok, throws descriptive errors on failure.
 */
export async function sendMessage(token: string, chatId: number, text: string) {
  const response = await fetch(`${TELEGRAM_BASE_URL}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  if (!data.ok) {
    throw new Error(`Telegram sendMessage failed: ${data.description}`);
  }

  return data;
}
