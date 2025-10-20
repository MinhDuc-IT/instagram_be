export const UPLOAD_CONSTANTS = {
    MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_VIDEO_SIZE: 500 * 1024 * 1024, // 500MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],

    IMAGE_FOLDER: 'uploads/images',
    VIDEO_FOLDER: 'uploads/videos',

    JOB_POLL_INTERVAL: 2000,
    MAX_JOB_RETENTION_HOURS: 24,
    JOB_CLEANUP_INTERVAL: 3600000, // 1 hour
};