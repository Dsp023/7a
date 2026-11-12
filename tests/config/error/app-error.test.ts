
import { describe ,it , expect } from "vitest";
import {AppError } from "../../../src/errors/app-error.js";


describe("AppError", () =>{
    it("should be an instance of error ",() =>{
const error = new AppError("test",400,"VALIDATION_ERROR");
expect(error).toBeInstanceOf(AppError);
expect(error).toBeInstanceOf(Error);
    });
    it("should correctly store statuscode,code,message",() =>{
            const message = "Access denied";
    const statusCode = 403;
    const code = "PERMISSION_DENIED";

    const error = new AppError(message, statusCode, code);
    expect(error.message).toBe(message);
    expect(error.statusCode).toBe(statusCode);  
    expect(error.code).toBe(code); 

    });
    it("should have IsOperational defaulting to true",() =>{
        const error = new AppError("Queue is clogged",503,"QUEUE_FULL");
        expect(error.isOperational).toBe(true);
    })
})