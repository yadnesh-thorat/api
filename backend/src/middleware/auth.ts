import { Request, Response, NextFunction } from 'express';

export interface AuthRequest {
    user?: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
    params: any;
    body: any;
    query: any;
    headers: any;
    method: string;
    url: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    req.user = {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'internal@company.com',
        name: 'Internal User',
        role: 'admin'
    };
    next();
};

export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
    req.user = {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'internal@company.com',
        name: 'Internal User',
        role: 'admin'
    };
    next();
};
