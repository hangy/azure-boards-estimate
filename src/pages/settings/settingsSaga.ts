import { getService } from "azure-devops-extension-sdk";
import { SagaIterator } from "redux-saga";
import { call, put, takeEvery } from "redux-saga/effects";
import { Services } from "../../services/services";
import {
    ISessionService,
    SessionServiceId,
    BackendConfiguration,
    FieldConfiguration
} from "../../services/sessions";
import { IWorkItemService, WorkItemServiceId } from "../../services/workItems";
import { init, loaded, setField, setBackendUrl } from "./settingsActions";

export function* rootSettingsSaga(): SagaIterator {
    yield takeEvery(init.type, initSaga);

    yield takeEvery(setField.type, setFieldSaga);

    yield takeEvery(setBackendUrl.type, setBackendSaga);
}

function* initSaga(): SagaIterator {
    const projectService: any = yield call(
        getService,
        "ms.vss-tfs-web.tfs-page-data-service"
    );
    const projectInfo: any = yield call([
        projectService,
        projectService.getProject
    ]);

    // Get work item type configuration for project
    const workItemService =
        Services.getService<IWorkItemService>(WorkItemServiceId);
    const workItemTypes: any = yield call(
        [workItemService, workItemService.getWorkItemTypes],
        projectInfo.id
    );

    const fields: any = yield call(
        [workItemService, workItemService.getFields],
        projectInfo.id
    );

    yield put(
        loaded({
            workItemTypes,
            fields
        })
    );
}

export function* setFieldSaga(
    action: ReturnType<typeof setField>
): SagaIterator {
    const workItemType = action.payload;

    const projectService: any = yield call(
        getService,
        "ms.vss-tfs-web.tfs-page-data-service"
    );
    const projectInfo: any = yield call([
        projectService,
        projectService.getProject
    ]);

    const service = Services.getService<ISessionService>(SessionServiceId);

    let configuration: any = yield call(
        [service, service.getSettingsValue as any],
        projectInfo.id,
        FieldConfiguration
    );
    if (!configuration) {
        configuration = {};
    }

    configuration[workItemType.name] = workItemType;

    yield call(
        [service, service.setSettingsValue as any],
        projectInfo.id,
        FieldConfiguration,
        configuration
    );
}

export function* setBackendSaga(
    action: ReturnType<typeof setBackendUrl>
): SagaIterator {
    const baseUrl = action.payload;

    const projectService: any = yield call(
        getService,
        "ms.vss-tfs-web.tfs-page-data-service"
    );
    const projectInfo: any = yield call([
        projectService,
        projectService.getProject
    ]);

    const service = Services.getService<ISessionService>(SessionServiceId);

    let configuration: any = yield call(
        [service, service.getSettingsValue as any],
        projectInfo.id,
        BackendConfiguration
    );
    if (!configuration) {
        configuration = {};
    }

    configuration.baseUrl = baseUrl;

    yield call(
        [service, service.setSettingsValue as any],
        projectInfo.id,
        BackendConfiguration,
        configuration
    );
}
