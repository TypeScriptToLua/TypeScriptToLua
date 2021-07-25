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

// eslint-disable-next-line @typescript-eslint/promise-function-async
function __TS__AsyncAwaiter(this: void, generator: (this: void) => void) {
    return new Promise((resolve, reject) => {
        const asyncCoroutine = coroutine.create(generator);

        // eslint-disable-next-line @typescript-eslint/promise-function-async
        function adopt(value: unknown) {
            return value instanceof __TS__Promise ? value : Promise.resolve(value);
        }
        function fulfilled(value) {
            try {
                const [running, result] = coroutine.resume(asyncCoroutine, value);
                step(running, result);
            } catch (e) {
                reject(e);
            }
        }
        let lastData: unknown;
        function step(running: boolean, result: unknown) {
            if (!running) {
                resolve(lastData);
            } else {
                // Not possible to determine if a running === true will be the last one, once it's false the data to return is lost, so save it.
                lastData = result;
                adopt(result).then(fulfilled, reason => reject(reason));
            }
        }
        const [running, result] = coroutine.resume(asyncCoroutine);
        step(running, result);
    });
}

function __TS__Await(this: void, thing: unknown) {
    return coroutine.yield(thing);
}
