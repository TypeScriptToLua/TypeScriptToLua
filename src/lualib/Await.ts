// The following is a translation of the TypeScript async awaiter which uses generators and yields.
// For Lua we use coroutines instead.
//
// Source:
//
// var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
//     function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
//     return new (P || (P = Promise))(function (resolve, reject) {
//         function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
//         function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
//         function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
//         step((generator = generator.apply(thisArg, _arguments || [])).next());
//     });
// };
//

type ErrorHandler = (this: void, error: unknown) => unknown;

// eslint-disable-next-line @typescript-eslint/promise-function-async
function __TS__AsyncAwaiter(this: void, generator: (this: void) => void) {
    return new Promise((resolve, reject) => {
        const asyncCoroutine = coroutine.create(generator);

        // eslint-disable-next-line @typescript-eslint/promise-function-async
        function adopt(value: unknown) {
            return value instanceof __TS__Promise ? value : Promise.resolve(value);
        }
        function fulfilled(value: unknown) {
            const [success, errorOrErrorHandler, resultOrError] = coroutine.resume(asyncCoroutine, value);
            if (success) {
                step(resultOrError, errorOrErrorHandler);
            } else {
                reject(errorOrErrorHandler);
            }
        }
        function rejected(handler: ErrorHandler | undefined) {
            if (handler) {
                return (value: unknown) => {
                    const [success, hasReturnedOrError, returnedValue] = pcall(handler, value);
                    if (success) {
                        if (hasReturnedOrError) {
                            resolve(returnedValue);
                        } else {
                            step(hasReturnedOrError, handler);
                        }
                    } else {
                        reject(hasReturnedOrError);
                    }
                };
            } else {
                // If no catch clause, just reject
                return value => {
                    reject(value);
                };
            }
        }
        function step(result: unknown, errorHandler: ErrorHandler | undefined) {
            if (coroutine.status(asyncCoroutine) === "dead") {
                resolve(result);
            } else {
                adopt(result).then(fulfilled, rejected(errorHandler));
            }
        }
        const [success, errorOrErrorHandler, resultOrError] = coroutine.resume(asyncCoroutine);
        if (success) {
            step(resultOrError, errorOrErrorHandler);
        } else {
            reject(errorOrErrorHandler);
        }
    });
}

function __TS__Await(this: void, errorHandler: ErrorHandler, thing: unknown) {
    return coroutine.yield(errorHandler, thing);
}
