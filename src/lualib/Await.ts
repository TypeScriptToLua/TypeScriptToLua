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

import { __TS__Promise } from "./Promise";

const coroutine = _G.coroutine ?? {};
const cocreate = coroutine.create;
const coresume = coroutine.resume;
const costatus = coroutine.status;
const coyield = coroutine.yield;

// Be extremely careful editing this function. A single non-tail function call may ruin chained awaits performance
// eslint-disable-next-line @typescript-eslint/promise-function-async
export function __TS__AsyncAwaiter(this: void, generator: (this: void) => void) {
    return new Promise((resolve, reject) => {
        let resolved = false;
        const asyncCoroutine = cocreate(generator);

        function fulfilled(value: unknown): void {
            const [success, resultOrError] = coresume(asyncCoroutine, value);
            if (success) {
                // `step` never throws. Tail call return is important!
                return step(resultOrError);
            }
            // `reject` should never throw. Tail call return is important!
            return reject(resultOrError);
        }

        function step(this: void, result: unknown): void {
            if (resolved) {
                return;
            }
            if (costatus(asyncCoroutine) === "dead") {
                // `resolve` never throws. Tail call return is important!
                return resolve(result);
            }
            // We cannot use `then` because we need to avoid calling `coroutine.resume` from inside `pcall`
            // `fulfilled` and `reject` should never throw. Tail call return is important!
            return __TS__Promise.resolve(result).addCallbacks(fulfilled, reject);
        }

        const [success, resultOrError] = coresume(asyncCoroutine, (v: unknown) => {
            resolved = true;
            return __TS__Promise.resolve(v).addCallbacks(resolve, reject);
        });
        if (success) {
            return step(resultOrError);
        } else {
            return reject(resultOrError);
        }
    });
}

export function __TS__Await(this: void, thing: unknown) {
    return coyield(thing);
}
