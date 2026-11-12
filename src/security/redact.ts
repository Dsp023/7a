import { access } from "fs";

const REDACT = "[REDACTED]";

const SENSITIVE_KEY_REGEX = 
/^(password|passwd|secret|token|api[-_]?key|access[-_]?token|gateway[-_]?token|authorization|cookie)$/i;

const SECRET_VALUE_PATTERNS: RegExp[] = [
    /AIza[0-9A-Za-z\-_]{20,}/g,                         
  /sk-[A-Za-z0-9\-_]{16,}/g,                             
  /gh[pousr]_[A-Za-z0-9]{20,}/g,                          
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,                    
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g 

];
function redactString(input: string): string{
    
    let result = input;
    for(const pattern of SECRET_VALUE_PATTERNS){
        if(pattern.source.startsWith("Bearer")){
   result = result.replace(pattern,`Bearer ${REDACT}`);
        }
   else{result = result.replace(pattern, REDACT)};     
    }
    return result;

    }
    function redactValue(value: unknown,seen:WeakSet<object>): unknown {
         if(typeof value === "string"){
            return redactString(value);
         }
         if(value === null || typeof value !== "object"){
            return value;
         }
         if(seen.has(value)){
            return "[Circular]";
         }
         seen.add(value);

         if (value instanceof Error){
return {
    name: value.name,
    message: redactString(value.message),
};
         }
         if(Array.isArray(value)){
            return value.map((item) => redactValue(item, seen));

         }
         const output: Record<string, unknown> = {};
         for(const [key,val] of Object.entries(value)){
            if(SENSITIVE_KEY_REGEX.test(key)){
                output[key] = REDACT;
            }else{
                output[key] = redactValue(val,seen);
            }

         }
         return output;
    }
    export function redactSecrets(value: unknown): unknown{
     return redactValue(value,new WeakSet<object>() );    
    }
