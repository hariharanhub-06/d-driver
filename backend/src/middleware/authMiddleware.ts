import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('DEBUG: Auth Header:', authHeader);
    if (!token) {
        console.log('DEBUG: No token provided');
        return res.status(401).json({ message: 'No token provided' });
    }

    const secret = process.env.JWT_SECRET || 'd_driver_super_secret';
    jwt.verify(token, secret, (err: any, user: any) => {
        if (err) {
            console.error('DEBUG: Token Verification Failed:', err.message);
            return res.status(403).json({ message: 'Invalid or expired token', error: err.message });
        }
        console.log('DEBUG: Token Verified for User:', user.name, 'Role:', user.role);
        req.user = user;
        next();
    });
};

export const requireRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            console.log('DEBUG: Forbidden. User Role:', req.user?.role, 'Required Roles:', roles);
            return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
        }
        next();
    };
};
