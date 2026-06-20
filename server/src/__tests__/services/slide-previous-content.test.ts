import { describe, it, expect, beforeAll } from 'bun:test';
import { prisma } from '../../db';
import { projectService } from '../../services/project.service';

describe('syncSlides previousContent', () => {
  let testProjectId: string;

  beforeAll(async () => {
    const user = await prisma.user.findFirst({ where: { username: 'admin' } });
    const project = await prisma.project.create({
      data: { title: 'test-previous-content', userId: user!.id, globalConfig: '{}' }
    });
    testProjectId = project.id;
  });

  it('写入带 previousContent 的 slide 能读回', async () => {
    const user = await prisma.user.findFirst({ where: { username: 'admin' } });
    const slides = [{
      id: 'spc-1', pageType: 'content', contentType: 'text',
      title: 'T', textContent: '修饰后', previousContent: '修饰前',
      variants: [], variantCount: 1, status: 'idle'
    }];
    await projectService.syncSlides(testProjectId, user!.id, slides, true);
    // syncSlides create 分支不保留传入 id（由 DB 自动生成），故按 projectId 查找
    const all = await prisma.slide.findMany({
      where: { projectId: testProjectId },
      orderBy: { index: 'asc' }
    });
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all[0].previousContent).toBe('修饰前');
    expect(all[0].content).toBe('修饰后');
  });

  it('previousContent 缺省时写入 null（旧数据兼容）', async () => {
    const user = await prisma.user.findFirst({ where: { username: 'admin' } });
    const slides = [{
      id: 'spc-2', pageType: 'content', contentType: 'text',
      title: 'T', textContent: '无历史', variants: [], variantCount: 1, status: 'idle'
    }];
    await projectService.syncSlides(testProjectId, user!.id, slides, true);
    const all = await prisma.slide.findMany({
      where: { projectId: testProjectId },
      orderBy: { index: 'asc' }
    });
    const target = all.find(s => s.content === '无历史');
    expect(target).toBeDefined();
    expect(target!.previousContent).toBeNull();
  });
});
