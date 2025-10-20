export class TransformOptionsDto {
    width?: number;
    height?: number;
    crop?: 'fill' | 'fit' | 'crop' | 'thumb' | 'scale';
    gravity?: string;
    quality?: number | 'auto';
    format?: string;
    fetchFormat?: 'auto' | 'jpg' | 'png' | 'webp';
    dpr?: 'auto' | number;
    angle?: number;
    overlay?: string;
    underlay?: string;
    radius?: number | 'max';
    background?: string;
    opacity?: number;
    videoCodec?: string;
    audioCodec?: string;
    bitRate?: string;
    duration?: number;
    startOffset?: number;
    endOffset?: number;
}