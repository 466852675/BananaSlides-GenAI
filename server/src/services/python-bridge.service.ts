/**
 * Python Bridge Service — 管理与 ppt-master 的 svg_to_pptx Python 转换器的子进程通信
 *
 * 通过 child_process.spawn() 调用 Python 桥接脚本，
 * 将 SVG 文件转换为可编辑的 DrawingML PPTX。
 */

import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const logger = {
  info: (msg: string) => console.log(`[PythonBridge] ${msg}`),
  warn: (msg: string) => console.warn(`[PythonBridge] ${msg}`),
  error: (msg: string) => console.error(`[PythonBridge] ${msg}`),
};

/** Python 环境检测结果 */
interface PythonEnvResult {
  available: boolean;
  pythonPath: string;
  version: string;
}

/** PPTX 转换结果 */
interface ConvertResult {
  success: boolean;
  outputPath: string;
  errors: string[];
}

/** 幻灯片信息（用于批量转换） */
interface SlideInfo {
  svgFilePath: string;
  slideIndex: number;
  title?: string;
}

/** 转换选项 */
interface ConvertOptions {
  mode: 'native' | 'legacy'; // native = DrawingML, legacy = SVG as image
  slideWidth?: number;       // EMU, default 12192000 (16:9)
  slideHeight?: number;      // EMU, default 6858000
}

// Python 可执行文件搜索路径
const PYTHON_BINARIES = ['python3', 'python'];

// ppt-master 项目的可能路径
const PPT_MASTER_PATHS = [
  // 开发环境：项目根目录下的 ppt-master clone
  path.resolve(process.cwd(), '..', 'ppt-master'),
  path.resolve(process.cwd(), 'ppt-master'),
  // server 目录下
  path.resolve(process.cwd(), 'server', 'ppt-master'),
  // 环境变量指定的路径
  process.env.PPT_MASTER_PATH || '',
];

// 桥接脚本路径
const BRIDGE_SCRIPT = path.resolve(
  process.cwd(),
  'python',
  'svg_to_pptx_bridge.py'
);

export class PythonBridgeService {
  private static cachedEnv: PythonEnvResult | null = null;

  /**
   * 检测 Python 环境是否可用
   */
  static async checkEnvironment(): Promise<PythonEnvResult> {
    if (this.cachedEnv) return this.cachedEnv;

    for (const bin of PYTHON_BINARIES) {
      try {
        const result = await this.runCommand(bin, ['--version'], 5000);
        if (result.exitCode === 0 && result.stdout) {
          const version = result.stdout.trim();
          logger.info(`Found Python: ${bin} (${version})`);

          // 验证 python-pptx 是否可用
          const pptxCheck = await this.runCommand(
            bin,
            ['-c', 'import pptx; print(pptx.__version__)'],
            5000
          );

          const pptxAvailable = pptxCheck.exitCode === 0;
          if (!pptxAvailable) {
            logger.warn('python-pptx not installed — SVG→PPTX conversion unavailable');
            logger.warn('Install with: pip install python-pptx svglib Pillow');
          }

          this.cachedEnv = {
            available: pptxAvailable,
            pythonPath: bin,
            version,
          };
          return this.cachedEnv;
        }
      } catch {
        // Try next binary
      }
    }

    this.cachedEnv = {
      available: false,
      pythonPath: '',
      version: '',
    };
    logger.warn('Python not found — SVG→PPTX conversion unavailable');
    return this.cachedEnv;
  }

  /**
   * 找到 ppt-master 的 svg_to_pptx 包路径
   */
  static async findPptMasterPath(): Promise<string | null> {
    for (const candidate of PPT_MASTER_PATHS) {
      if (!candidate) continue;
      try {
        const svgToPptxDir = path.join(
          candidate,
          'skills',
          'ppt-master',
          'scripts',
          'svg_to_pptx'
        );
        await fs.access(svgToPptxDir);
        logger.info(`Found ppt-master at: ${candidate}`);
        return candidate;
      } catch {
        // Not found, try next
      }
    }
    logger.warn('ppt-master not found in any expected location');
    return null;
  }

