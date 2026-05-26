import { Request, Response, NextFunction } from 'express';
import Settings from '../models/Settings';

/**
 * GET /api/settings
 * Get the authenticated user's settings.
 * Auto-creates default settings (imperial, all margins 0) if none exist.
 */
export async function get(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let settings = await Settings.findOne({ userId: req.userId });

    if (!settings) {
      settings = await Settings.create({
        userId: req.userId,
        measurementSystem: 'imperial',
        margins: { length: 0, width: 0, thickness: 0 },
      });
    }

    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/settings
 * Update the authenticated user's settings.
 * Creates settings if they don't exist yet, then applies the update.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const settings = await Settings.findOneAndUpdate(
      { userId: req.userId },
      req.body,
      { new: true, runValidators: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(settings);
  } catch (error) {
    next(error);
  }
}
