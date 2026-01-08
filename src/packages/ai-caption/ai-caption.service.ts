import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerateCaptionDto } from './dto/generate-caption.dto';

@Injectable()
export class AiCaptionService {
    private readonly logger = new Logger(AiCaptionService.name);
    private readonly n8nWebhookUrl: string;
    private readonly authHeader: string | null = null;

    constructor(private readonly configService: ConfigService) {
        this.n8nWebhookUrl = this.configService.get<string>('N8N_CAPTION_WEBHOOK_URL') || '';

        const user = this.configService.get<string>('N8N_WEBHOOK_USER');
        const pass = this.configService.get<string>('N8N_WEBHOOK_PASS');

        if (user && pass) {
            this.logger.log('Basic Auth credentials found for n8n webhook');
            this.authHeader = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
        }
    }

    async generateCaption(dto: GenerateCaptionDto, files?: Express.Multer.File[]) {
        try {
            this.logger.log(`Requesting AI caption from: ${this.n8nWebhookUrl}`);

            const headers: Record<string, string> = {};
            if (this.authHeader) {
                headers['Authorization'] = this.authHeader;
            }

            let body: any;
            let curlFields = ""; // Biến phụ trợ để xây dựng lệnh cURL

            if (files && files.length > 0) {
                const formData = new FormData();

                // QUAN TRỌNG: n8n mặc định tìm file trong key "data"
                // Gửi nhiều file với cùng key 'data' hoặc đánh số nếu n8n yêu cầu
                files.forEach((file, index) => {
                    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
                    formData.append('data', blob, file.originalname);
                    curlFields += `--form "data=@${file.originalname}" `;
                });

                Object.keys(dto).forEach(key => {
                    if (dto[key] !== undefined && dto[key] !== null) {
                        const value = String(dto[key]);
                        formData.append(key, value);
                        curlFields += `\\\n--form "${key}=${value}" `;
                    }
                });

                body = formData;
                // Với FormData, để fetch tự set Content-Type kèm boundary, đừng set thủ công.
            } else {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify(dto);
                curlFields = `-d '${body}'`;
            }

            // --- LOG CURL CHUẨN ---
            console.log("--- DEBUG cURL COMMAND ---");
            const headerLogs = Object.entries(headers)
                .map(([k, v]) => `-H "${k}: ${v}"`)
                .join(" \\\n");

            console.log(`curl -X POST "${this.n8nWebhookUrl}" \\\n${headerLogs} \\\n${curlFields}`);
            console.log("--------------------------");

            const response = await fetch(this.n8nWebhookUrl, {
                method: 'POST',
                headers,
                body,
            });

            const responseText = await response.text();

            if (!response.ok) {
                this.logger.error(`n8n webhook error: ${response.status} - ${responseText}`);
                throw new InternalServerErrorException(`AI Provider error: ${response.status}`);
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                this.logger.error(`Failed to parse n8n response as JSON: ${responseText}`);
                throw new InternalServerErrorException('Invalid JSON from AI provider');
            }

            let finalizedData = data;
            if (Array.isArray(data) && data.length > 0) {
                finalizedData = data[0];
            }

            if (!finalizedData || !Array.isArray(finalizedData.captions)) {
                throw new InternalServerErrorException('Invalid response structure from AI provider');
            }

            return finalizedData;
        } catch (error) {
            this.logger.error(`Error in generateCaption: ${error.stack || error.message}`);
            if (error instanceof InternalServerErrorException) throw error;
            throw new InternalServerErrorException(`Caption generation failed: ${error.message}`);
        }
    }
}
