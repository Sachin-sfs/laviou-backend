import 'express';

declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: Express.User;
  }
}
