export interface ChatMessage {
  chatId: string;
  message: string;
  timestamp: number;
}

export interface WebhookResponse {
  success: boolean;
  messages?: ChatMessage[];
  error?: string;
}

export interface RedisConfig {
  url: string;
  bufferTime: number;
} 