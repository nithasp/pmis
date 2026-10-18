import type { IUserSystem } from "~/core/interfaces/IUserSystem";
import { RoleTypeEnum } from "~/utils/enums/RoleTypeEnum";
import { UserStatusEnum } from "~/utils/enums/UserStatusEnum";

export const canEdit = (roleType: string, status: string) => {
    let roles = [RoleTypeEnum.DocumentReviewer.toString(), RoleTypeEnum.DocumentApprove.toString()];

    if (roles.includes(roleType) && (status === UserStatusEnum.WaitingApproved || status === UserStatusEnum.Approved))
        return true

    return false
};

export const canApprove = (roleType: string, status: string) => {
    let roles = [RoleTypeEnum.DocumentReviewer.toString(), RoleTypeEnum.DocumentApprove.toString()];

    if (roles.includes(roleType) && status === UserStatusEnum.WaitingApproved)
        return true

    return false
};

export const canResetPassword = (row: IUserSystem) => {
    return row.status === UserStatusEnum.Approved && row.enabled
};
