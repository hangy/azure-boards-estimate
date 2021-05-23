import { call } from "redux-saga/effects";
import * as signalR from "@aspnet/signalr";
import { IEstimate } from "../../model/estimate";
import { IUserInfo } from "../../model/user";
import { IdentityServiceId, IIdentityService } from "../identity";
import { Services } from "../services";
import { defineIncomingOperation, defineOperation, IChannel } from "./channels";
import { ISnapshot } from "../../model/snapshots";
import {
    SessionServiceId,
    ISessionService,
    BackendConfiguration
} from "../sessions";

const fallbackUrl = "https://estimate.hangy.de";

enum Action {
    Join = "join",
    Left = "left",
    Estimate = "estimate",
    EstimateUpdated = "estimate-updated",
    Reveal = "reveal",
    Add = "add",
    Switch = "switch",
    Snapshot = "snapshot"
}

export class SignalRChannel implements IChannel {
    estimate = defineOperation<IEstimate>(async (estimate) => {
        await this.sendToOtherClients(Action.Estimate, estimate);
    });

    estimateUpdated = defineOperation<{
        workItemId: number;
        value: number | string | undefined;
    }>(async (payload) => {
        await this.sendToOtherClients(Action.EstimateUpdated, payload);
    });

    setWorkItem = defineOperation<number>(async (workItemId) => {
        await this.sendToOtherClients(Action.Switch, workItemId);
    });

    revealed = defineOperation<void>(async () => {
        await this.sendToOtherClients(Action.Reveal, null);
    });

    join = defineOperation<IUserInfo>(async (userInfo) => {
        if (this.connection) {
            await this.connection.send(Action.Join, this.sessionId, userInfo);
        }
    });

    left = defineIncomingOperation<string>();

    snapshot = defineOperation<ISnapshot>(async (snapshot) => {
        await this.sendToOtherClients(Action.Snapshot, snapshot);
    });

    private connection: signalR.HubConnection | undefined;
    private sessionId: string = "";

    async start(projectId: string, sessionId: string): Promise<void> {
        this.sessionId = sessionId;

        const service = Services.getService<ISessionService>(SessionServiceId);

        let configuration: any = call(
            [service, service.getSettingsValue as any],
            projectId,
            BackendConfiguration
        );
        if (!configuration) {
            configuration = {};
        }

        const backendUrl = configuration.backendUrl ?? fallbackUrl;

        const identityService =
            Services.getService<IIdentityService>(IdentityServiceId);
        const identity = identityService.getCurrentIdentity();

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(
                `${backendUrl}/estimate?sessionId=${this.sessionId}&tfId=${identity.id}`
            )
            .configureLogging(signalR.LogLevel.Information)
            .build();

        // Hook up handler for all messages the server sends
        this.connection.on("broadcast", this.onReceive);

        // Start connection
        await this.connection.start().catch((err) => {
            // eslint-disable-next-line no-console
            console.error(err.toString());
        });

        // Say hello to other clients
        await this.join({
            tfId: identity.id,
            name: identity.displayName,
            imageUrl: identity.imageUrl
        });

        // Wait for snapshot
    }

    async end(): Promise<void> {
        if (this.connection) {
            await this.connection.stop();
        }
    }

    async sendToOtherClients<TPayload>(action: Action, payload: TPayload) {
        if (this.connection) {
            this.connection.send("broadcast", this.sessionId, action, payload);
        }
    }

    private onReceive = (action: Action, payload: any) => {
        switch (action) {
            case Action.Estimate: {
                // Received estimate from another player
                this.estimate.incoming(payload);
                break;
            }

            case Action.EstimateUpdated: {
                this.estimateUpdated.incoming(payload);
                break;
            }

            case Action.Join: {
                // Another user has joined
                this.join.incoming(payload);
                break;
            }

            case Action.Switch: {
                this.setWorkItem.incoming(payload);
                break;
            }

            case Action.Left: {
                this.left.incoming(payload);
                break;
            }

            case Action.Reveal: {
                this.revealed.incoming(payload);
                break;
            }

            case Action.Snapshot: {
                this.snapshot.incoming(payload);
                break;
            }

            default: {
                console.error("Unknown action received: " + action);
            }
        }
    };
}
