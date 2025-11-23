export const UPLOAD_CONSTANTS = {
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB

    ALLOWED_IMAGE_TYPES: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
    ],

    ALLOWED_VIDEO_TYPES: [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
    ],

    IMAGE_FOLDER: 'uploads/images',
    VIDEO_FOLDER: 'uploads/videos',

    JOB_CLEANUP_INTERVAL: 3600000, // 1 hour
    MAX_JOB_RETENTION_HOURS: 24,

    QUEUE_NAME: 'upload',
};

export const JOB_TYPES = {
    UPLOAD_IMAGE: 'upload-image',
    UPLOAD_VIDEO: 'upload-video',
    UPLOAD_IMAGE_POST: 'upload-image-post',
    UPLOAD_VIDEO_POST: 'upload-video-post',
} as const;