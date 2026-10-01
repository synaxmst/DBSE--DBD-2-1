import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationSource = 'body' | 'query' | 'params';

/**
 * Express middleware to validate request payload against a Zod schema
 */
export const validate = (
  schema: ZodSchema,
  source: ValidationSource = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dataToValidate = req[source];
      const parsed = await schema.parseAsync(dataToValidate);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          error: 'Validation failed.',
          details: errorMessages,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Invalid request data.',
      });
    }
  };
};
