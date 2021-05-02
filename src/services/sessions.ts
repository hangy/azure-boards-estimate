import * as DevOps from "azure-devops-extension-sdk";
import {
    IExtensionDataManager,
    IProjectPageService
} from "azure-devops-extension-api";
import { ISession } from "../model/session";
import { IService } from "./services";
import { getStorageManager } from "./storage";

export interface ISessionService extends IService {
    getSessions(): Promise<ISession[]>;

    getSession(id: string): Promise<ISession | null>;

    saveSession(session: ISession): Promise<ISession>;

    removeSession(id: string): Promise<void>;

    getSettingsValue<T>(projectId: string, id: string): Promise<T>;

    setSettingsValue<T>(projectId: string, id: string, value: T): Promise<void>;
}

export const SessionServiceId = "SessionService";

/**
 * Storage key for the field configuration
 */
export const FieldConfiguration = "field-configuration";

export class SessionService implements ISessionService {
    private manager: IExtensionDataManager | undefined;

    constructor() {
        // Prefetch service
        this.getManager();
    }

    async getSettingsValue<T>(projectId: string, id: string): Promise<T> {
        const manager = await this.getManager();

        return manager.getValue<T>(`${projectId}-${id}`);
    }

    async setSettingsValue<T>(
        projectId: string,
        id: string,
        value: T
    ): Promise<void> {
        const manager = await this.getManager();

        await manager.setValue(`${projectId}-${id}`, value);
    }

    async getSessions(): Promise<ISession[]> {
        const manager = await this.getManager();

        try {
            const sessions: ISession[][] = await manager.getDocuments(
                await this._getCollection(),
                {
                    defaultValue: []
                }
            );
            return sessions.flat();
        } catch {
            return [];
        }
    }

    async getSession(id: string): Promise<ISession | null> {
        const manager = await this.getManager();

        try {
            const session: ISession | null = await manager.getDocument(
                await this._getCollection(),
                id,
                {
                    defaultValue: null
                }
            );

            return session;
        } catch {
            return null;
        }
    }

    async saveSession(session: ISession): Promise<ISession> {
        const manager = await this.getManager();
        await manager.setDocument(await this._getCollection(), session);
        return session;
    }

    async removeSession(id: string): Promise<void> {
        const manager = await this.getManager();
        await manager.deleteDocument(await this._getCollection(), id);
    }

    private async getManager(): Promise<IExtensionDataManager> {
        if (!this.manager) {
            this.manager = await getStorageManager();
        }

        return this.manager;
    }

    private async _getCollection(): Promise<string> {
        const SessionCollection = "sessions";
        const projectPageService = await DevOps.getService<IProjectPageService>(
            "ms.vss-tfs-web.tfs-page-data-service"
        );
        const projectInfo = await projectPageService.getProject();
        return `${SessionCollection}-${projectInfo!.id}`;
    }
}
