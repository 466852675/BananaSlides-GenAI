/**
 * 现有资源文件迁移脚本
 *
 * 将 uploads 目录中现有的文件迁移到 AssetRegistry
 * 尝试关联到项目、模板或收藏
 *
 * 使用方式:
 *   npx ts-node scripts/migrate-assets.ts
 */

import { PrismaClient, AssetType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// ============================================================
// 配置
// ============================================================

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const ORPHANED_THRESHOLD_DAYS = 7;

// ============================================================
// 统计
// ============================================================

interface MigrationStats {
  total: number;
  linked: number;
  referenced: number;
  orphaned: number;
  errors: number;
}

const stats: MigrationStats = {
  total: 0,
  linked: 0,
  referenced: 0,
  orphaned: 0,
  errors: 0
};

// ============================================================
// 主函数
// ============================================================

async function migrateExistingAssets() {
  console.log('========================================');
  console.log('  现有资源文件迁移脚本');
  console.log('========================================\n');

  // 1. 扫描 uploads 目录
  console.log('[1/4] 扫描 uploads 目录...');
  const files = await scanUploadsDirectory();
  stats.total = files.length;
  console.log(`      发现 ${files.length} 个文件\n`);

  if (files.length === 0) {
    console.log('没有需要迁移的文件');
    return;
  }

  // 2. 加载关联数据
  console.log('[2/4] 加载项目、模板、收藏数据...');
  const [projects, templates, favorites] = await Promise.all([
    prisma.project.findMany({
      select: { id: true, title: true, thumbnailUrl: true, createdAt: true, styleMap: true, globalConfig: true }
    }),
    prisma.styleTemplate.findMany({
      select: { id: true, name: true, styleMap: true, config: true, createdAt: true }
    }),
    prisma.favorite.findMany({
      select: { id: true, name: true, styleMap: true, config: true, sampleImages: true, createdAt: true }
    })
  ]);
  console.log(`      项目: ${projects.length}, 模板: ${templates.length}, 收藏: ${favorites.length}\n`);

  // 3. 迁移每个文件
  console.log('[3/4] 迁移文件...');
  for (const file of files) {
    try {
      const result = await migrateFile(file, { projects, templates, favorites });
      if (result.linked) {
        stats.linked++;
        console.log(`      ✓ ${file.name} → 项目 ${result.projectId?.substring(0, 8)}...`);
      } else if (result.referenced) {
        stats.referenced++;
        console.log(`      ✓ ${file.name} → 被引用`);
      } else {
        stats.orphaned++;
        console.log(`      ⚠ ${file.name} → 孤立文件 (给予 ${ORPHANED_THRESHOLD_DAYS} 天观察期)`);
      }
    } catch (err) {
      stats.errors++;
      console.error(`      ✗ ${file.name} → 迁移失败: ${err}`);
    }
  }
  console.log();

  // 4. 输出统计
  console.log('[4/4] 迁移完成');
  console.log('----------------------------------------');
  console.log(`  总文件数:     ${stats.total}`);
  console.log(`  关联项目:     ${stats.linked}`);
  console.log(`  被引用:       ${stats.referenced}`);
  console.log(`  孤立文件:     ${stats.orphaned}`);
  console.log(`  错误:         ${stats.errors}`);
  console.log('========================================\n');

  // 提示孤立文件处理
  if (stats.orphaned > 0) {
    console.log(`提示: ${stats.orphaned} 个孤立文件将在 ${ORPHANED_THRESHOLD_DAYS} 天后自动清理`);
    console.log('      如需保留，请手动关联到项目或在管理后台标记保护\n');
  }
}

// ============================================================
// 扫描文件
// ============================================================

async function scanUploadsDirectory(): Promise<{ name: string; path: string; stat: fs.Stats }[]> {
  const files: { name: string; path: string; stat: fs.Stats }[] = [];

  if (!fs.existsSync(UPLOADS_DIR)) {
    return files;
  }

  const entries = fs.readdirSync(UPLOADS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    // 跳过目录
    if (entry.isDirectory()) {
      // 递归扫描子目录
      const subDir = path.join(UPLOADS_DIR, entry.name);
      const subEntries = fs.readdirSync(subDir, { withFileTypes: true });
      for (const subEntry of subEntries) {
        if (subEntry.isFile()) {
          const filePath = path.join(subDir, subEntry.name);
          const stat = fs.statSync(filePath);
          files.push({
            name: `${entry.name}/${subEntry.name}`,
            path: filePath,
            stat
          });
        }
      }
      continue;
    }

    const filePath = path.join(UPLOADS_DIR, entry.name);
    const stat = fs.statSync(filePath);
    files.push({
      name: entry.name,
      path: filePath,
      stat
    });
  }

  return files;
}

// ============================================================
// 迁移单个文件
// ============================================================

interface MigrationResult {
  linked: boolean;
  referenced: boolean;
  projectId?: string;
  templateId?: string;
  favoriteId?: string;
}

async function migrateFile(
  file: { name: string; path: string; stat: fs.Stats },
  context: {
    projects: any[];
    templates: any[];
    favorites: any[];
  }
): Promise<MigrationResult> {
  const { projects, templates, favorites } = context;
  const url = `/uploads/${file.name}`;
  const filename = path.basename(file.name);

  // 检查是否已存在
  const existing = await prisma.assetRegistry.findFirst({
    where: { url }
  });

  if (existing) {
    return { linked: !!existing.projectId, referenced: existing.isReferenced, projectId: existing.projectId || undefined };
  }

  // 1. 尝试匹配项目
  let matchedProject = null;

  // 方法1: 通过时间匹配（24小时内创建的项目）
  const fileDate = file.stat.birthtime || file.stat.mtime;
  matchedProject = projects.find(p => {
    const projectDate = new Date(p.createdAt);
    const diffMs = Math.abs(projectDate.getTime() - fileDate.getTime());
    return diffMs < 24 * 60 * 60 * 1000; // 24小时内
  });

  // 方法2: 通过文件名包含项目ID
  if (!matchedProject) {
    matchedProject = projects.find(p => file.name.includes(p.id));
  }

  // 方法3: 检查项目的 thumbnailUrl
  if (!matchedProject) {
    matchedProject = projects.find(p => p.thumbnailUrl && p.thumbnailUrl.includes(file.name));
  }

  // 2. 检查是否被模板引用
  let isReferenced = false;
  let matchedTemplate = null;

  for (const template of templates) {
    const styleMap = template.styleMap || '';
    const config = template.config || '';
    if (styleMap.includes(file.name) || styleMap.includes(url) ||
        config.includes(file.name) || config.includes(url)) {
      isReferenced = true;
      matchedTemplate = template;
      break;
    }
  }

  // 3. 检查是否被收藏引用
  let matchedFavorite = null;

  if (!isReferenced) {
    for (const favorite of favorites) {
      const styleMap = favorite.styleMap || '';
      const config = favorite.config || '';
      const sampleImages = favorite.sampleImages || '[]';

      if (styleMap.includes(file.name) || styleMap.includes(url) ||
          config.includes(file.name) || config.includes(url) ||
          sampleImages.includes(file.name) || sampleImages.includes(url)) {
        isReferenced = true;
        matchedFavorite = favorite;
        break;
      }
    }
  }

  // 4. 确定资源类型
  const type = determineAssetType(file.name);

  // 5. 创建资源记录
  const asset = await prisma.assetRegistry.create({
    data: {
      type,
      status: 'ACTIVE',
      url,
      filename,
      projectId: matchedProject?.id || null,
      templateId: matchedTemplate?.id || null,
      favoriteId: matchedFavorite?.id || null,
      isReferenced,
      sizeBytes: file.stat.size,
      createdAt: fileDate
    }
  });

  return {
    linked: !!matchedProject,
    referenced: isReferenced,
    projectId: matchedProject?.id,
    templateId: matchedTemplate?.id,
    favoriteId: matchedFavorite?.id
  };
}

// ============================================================
// 辅助函数
// ============================================================

function determineAssetType(filename: string): AssetType {
  const ext = path.extname(filename).toLowerCase();

  if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
    // 根据路径判断
    if (filename.includes('gen_ai') || filename.includes('generated')) return 'IMAGE';
    if (filename.includes('asset')) return 'IMAGE';
    if (filename.includes('thumbnail')) return 'THUMBNAIL';
    return 'IMAGE';
  }

  if (ext === '.pdf') return 'DOCUMENT';
  if (['.pptx', '.ppt'].includes(ext)) return 'DOCUMENT';
  if (['.docx', '.doc'].includes(ext)) return 'DOCUMENT';
  if (ext === '.zip') return 'EXPORT_ZIP';

  return 'USER_UPLOAD';
}

// ============================================================
// 执行
// ============================================================

migrateExistingAssets()
  .then(async () => {
    await prisma.$disconnect();
    console.log('迁移脚本执行完毕');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('迁移脚本执行失败:', err);
    await prisma.$disconnect();
    process.exit(1);
  });