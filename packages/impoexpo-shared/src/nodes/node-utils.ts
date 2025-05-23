import type {
	ObjectEntry,
	BaseNode,
	NodePropertyOptions,
	BaseNodeEntry,
} from "./node-types";
import * as v from "valibot";

export const generic = <T extends string>(name: T) =>
	v.pipe(v.unknown(), v.metadata({ metadataType: "generic", typeName: name }));
export const isGeneric = (
	schema: ObjectEntry,
): schema is ReturnType<typeof generic> => {
	if (isObject(schema))
		return Object.values(schema.entries).some((entry) => isGeneric(entry));
	const metadata = v.getMetadata(schema);
	return "metadataType" in metadata && metadata.metadataType === "generic";
};
export const getGenericName = (schema: ReturnType<typeof generic>): string =>
	schema.pipe[1].metadata.typeName;

export const customType = <T extends v.ObjectEntries = v.ObjectEntries>(
	name: string,
	child: T,
) =>
	v.pipe(
		v.object(child),
		v.metadata({
			metadataType: "custom",
			name,
			generics: Object.values(child)
				.flatMap((c) => genericEntries(c) ?? [])
				.reduce<Record<string, ObjectEntry | null>>((acc, cur) => {
					acc[cur] = null;
					return acc;
				}, {}),
		}),
	);
export const isCustomType = (
	schema: ObjectEntry,
): schema is ReturnType<typeof customType> => {
	const metadata = v.getMetadata(schema);
	return "metadataType" in metadata && metadata.metadataType === "custom";
};
export const resolveCustomType = (
	schema: ReturnType<typeof customType>,
	name: string,
	resolvedWith: ObjectEntry,
) => {
	schema.pipe[1].metadata.generics[name] = resolvedWith;
};
export const getCustomTypeGenerics = (schema: ReturnType<typeof customType>) =>
	schema.pipe[1].metadata.generics;
export const getCustomTypeName = (schema: ReturnType<typeof customType>) =>
	schema.pipe[1].metadata.name;
export const createCustomTypeReplica = (
	schema: ReturnType<typeof customType>,
	newEntries: v.ObjectEntries,
) => {
	return v.pipe(
		v.object(newEntries),
		v.metadata({
			metadataType: "custom",
			name: structuredClone(schema.pipe[1].metadata.name),
			generics: structuredClone(schema.pipe[1].metadata.generics),
		}),
	);
};

export const unwrapNodeIfNeeded = (node: ObjectEntry): ObjectEntry => {
	// NOTE: do not unwrap nullable types here! they must be handled by the user
	// with special nodes.
	if (isOptional(node)) return unwrapNodeIfNeeded(node.wrapped);
	return node;
};

export const getRootSchema = (node: ObjectEntry): ObjectEntry => {
	if (isOptional(node)) return getRootSchema(node.wrapped);
	if (isArray(node)) return getRootSchema(node.item);
	if (isNullable(node)) return getRootSchema(node.wrapped);
	return node;
};

export const isUnion = (
	schema: ObjectEntry,
): schema is ReturnType<typeof v.union> => {
	return schema.type === "union";
};

export const isPipe = (
	schema: ObjectEntry,
): schema is v.SchemaWithPipe<[ObjectEntry, v.GenericPipeAction]> =>
	"pipe" in schema;

export const isOptional = (
	schema: ObjectEntry,
): schema is v.OptionalSchema<ObjectEntry, unknown> => {
	return schema.type === "optional";
};

export const isObject = (
	schema: ObjectEntry,
): schema is v.ObjectSchema<v.ObjectEntries, undefined> => {
	return schema.type === "object";
};

export const isArray = (
	schema: ObjectEntry,
): schema is v.ArraySchema<ObjectEntry, undefined> => {
	return schema.type === "array";
};

export const isRecord = (
	schema: ObjectEntry,
): schema is v.RecordSchema<
	v.GenericSchema<string, string | number | symbol>,
	ObjectEntry,
	undefined
> => {
	return schema.type === "record";
};

export const isPicklist = (
	schema: ObjectEntry,
): schema is v.PicklistSchema<
	NodePropertyOptions<typeof schema>,
	undefined
