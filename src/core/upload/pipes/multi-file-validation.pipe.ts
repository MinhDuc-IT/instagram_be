import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { FileValidationPipe } from './file-validation.pipe';

@Injectable()
export class MultiFileValidationPipe implements PipeTransform {
  constructor(private readonly singleFilePipe: FileValidationPipe) {}

  transform(files: Express.Multer.File[], metadata: ArgumentMetadata) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return files.map((file, index) => {
      console.log(`🔍 Checking file[${index}]: ${file.originalname} (${file.mimetype})`);
      return this.singleFilePipe.transform(file, {} as ArgumentMetadata);
    });
  }
}
