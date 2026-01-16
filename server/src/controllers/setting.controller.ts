import { Request, Response } from 'express';
import { SettingService } from '../services/setting.service';

// Returns FULL settings (for internal use / AI service calls)
export const handleGetSettings = async (req: Request, res: Response) => {
    try {
        const settings = await SettingService.getSettings();
        res.json({ success: true, data: settings });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Returns MASKED settings (for frontend display, hides API keys)
export const handleGetMaskedSettings = async (req: Request, res: Response) => {
    try {
        const settings = await SettingService.getMaskedSettings();
        res.json({ success: true, data: settings });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleUpdateSettings = async (req: Request, res: Response) => {
    try {
        const { config } = req.body;
        await SettingService.updateSettings(config);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleResetSettings = async (req: Request, res: Response) => {
    try {
        await SettingService.resetToEnv();
        res.json({ success: true, message: 'Settings reset to environment defaults' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};
