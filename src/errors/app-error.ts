export type ErrorCode = 
| "VALIDATION_ERROR"
| "UNAUTHORIZED"
| "PERMISSION_DENIED"
| "ACTION_CANCELLED"
| "QUEUE_FULL"
| "TOOL_NOT_FOUND"
| "INTERNAL_ERROR"
| "TOOL_TIMEOUT";


export class AppError extends Error {
    public readonly isOperational = true;

    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly code: ErrorCode
    ){
        super(message);
        this.name = "AppError";
        Error.captureStackTrace(this,this.constructor);
    }
}