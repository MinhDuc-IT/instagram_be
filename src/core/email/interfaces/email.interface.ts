export interface EmailPayload {
  sender: string;
  recipients: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}
