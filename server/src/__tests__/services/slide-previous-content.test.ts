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
    const all = await prisma.slide.findMany({
      where: { projectId: testProjectId },
      orderBy: { index: 'asc' }
    });
    const target = all.find(s => s.content === '修饰后');
    expect(target).toBeDefined();
    expect(target!.previousContent).toBe('修饰前');
    expect(target!.content).toBe('修饰后');
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

  it('previousContent 显式传 null 也能写入 null', async () => {
    const user = await prisma.user.findFirst({ where: { username: 'admin' } });
    const slides = [{
      id: 'spc-3', pageType: 'content', contentType: 'text',
      title: 'T', textContent: '显式null', previousContent: null,
      variants: [], variantCount: 1, status: 'idle'
    }];
    await projectService.syncSlides(testProjectId, user!.id, slides, true);
    const all = await prisma.slide.findMany({
      where: { projectId: testProjectId },
      orderBy: { index: 'asc' }
    });
    const target = all.find(s => s.content === '显式null');
    expect(target).toBeDefined();
    expect(target!.previousContent).toBeNull();
  });

  it('upsert update 分支更新 previousContent', async () => {
    const user = await prisma.user.findFirst({ where: { username: 'admin' } });
    // 1) 创建一张带 previousContent 的 slide
    const slidesA = [{
      id: 'spc-upd', pageType: 'content', contentType: 'text',
      title: 'T', textContent: '第一版', previousContent: null,
      variants: [], variantCount: 1, status: 'idle'
    }];
    const resultA = await projectService.syncSlides(testProjectId, user!.id, slidesA, true);
    // create 分支忽略传入 id，需要从返回值获取实际 slide id
    const createdSlide = resultA.items.find((s: any) => s.content === '第一版');
    expect(createdSlide).toBeDefined();
    const realId = createdSlide.id;

    // 2) 第二次 syncSlides 用真实 id → 触发 update 分支
    const slidesB = [{
      id: realId, pageType: 'content', contentType: 'text',
      title: 'T', textContent: '修饰后版', previousContent: '第一版',
      variants: [], variantCount: 1, status: 'idle'
    }];
    await projectService.syncSlides(testProjectId, user!.id, slidesB, true);

    const db = await prisma.slide.findUnique({ where: { id: realId } });
    expect(db).toBeDefined();
    expect(db!.content).toBe('修饰后版');
    expect(db!.previousContent).toBe('第一版');
  });
});