  /**
   * 批量转换 SVG 幻灯片为 PPTX
   *
   * @param slides 幻灯片列表（SVG 文件路径 + 元数据）
   * @param outputPath 输出 PPTX 文件路径
   * @param options 转换选项
   */
  static async batchConvertToPptx(
    slides: SlideInfo[],
    outputPath: string,
    options?: ConvertOptions
  ): Promise<ConvertResult> {
    const env = await this.checkEnvironment();
    if (!env.available) {
      return {
        success: false,
        outputPath: '',
        errors: ['Python environment not available. Install python-pptx to enable SVG→PPTX conversion.'],
      };
    }

    const pptMasterPath = await this.findPptMasterPath();
    if (!pptMasterPath) {
      return {
        success: false,
        outputPath: '',
        errors: ['ppt-master not found. Clone https://github.com/hugohe3/ppt-master to enable conversion.'],
      };
    }

    // 确保输出目录存在
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // 写入 manifest JSON（传递幻灯片信息给 Python 脚本）
    const manifestPath = path.join(os.tmpdir(), `svg_manifest_${Date.now()}.json`);
    const manifest = {
      slides: slides.map((s) => ({
        svg_path: path.resolve(s.svgFilePath),
        index: s.slideIndex,
        title: s.title || `Slide ${s.slideIndex + 1}`,
      })),
      output: path.resolve(outputPath),
      mode: options?.mode || 'native',
      slide_width: options?.slideWidth || 12192000,
      slide_height: options?.slideHeight || 6858000,
    };
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    // 构建 PYTHONPATH
    const pythonPathEntries = [
      path.join(pptMasterPath, 'skills', 'ppt-master', 'scripts'),
    ];

    // 调用 Python 桥接脚本
    const bridgeArgs = [
      '--mode', 'batch',
      '--manifest', manifestPath,
      '--output', path.resolve(outputPath),
      '--conversion-mode', options?.mode || 'native',
    ];

    const timeoutMs = slides.length * 30000 + 60000; // 30s per slide + 60s overhead

    const result = await this.runCommand(
      env.pythonPath,
      [BRIDGE_SCRIPT, ...bridgeArgs],
      timeoutMs,
      { PYTHONPATH: pythonPathEntries.join(os.platform() === 'win32' ? ';' : ':') }
    );

    // 清理 manifest 文件
    try { await fs.unlink(manifestPath); } catch { /* ignore */ }

    if (result.exitCode === 0) {
      try {
        const jsonResult = JSON.parse(result.stdout.trim());
        if (jsonResult.success) {
          logger.info(`PPTX generated: ${jsonResult.output}`);
          return { success: true, outputPath: jsonResult.output, errors: [] };
        }
        return { success: false, outputPath: '', errors: [jsonResult.error || 'Unknown Python error'] };
      } catch {
        // Python 输出可能不是 JSON（直接输出到 stderr）
        if (result.stderr) {
          return { success: false, outputPath: '', errors: [result.stderr] };
        }
        // 检查输出文件是否存在
        try {
          await fs.access(outputPath);
          return { success: true, outputPath, errors: [] };
        } catch {
          return { success: false, outputPath: '', errors: ['PPTX file not generated'] };
        }
      }
    }

    return {
      success: false,
      outputPath: '',
      errors: [result.stderr || `Python process exited with code ${result.exitCode}`],
    };
  }

  /**
   * 运行命令并等待结果
   */
  private static runCommand(
    command: string,
    args: string[],
    timeoutMs: number,
    extraEnv?: Record<string, string>
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const env = { ...process.env, ...extraEnv };

      const proc = spawn(command, args, { env, timeout: timeoutMs });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code: number | null) => {
        resolve({ exitCode: code ?? 1, stdout, stderr });
      });

      proc.on('error', (err: Error) => {
        resolve({ exitCode: 1, stdout, stderr: err.message });
      });
    });
  }
}

export default PythonBridgeService;