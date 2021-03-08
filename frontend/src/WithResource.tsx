import React, { Suspense } from "react";
import { Resource } from "./resource";

interface WithResourceProps<T> {
    fallback: React.FC;
    resource: Resource<T>
};

type ResourceProps<P, T> = P & {resource: Resource<T>};

const withResource = <T, P>(
    Component: React.FC<ResourceProps<P, T>>
): React.FC<P & WithResourceProps<T>> => 
    (props: P & WithResourceProps<T>) => {
        const { fallback, resource } = props
        return <Suspense fallback={fallback}>
            <Component {...props} resource={resource} />
        </Suspense>
    };

export {
    withResource
};