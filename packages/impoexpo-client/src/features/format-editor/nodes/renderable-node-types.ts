// this is probably some of the worst typescript code i have ever written
// sorry

import { persistStoreOnReload } from "@/stores/hot-reload";
import type {
	AllowedObjectEntry,
	BaseNode,
} from "@impoexpo/shared/nodes/node-types";
import { unwrapNodeIfNeeded } from "@impoexpo/shared/nodes/node-utils";
import { type MessageDescriptor, i18n } from "@lingui/core";
import { insert } from "@orama/orama";
import type { NodeTypes } from "@xyflow/react";
import type React from "react";
import type { EnumSchema, OptionalSchema, PicklistSchema } from "valibot";
import { create } from "zustand";
import DefaultNodeRenderer from "../DefaultNodeRenderer";
import { searchScope } from "./node-database";

export type NodePropertyMode = "independentOnly" | "dependentOnly" | "hybrid";
export type IconRenderFunction = (size: number) => React.ReactNode;
export const localizableString = (
	str: MessageDescriptor | string,
	localizer?: (msg: MessageDescriptor) => string,
) => (typeof str === "string" ? str : localizer ? localizer(str) : i18n.t(str));

export type RenderableNodesStore = {
	nodeRenderers: NodeTypes;
	nodeRenderOptions: Map<
		string,
		NodeRenderOptions<
			Record<string, AllowedObjectEntry>,
			Record<string, AllowedObjectEntry>
		>
	>;
	categoryRenderOptions: Map<
		string,
		{
			icon: IconRenderFunction;
			name: MessageDescriptor | string;
		}
	>;
};

export type NodeRenderOptions<
	TSInput extends Record<string, AllowedObjectEntry>,
	TSOutput extends Record<string, AllowedObjectEntry>,
> = Partial<{
	categoryIcon: IconRenderFunction;
	headerColor: string;
	searchable: boolean;
	aliases: (MessageDescriptor | string)[];
	title: MessageDescriptor | string;
}> &
	(keyof TSInput extends never
		? // biome-ignore lint/complexity/noBannedTypes: empty type required here
			{}
		: Partial<{
				inputs: Partial<{
					[key in keyof TSInput]: NodePropertyMetadata<TSInput[key], true>;
				}>;
			}>) &
	(keyof TSOutput extends never
		? // biome-ignore lint/complexity/noBannedTypes: empty type required here
			{}
		: Partial<{
				outputs: Partial<{
					[key in keyof TSOutput]: NodePropertyMetadata<TSOutput[key], false>;
				}>;
			}>);

export type NodePropertyOptions<TProperty extends AllowedObjectEntry> =
	TProperty extends OptionalSchema<
		infer TWrappedSchema extends AllowedObjectEntry,
		unknown
	>
		? NodePropertyOptions<TWrappedSchema>
		: TProperty extends PicklistSchema<infer TOptions, undefined>
			? TOptions[number]
			: TProperty extends EnumSchema<
						infer TOptions extends Record<string, string | number>,
						undefined
					>
				? keyof TOptions
				: never;

export type NodePropertyMetadata<
	TProperty extends AllowedObjectEntry,
	TIsInput extends boolean,
> = Partial<
	{
		title: MessageDescriptor | string;
		description: MessageDescriptor | string;
	} & (TIsInput extends true
		? { placeholder: MessageDescriptor | string; mode: NodePropertyMode }
		: // biome-ignore lint/complexity/noBannedTypes: empty type required here
			{}) &
		(NodePropertyOptions<TProperty> extends never
			? // biome-ignore lint/complexity/noBannedTypes: empty type required here
				{}
			: {
					options: Partial<
						Record<
							Exclude<NodePropertyOptions<TProperty>, bigint>,
							NodePropertyOptionsMetadata<MessageDescriptor | string>
						>
					>;
				})
>;

export type NodePropertyOptionsMetadata<T> = Partial<{
	key: string;
	title: T;
	description: T;
}>;

export const registerWithDefaultRenderer = <
	TSInput extends Record<string, AllowedObjectEntry>,
	TSOutput extends Record<string, AllowedObjectEntry>,
>(
	node: BaseNode<TSInput, TSOutput>,
	options: NodeRenderOptions<TSInput, TSOutput>,
) => {
	const type = `${node.category}-${node.name}`;
	useRenderableNodesStore.setState((state) => {
		return {
			nodeRenderers: Object.assign(state.nodeRenderers, {
				[type]: DefaultNodeRenderer,
			}),
			nodeRenderOptions: new Map(state.nodeRenderOptions).set(
				type,
				options ?? {},
			),
		};
	});

	if (options.searchable ?? true) {
		const tags: Set<string> = new Set();
		for (const entry of Object.values(node.inputSchema?.entries ?? [])) {
			tags.add(`accepts:${unwrapNodeIfNeeded(entry).expects}`);
		}
		for (const entry of Object.values(node.outputSchema?.entries ?? [])) {
			tags.add(`outputs:${unwrapNodeIfNeeded(entry).expects}`);
		}

		const categoryRenderOptions = useRenderableNodesStore
			.getState()
			.categoryRenderOptions.get(node.category);

		searchScope((database) => {
			insert(database, {
				category:
					categoryRenderOptions?.name !== undefined
						? localizableString(categoryRenderOptions?.name)
						: node.category,
				name: node.name,
				title:
					options.title !== undefined ? localizableString(options.title) : "",
				id: type,
				aliases: (options.aliases ?? []).map((alias) =>
					localizableString(alias),
				),
				tags: Array.from(tags),
			});
		});
	}
};

export const useRenderableNodesStore = create<RenderableNodesStore>(() => ({
	nodeRenderers: {},
	categoryRenderOptions: new Map(),
	nodeRenderOptions: new Map(),
}));

export const registerCategory = (
	id: string,
	name: MessageDescriptor,
	icon: IconRenderFunction,
) =>
	useRenderableNodesStore.setState((state) => {
		return {
			categoryRenderOptions: new Map(state.categoryRenderOptions).set(id, {
				icon: icon,
				name: name,
			}),
		};
	});

persistStoreOnReload("renderableNodes", useRenderableNodesStore);
