-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "publicId" VARCHAR(255),
    "url" TEXT,
    "secureUrl" TEXT,
    "fileSize" INTEGER,
    "format" VARCHAR(50),
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(255),
    "modifiedDate" TIMESTAMP(3) NOT NULL,
    "modifiedBy" VARCHAR(255),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedBy" VARCHAR(255),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedAsset" (
    "id" TEXT NOT NULL,
    "publicId" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "url" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "format" VARCHAR(50) NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" DOUBLE PRECISION,
    "fileSize" INTEGER NOT NULL,
    "folder" VARCHAR(255) NOT NULL,
    "tags" TEXT NOT NULL,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(255),
    "modifiedDate" TIMESTAMP(3) NOT NULL,
    "modifiedBy" VARCHAR(255),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedDate" TIMESTAMP(3),
    "deletedBy" VARCHAR(255),

    CONSTRAINT "UploadedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackgroundJob_status_idx" ON "BackgroundJob"("status");

-- CreateIndex
CREATE INDEX "BackgroundJob_createdDate_idx" ON "BackgroundJob"("createdDate");

-- CreateIndex
CREATE INDEX "BackgroundJob_type_idx" ON "BackgroundJob"("type");

-- CreateIndex
CREATE INDEX "BackgroundJob_deleted_idx" ON "BackgroundJob"("deleted");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedAsset_publicId_key" ON "UploadedAsset"("publicId");

-- CreateIndex
CREATE INDEX "UploadedAsset_publicId_idx" ON "UploadedAsset"("publicId");

-- CreateIndex
CREATE INDEX "UploadedAsset_createdDate_idx" ON "UploadedAsset"("createdDate");

-- CreateIndex
CREATE INDEX "UploadedAsset_type_idx" ON "UploadedAsset"("type");

-- CreateIndex
CREATE INDEX "UploadedAsset_deleted_idx" ON "UploadedAsset"("deleted");
