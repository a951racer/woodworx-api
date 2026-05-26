import { Request, Response, NextFunction } from 'express';
import Project from '../models/Project';
import Design from '../models/Design';
import Customer from '../models/Customer';
import { NotFoundError, InvalidReferenceError } from '../utils/errors';

/**
 * Validate that designId and customerId reference existing records
 * owned by the authenticated user.
 */
async function validateReferences(
  userId: string,
  designId: string,
  customerId: string
): Promise<void> {
  const [design, customer] = await Promise.all([
    Design.findOne({ _id: designId, userId }),
    Customer.findOne({ _id: customerId, userId }),
  ]);

  if (!design) {
    throw new InvalidReferenceError('Referenced design does not exist');
  }

  if (!customer) {
    throw new InvalidReferenceError('Referenced customer does not exist');
  }
}

/**
 * GET /api/projects
 * List all projects for the authenticated user.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projects = await Project.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/projects/:id
 * Get a single project by ID, scoped to the authenticated user.
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/projects
 * Create a new project for the authenticated user.
 * Validates that designId and customerId reference existing records owned by the user.
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await validateReferences(req.userId!, req.body.designId, req.body.customerId);

    const project = await Project.create({
      ...req.body,
      userId: req.userId,
    });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/projects/:id
 * Update an existing project, scoped to the authenticated user.
 * If designId or customerId are being updated, validates they reference existing records.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Find the existing project first
    const existing = await Project.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!existing) {
      throw new NotFoundError('Project not found');
    }

    // Validate references if designId or customerId are being updated
    const designId = req.body.designId || existing.designId.toString();
    const customerId = req.body.customerId || existing.customerId.toString();

    if (req.body.designId || req.body.customerId) {
      await validateReferences(req.userId!, designId, customerId);
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/projects/:id
 * Delete a project, scoped to the authenticated user.
 */
export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
}
