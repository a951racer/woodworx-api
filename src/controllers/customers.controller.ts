import { Request, Response, NextFunction } from 'express';
import Customer from '../models/Customer';
import { NotFoundError } from '../utils/errors';

/**
 * GET /api/customers
 * List all customers for the authenticated user.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const customers = await Customer.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(customers);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/customers/:id
 * Get a single customer by ID, scoped to the authenticated user.
 * Populates associated projects.
 */
export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).populate('projects');

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    res.status(200).json(customer);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/customers
 * Create a new customer for the authenticated user.
 */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const customer = await Customer.create({
      ...req.body,
      userId: req.userId,
    });

    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/customers/:id
 * Update an existing customer, scoped to the authenticated user.
 */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    res.status(200).json(customer);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/customers/:id
 * Delete a customer, scoped to the authenticated user.
 */
export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
}
