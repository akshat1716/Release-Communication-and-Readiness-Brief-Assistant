-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "currentVersionNum" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseVersion" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "versionNum" INTEGER NOT NULL,
    "packageSnapshot" TEXT NOT NULL,
    "packageHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseItem" (
    "id" TEXT NOT NULL,
    "releaseVersionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadataJson" TEXT,

    CONSTRAINT "ReleaseItem_pkey" PRIMARY KEY ("releaseVersionId", "id")
);

-- CreateTable
CREATE TABLE "CheckResult" (
    "id" TEXT NOT NULL,
    "releaseVersionId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT,

    CONSTRAINT "CheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "releaseVersionId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1.0',
    "model" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Statement" (
    "id" TEXT NOT NULL,
    "releaseVersionId" TEXT NOT NULL,
    "analysisRunId" TEXT,
    "audience" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "citations" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sourceHash" TEXT NOT NULL,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "staleReason" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIClassification" (
    "id" TEXT NOT NULL,
    "releaseVersionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,

    CONSTRAINT "AIClassification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRiskLimitation" (
    "id" TEXT NOT NULL,
    "releaseVersionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "citations" TEXT NOT NULL,

    CONSTRAINT "AIRiskLimitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMissingInfo" (
    "id" TEXT NOT NULL,
    "releaseVersionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,

    CONSTRAINT "AIMissingInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIClaimVerification" (
    "id" TEXT NOT NULL,
    "releaseVersionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "claimText" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "qaCitations" TEXT NOT NULL,

    CONSTRAINT "AIClaimVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalBrief" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "releaseVersionId" TEXT NOT NULL,
    "contentJson" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinalBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseVersion_releaseId_versionNum_key" ON "ReleaseVersion"("releaseId", "versionNum");

-- AddForeignKey
ALTER TABLE "ReleaseVersion" ADD CONSTRAINT "ReleaseVersion_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseItem" ADD CONSTRAINT "ReleaseItem_releaseVersionId_fkey" FOREIGN KEY ("releaseVersionId") REFERENCES "ReleaseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckResult" ADD CONSTRAINT "CheckResult_releaseVersionId_fkey" FOREIGN KEY ("releaseVersionId") REFERENCES "ReleaseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_releaseVersionId_fkey" FOREIGN KEY ("releaseVersionId") REFERENCES "ReleaseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Statement" ADD CONSTRAINT "Statement_releaseVersionId_fkey" FOREIGN KEY ("releaseVersionId") REFERENCES "ReleaseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIClassification" ADD CONSTRAINT "AIClassification_releaseVersionId_fkey" FOREIGN KEY ("releaseVersionId") REFERENCES "ReleaseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRiskLimitation" ADD CONSTRAINT "AIRiskLimitation_releaseVersionId_fkey" FOREIGN KEY ("releaseVersionId") REFERENCES "ReleaseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMissingInfo" ADD CONSTRAINT "AIMissingInfo_releaseVersionId_fkey" FOREIGN KEY ("releaseVersionId") REFERENCES "ReleaseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIClaimVerification" ADD CONSTRAINT "AIClaimVerification_releaseVersionId_fkey" FOREIGN KEY ("releaseVersionId") REFERENCES "ReleaseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalBrief" ADD CONSTRAINT "FinalBrief_releaseVersionId_fkey" FOREIGN KEY ("releaseVersionId") REFERENCES "ReleaseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
