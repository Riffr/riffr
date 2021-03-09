declare global {
    namespace NodeJS {
        interface ProcessEnv {
            REACT_APP_BACKEND_IP: string;
            REACT_APP_BACKEND_PORT: number;
        }
    }
}

export {}