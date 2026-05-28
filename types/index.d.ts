import { FunctionComponent } from "react";

interface universalProps {
    [x: string]: any
}

interface Result<T> {
    code: number
    data: T
    message: string
    status: number
}

export type universalResult<T = {}> = Result<T>

export interface PaginationReq {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    needTotal?: boolean;
    search?: Record<string, string>;
    filters?: Record<string, string[]>;
}

export interface PaginationRes {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface V2ListResponse<T> {
    items: T[];
    pagination: PaginationRes;
}
