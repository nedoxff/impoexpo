import {
	Background,
	type Connection,
	Controls,
	type Edge,
	type FinalConnectionState,
	type Node,
	type OnConnect,
	ReactFlow,
	addEdge,
	getOutgoers,
	useEdgesState,
	useNodesState,
	useReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import "./nodes/builtin/console";
import { useDisclosure } from "@heroui/react";
import { baseNodesMap } from "@impoexpo/shared/nodes/node-database";
import { unwrapNodeIfNeeded } from "@impoexpo/shared/nodes/node-utils";
import { useCallback, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import {
	getHandleSchema,
	getHandleType,
	nodeSchemasCompatible,
} from "./nodes/node-schema-helpers";
import {
	FLOW_HANDLE_MARKER,
	useRenderableNodesStore,
} from "./nodes/renderable-node-types";
import SearchNodesModal from "./search-nodes-modal/SearchNodesModal";
import { useSearchNodesModalStore } from "./search-nodes-modal/store";

const initialNodes: Node[] = [
	{
		id: "meow",
		data: {},
		position: { x: 300, y: 100 },
		type: "console-test-in",
	},
	{
		id: "meow22",
		data: {},
		position: { x: 800, y: 100 },
		type: "console-test-in",
	},
	{
		id: "meow2",
		data: {},
		position: { x: 50, y: 200 },
		type: "console-test-out",
	},
];
const initialEdges: Edge[] = [];

const connectionHasCycles = (
	connection: Connection | Edge,
	getNodes: () => Node[],
	getEdges: () => Edge[],
): boolean => {
	const target = getNodes().find((node) => node.id === connection.target);
	if (!target) return false;
	const hasCycle = (node: Node, visited = new Set()) => {
		if (visited.has(node.id)) return false;

		visited.add(node.id);

		for (const outgoer of getOutgoers(node, getNodes(), getEdges())) {
			if (outgoer.id === connection.source) return true;
			if (hasCycle(outgoer, visited)) return true;
		}

		return false;
	};

	if (target.id === connection.source) return false;
	return hasCycle(target);
};

export default function FormatEditor() {
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
	const {
		onOpen: openSearchModal,
		isOpen: isSearchModalOpen,
		onOpenChange: onSearchModalOpenChange,
	} = useDisclosure({ id: "SEARCH_NODES_MODAL" });
	const { setFilters } = useSearchNodesModalStore();
	// biome-ignore lint/style/noNonNullAssertion: required here
	const containerRef = useRef<HTMLDivElement>(null!);

	const { getNodes, getEdges, screenToFlowPosition } = useReactFlow();
	const nodeRenderers = useRenderableNodesStore(
		useShallow((state) => state.nodeRenderers),
	);
	const onConnect: OnConnect = useCallback(
		(connection) =>
			setEdges((eds) => animateNeededEdges(addEdge(connection, eds))),
		[setEdges],
	);

	const animateNeededEdges = (edges: Edge[]) =>
		edges.map((edge) => {
			edge.animated =
				(edge.sourceHandle ?? "").startsWith(FLOW_HANDLE_MARKER) ||
				(edge.targetHandle ?? "").startsWith(FLOW_HANDLE_MARKER);
			return edge;
		});

	const isValidConnection = useCallback(
		(connection: Connection | Edge) => {
			if (!nodeSchemasCompatible(connection, getNodes)) return false;
			return !connectionHasCycles(connection, getNodes, getEdges);
		},
		[getNodes, getEdges],
	);

	const onConnectEnd = useCallback(
		(event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
			if (
				!connectionState.isValid &&
				connectionState.fromNode?.type &&
				connectionState.fromHandle?.id
			) {
				// biome-ignore lint/style/noNonNullAssertion: guaranteed to exist here
				const node = baseNodesMap.get(connectionState.fromNode.type)!;
				const handleId = connectionState.fromHandle.id;
				const handle = unwrapNodeIfNeeded(getHandleSchema(node, handleId));
				setFilters([
					`${getHandleType(node, handleId) === "input" ? "outputs" : "accepts"}:${handle.expects}`,
				]);
				openSearchModal();

				/* const id = getId();
				const { clientX, clientY } =
					"changedTouches" in event ? event.changedTouches[0] : event; */
				/* const newNode = {
				id,
				position: screenToFlowPosition({
					x: clientX,
					y: clientY,
				}),
				data: { label: `Node ${id}` },
				origin: [0.5, 0.0],
			}; */
				/*  */
			}
		},
		[openSearchModal, setFilters],
	);

	return (
		<div ref={containerRef} className="w-full h-full">
			<ReactFlow
				nodes={nodes}
				nodeTypes={nodeRenderers}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onConnectEnd={onConnectEnd}
				isValidConnection={isValidConnection}
				proOptions={{ hideAttribution: true }}
			>
				<Controls showFitView={false} />
				<Background size={2} />
			</ReactFlow>
			<SearchNodesModal
				portal={containerRef}
				isOpen={isSearchModalOpen}
				onOpenChange={onSearchModalOpenChange}
			/>
		</div>
	);
}
