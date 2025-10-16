-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "userName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "gender" INTEGER,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "authId" TEXT,
    "trialExpiresAt" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "modifiedAt" TIMESTAMP(3),
    "modifiedBy" TEXT,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceName" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "location" TEXT,
    "refreshToken" TEXT NOT NULL,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "refreshTokenFamily" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invalidated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_verifications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "user_devices_userId_idx" ON "user_devices"("userId");

-- CreateIndex
CREATE INDEX "user_tokens_userId_deviceId_idx" ON "user_tokens"("userId", "deviceId");

-- CreateIndex
CREATE INDEX "user_tokens_refreshTokenFamily_idx" ON "user_tokens"("refreshTokenFamily");

-- CreateIndex
CREATE UNIQUE INDEX "user_verifications_token_key" ON "user_verifications"("token");

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "user_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_verifications" ADD CONSTRAINT "user_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
