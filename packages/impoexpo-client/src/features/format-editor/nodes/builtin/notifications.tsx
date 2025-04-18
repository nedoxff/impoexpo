import * as notificationNodes from "@impoexpo/shared/nodes/builtin/notifications";

import { Icon } from "@iconify/react";
import { msg } from "@lingui/core/macro";
import {
	registerCategory,
	registerWithDefaultRenderer,
} from "../renderable-node-database";
import { nodesScope } from "@impoexpo/shared/nodes/node-database";

nodesScope(() => {
	registerCategory("notifications", {
		name: msg`notifications`,
		icon: (size) => <Icon width={size} icon="mdi:message-badge" />,
	});

	registerWithDefaultRenderer(notificationNodes.INFORMATION_NOTIFICATION_NODE, {
		title: msg`information`,
		icon: (size) => <Icon width={size} icon="mdi:information" />,
	});
	registerWithDefaultRenderer(notificationNodes.WARNING_NOTIFICATION_NODE, {
		title: msg`warning`,
		icon: (size) => <Icon width={size} icon="mdi:warning" />,
	});
	registerWithDefaultRenderer(notificationNodes.ERROR_NOTIFICATION_NODE, {
		title: msg`error`,
		icon: (size) => <Icon width={size} icon="mdi:error" />,
	});
});
