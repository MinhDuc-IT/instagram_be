import { IFullAudited } from '../../commons/interfaces/audited.interface';

export class UploadedAssetEntity implements IFullAudited {
    id: string;
    publicId: string;
    type: 'image' | 'video';
    fileName: string;
    url: string;
    secureUrl: string;
    format: string;
    width?: number;
    height?: number;
    duration?: number;
    fileSize: number;
    folder: string;
    tags: string[];

    // Audit fields
    createdDate: Date;
    createdBy?: string | null;
    modifiedDate: Date;
    modifiedBy?: string | null;
    deleted: boolean;
    deletedDate?: Date | null;
    deletedBy?: string | null;
}