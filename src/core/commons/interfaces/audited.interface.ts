/**
 * Ghi nhận thông tin người tạo
 */
export interface ICreatedBy {
    createdDate?: Date | null;
    createdBy?: string | null;
}

/**
 * Ghi nhận thông tin người chỉnh sửa
 */
export interface IModifiedBy {
    modifiedDate?: Date | null;
    modifiedBy?: string | null;
}

/**
 * Cờ soft delete đơn giản
 */
export interface ISoftDeleted {
    deleted: true | false;
}

/**
 * Ghi nhận thông tin người xóa mềm (soft delete)
 */
export interface ISoftDeletedBy extends ISoftDeleted {
    deletedDate?: Date | null;
    deletedBy?: string | null;
}

/**
 * Tổng hợp toàn bộ thông tin audit
 */
export interface IFullAudited extends ICreatedBy, IModifiedBy, ISoftDeletedBy { }
