export enum SessionMode {
    Online,
    Offline
}

export enum SessionSource {
    Sprint,
    Query,
    Ids
}

export interface ISession {
    id: string;

    name: string;

    mode: SessionMode;

    version: number;

    source: SessionSource;
    sourceData?: string | number[];

    createdAt: Date;
    createdBy: string;

    cardSet: string;

    /** If set, only the creator of the session can toggle work items or commit values */
    onlyCreatorCanSwitch?: boolean;
}

export interface ISessionInfo {
    label: string;
    value: string;
}

export interface ISessionDisplay {
    session: ISession;
    sessionInfo: ISessionInfo[];
}