> => {
	return schema.type === "picklist";
};

export const isEnum = (
	schema: ObjectEntry,
): schema is v.EnumSchema<NodePropertyOptions<typeof schema>, undefined> => {
	return schema.type === "enum";
};

export const isNullable = (
	schema: ObjectEntry,
): schema is v.NullableSchema<ObjectEntry, null> => {
	return schema.type === "nullable";
};

export type ValidatorFunction = (
	dataset: v.UnknownDataset,
	config: v.Config<v.BaseIssue<unknown>>,
) => v.OutputDataset<unknown, v.BaseIssue<unknown>>;

export type DefaultBaseNode = BaseNode<v.ObjectEntries, v.ObjectEntries>;

export const findCompatibleEntry = (
	fromNode: DefaultBaseNode,
	fromEntryKey: string,
	toNode: DefaultBaseNode,
): BaseNodeEntry => {
	const fromEntry = fromNode.entry(fromEntryKey);

	const entries =
		fromEntry.source === "input"
			? Object.keys(toNode.outputSchema?.entries ?? {})
			: Object.keys(toNode.inputSchema?.entries ?? {});
	for (const key of entries) {
		const toEntry = toNode.entry(key);
		if (
			fromEntry.schema.type === toEntry.type ||
			(toEntry.generic && !fromEntry.generic) ||
			(!toEntry.generic && fromEntry.generic)
		)
			return toEntry;
	}

	throw new Error(
		`couldn't find a compatible entry between ${fromNode.category}-${fromNode.name} <=> ${toNode.category}-${toNode.name} (entry ${fromEntryKey}, expects ${fromEntry.type})`,
	);
};

export const genericEntries = (entry: ObjectEntry): string[] | undefined => {
	// NOTE: do not change the order of checks here!
	if (isArray(entry)) return genericEntries(entry.item);
	if (isRecord(entry))
		return [
			...(genericEntries(entry.key) ?? []),
			...(genericEntries(entry.value) ?? []),
		].filter((e) => e !== undefined);
	if (isNullable(entry)) return genericEntries(entry.wrapped);
	if (isObject(entry))
		return Object.values(entry.entries)
			.flatMap((v) => genericEntries(v))
			.filter((v) => v !== undefined);
	if (isGeneric(entry)) return [getGenericName(entry)];
	if (isPipe(entry)) return genericEntries(entry.pipe[0]);
	if (isUnion(entry))
		return entry.options.flatMap((o) => genericEntries(o) ?? []);
	return undefined;
};

export const replaceGenericWithSchema = (
	root: ObjectEntry,
	resolver: ObjectEntry,
	name: string,
): ObjectEntry => {
	if (isGeneric(root) && getGenericName(root) === name) return resolver;

	if (isCustomType(root)) {
		const replica = createCustomTypeReplica(
			root,
			Object.entries(root.entries).reduce<v.ObjectEntries>((acc, cur) => {
				acc[cur[0]] = replaceGenericWithSchema(cur[1], resolver, name);
				return acc;
			}, {}),
		);
		resolveCustomType(replica, name, resolver);
		return replica;
	}

	if (isArray(root))
		return v.array(replaceGenericWithSchema(root.item, resolver, name));
	if (isRecord(root))
		return v.record(
			replaceGenericWithSchema(root.key, resolver, name) as v.GenericSchema<
				string,
				string | number | symbol
			>,
			replaceGenericWithSchema(root.value, resolver, name),
		);
	if (isObject(root)) {
		return v.object(
			Object.entries(root.entries).reduce<v.ObjectEntries>((acc, cur) => {
				acc[cur[0]] = replaceGenericWithSchema(cur[1], resolver, name);
				return acc;
			}, {}),
		);
	}
	if (isNullable(root))
		return v.nullable(replaceGenericWithSchema(root.wrapped, resolver, name));
	if (isPipe(root))
		return v.pipe(
			replaceGenericWithSchema(root.pipe[0], resolver, name),
			...root.pipe.slice(1),
		);

	return root;
};

export const filterObject = <V>(
	obj: Record<string, V>,
	fn: (x: V) => boolean,
) => Object.fromEntries(Object.entries(obj).filter(([, val]) => fn(val)));
