-- AlterTable
ALTER TABLE "modules" ADD COLUMN "is_published" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN "is_published" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "modules_course_id_is_published_order_index_idx" ON "modules"("course_id", "is_published", "order_index");

-- CreateIndex
CREATE INDEX "lessons_module_id_is_published_order_index_idx" ON "lessons"("module_id", "is_published", "order_index");
