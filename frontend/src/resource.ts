
enum PromiseStatus {
    Pending = "pending",
    Resolved = "resolved",
    Rejected = "rejected",
};

class IsPendingError extends Error {};

type Resource<T> = {
    read: () => T | undefined
};

const resource = <T>(promise: Promise<T>) => {
    let status = PromiseStatus.Pending;
    
    let error: any;
    let value: T;
    
    (async () => {
        try {
            console.log('resolving promise');
            if (status != PromiseStatus.Pending) return;

            const result = await promise;
            if (status != PromiseStatus.Pending) return;
            status = PromiseStatus.Resolved;
            value = result;
        } catch(err) {
            if (status == PromiseStatus.Pending) {
                status = PromiseStatus.Rejected;
                error = err;
            }
        }
    }) ();
            
    return {
        read: () => {
            console.log(status);
            switch (status) {
                case PromiseStatus.Resolved:
                    return value;
                case PromiseStatus.Pending:
                    throw promise;    
                case PromiseStatus.Rejected:
                    throw error;
                default:
                    return undefined;
            }
        }
    }
}


export {
    resource,
    PromiseStatus,
    IsPendingError,
};

export type {
    Resource,
};