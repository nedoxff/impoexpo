import * as v from "valibot";

export enum MicrosoftWordPlaceholderType {
	TEXT = "Text",
	LIST = "List",
	GROUPED_LIST = "GroupedList",
}

export type MicrosoftWordTextPatch = {
	type: MicrosoftWordPlaceholderType.TEXT;
	text: string;
};
export type MicrosoftWordListPatch = {
	type: MicrosoftWordPlaceholderType.LIST;
	sublistTitle: MicrosoftWordTextPatch | null;
	items: MicrosoftWordPatch[];
};
export type MicrosoftWordGroupedListItem = {
	title: MicrosoftWordTextPatch;
	items: MicrosoftWordPatch[];
};
export type MicrosoftWordGroupedListPatch = {
	type: MicrosoftWordPlaceholderType.GROUPED_LIST;
	groups: MicrosoftWordGroupedListItem[];
};
export type MicrosoftWordPatch =
	| MicrosoftWordTextPatch
	| MicrosoftWordListPatch
	| MicrosoftWordGroupedListPatch;

export const MicrosoftWordPatchSchema = v.variant("type", [
	v.object({
		type: v.literal(MicrosoftWordPlaceholderType.TEXT),
		text: v.string(),
	}),
	v.object({
		type: v.literal(MicrosoftWordPlaceholderType.LIST),
		sublistTitle: v.nullable(
			v.lazy(
				(): v.GenericSchema<MicrosoftWordTextPatch> =>
					MicrosoftWordPatchSchema.options["0"],
			),
		),
		items: v.array(
			v.lazy(
				(): v.GenericSchema<MicrosoftWordPatch> => MicrosoftWordPatchSchema,
			),
		),
	}),
	v.object({
		type: v.literal(MicrosoftWordPlaceholderType.GROUPED_LIST),
		groups: v.array(
			v.object({
				title: v.lazy(
					(): v.GenericSchema<MicrosoftWordTextPatch> =>
						MicrosoftWordPatchSchema.options["0"],
				),
				items: v.array(
					v.lazy(
						(): v.GenericSchema<MicrosoftWordPatch> => MicrosoftWordPatchSchema,
					),
				),
			}),
		),
	}),
]);

export const MicrosoftWordDocumentPlaceholderSchema = v.object({
	raw: v.string(),
	name: v.string(),
	description: v.nullable(v.string()),
	type: v.enum(MicrosoftWordPlaceholderType),
});

export const MicrosoftWordDocumentLayoutSchema = v.object({
	placeholders: v.array(MicrosoftWordDocumentPlaceholderSchema),
});

export type MicrosoftWordDocumentPlaceholder = v.InferOutput<
	typeof MicrosoftWordDocumentPlaceholderSchema
>;
export type MicrosoftWordDocumentLayout = v.InferOutput<
	typeof MicrosoftWordDocumentLayoutSchema
>;
