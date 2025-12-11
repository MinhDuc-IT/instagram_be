import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function writeTempFile(buffer: Buffer, filename: string): string {
    // const tempDir = path.join(os.tmpdir(), 'uploads');
    const tempDir = path.join('./tmp/uploads');

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, `${Date.now()}-${filename}`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

export function deleteTempFile(filePath: string) {
    try {
        console.log('Deleting temporary file at:', filePath);
        fs.unlinkSync(filePath);
    } catch {}
}
