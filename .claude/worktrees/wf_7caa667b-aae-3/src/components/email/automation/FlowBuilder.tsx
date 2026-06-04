"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import TriggerNode from "./nodes/TriggerNode";
import SendEmailNode from "./nodes/SendEmailNode";
import WaitNode from "./nodes/WaitNode";
import ConditionNode from "./nodes/ConditionNode";
import AddTagNode from "./nodes/AddTagNode";
import RemoveTagNode from "./nodes/RemoveTagNode";
import EndNode from "./nodes/EndNode";
import NodeSidebar from "./NodeSidebar";
import NodeConfigPanel from "./NodeConfigPanel";

// Register custom node types
const nodeTypes = {
  trigger: TriggerNode,
  sendEmail: SendEmailNode,
  wait: WaitNode,
  condition: ConditionNode,
  addTag: AddTagNode,
  removeTag: RemoveTagNode,
  end: EndNode,
};

interface FlowBuilderProps {
  initialFlow: { nodes: Node[]; edges: Edge[] };
  onChange?: (flow: { nodes: Node[]; edges: Edge[] }) => void;
  onSave?: (flow: { nodes: Node[]; edges: Edge[] }) => void;
}

function FlowBuilderInner({ initialFlow, onChange, onSave }: FlowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Notify parent of changes
  const notifyChange = useCallback(() => {
    onChange?.({ nodes, edges });
  }, [nodes, edges, onChange]);

  const onConnect = useCallback((connection: Connection) => {
    const newEdge: Edge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      animated: true,
      style: { stroke: "#D4A843", strokeWidth: 2 },
    };
    setEdges((eds) => addEdge(newEdge, eds));
    setTimeout(notifyChange, 0);
  }, [setEdges, notifyChange]);

  // Handle drag and drop from sidebar
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/reactflow-type");
    if (!type) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: getDefaultNodeData(type),
    };

    setNodes((nds) => [...nds, newNode]);
    setTimeout(notifyChange, 0);
  }, [screenToFlowPosition, setNodes, notifyChange]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Update node data from config panel
  const updateNodeData = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n))
    );
    setTimeout(notifyChange, 0);
  }, [setNodes, notifyChange]);

  // Delete selected node
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
    setTimeout(notifyChange, 0);
  }, [setNodes, setEdges, notifyChange]);

  return (
    <div className="flex h-full">
      {/* Left sidebar - draggable node palette */}
      <NodeSidebar />

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: "#D4A843", strokeWidth: 2 },
          }}
          style={{ background: "#0a0a0a" }}
        >
          <Controls
            className="!bg-[#1a1a1a] !border-[#333] !rounded-lg"
            style={{ button: { background: "#1a1a1a", color: "white", borderColor: "#333" } } as any}
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
        </ReactFlow>
      </div>

      {/* Right panel - node configuration */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={updateNodeData}
          onDelete={deleteNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

export default function FlowBuilder(props: FlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <FlowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}

// Default data for new nodes
function getDefaultNodeData(type: string): Record<string, any> {
  switch (type) {
    case "trigger":
      return { triggerType: "manual", config: {} };
    case "sendEmail":
      return { subject: "", templateId: "", htmlContent: "" };
    case "wait":
      return { days: 1, hours: 0, minutes: 0 };
    case "condition":
      return { conditionType: "has_tag", config: {} };
    case "addTag":
      return { tagName: "" };
    case "removeTag":
      return { tagName: "" };
    case "end":
      return {};
    default:
      return {};
  }
}
