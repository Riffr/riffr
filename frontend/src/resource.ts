
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
    
    promise
        .then((x) => {
            if (status == PromiseStatus.Pending) {
                status = PromiseStatus.Resolved;
                value = x;
            }
        })
        .catch((err) => {
            if (status == PromiseStatus.Pending) {
                status = PromiseStatus.Rejected;
                error = err;
            }
        });
            
    return {
        read: () => {
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