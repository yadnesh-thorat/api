declare module 'express' {
    export type Request = any;
    export type Response = any;
    export type NextFunction = any;
    export type Router = any;
    const router: any;
    export { router as Router };
    const express: any;
    export default express;
}

declare module 'js-yaml' {
    const yaml: any;
    export default yaml;
    export const load: any;
    export const dump: any;
}

declare module 'jsonwebtoken' {
    export const sign: any;
    export const verify: any;
    export const decode: any;
}

declare module 'uuid' {
    export const v4: any;
}

declare module 'bcryptjs' {
    export const hash: any;
    export const compare: any;
}

declare module 'cors';
declare module 'morgan';
declare module 'pg';
