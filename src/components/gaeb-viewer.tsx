'use client';

import { ChangeEvent, DragEvent, useMemo, useState } from 'react';

import { GaebDocument, GaebNode, parseGaebXml } from '@/lib/gaeb';

export function GaebViewer() {
  const [gaebDocument, setGaebDocument] = useState<GaebDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<string[]>([]);

  const selectedNode = useMemo(() => {
    if (!gaebDocument || !selectedNodeId) {
      return null;
    }

    return findNodeById(gaebDocument.nodes, selectedNodeId);
  }, [gaebDocument, selectedNodeId]);

  async function handleFile(file: File) {
    try {
      const xml = await file.text();
      const parsed = parseGaebXml(xml);
      const firstSelectableNode = flattenNodes(parsed.nodes).find((node) => node.kind === 'item') ?? parsed.nodes[0];

      setGaebDocument(parsed);
      setSelectedNodeId(firstSelectableNode?.id ?? null);
      setCollapsedNodeIds([]);
      setError(null);
    } catch (unknownError) {
      setGaebDocument(null);
      setSelectedNodeId(null);
      setCollapsedNodeIds([]);
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : 'Die Datei konnte nicht verarbeitet werden.',
      );
    }
  }

  async function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await handleFile(file);
    event.target.value = '';
  }

  async function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    await handleFile(file);
  }

  function toggleNode(nodeId: string) {
    setCollapsedNodeIds((current) =>
      current.includes(nodeId) ? current.filter((id) => id !== nodeId) : [...current, nodeId],
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Projektstart</p>
          <h1 className="text-4xl font-semibold tracking-tight">GAEB Viewer</h1>
          <p className="max-w-3xl text-base leading-7 text-slate-300">
            Ziehe eine GAEB-Datei per Drag &amp; Drop in das Browserfenster. Die Datei wird direkt im
            Browser gelesen und in einer Explorer-ähnlichen Baumstruktur dargestellt.
          </p>
        </header>

        <section
          className={[
            'rounded-3xl border border-dashed p-8 transition',
            isDragging
              ? 'border-cyan-300 bg-cyan-400/10'
              : 'border-slate-700 bg-slate-900/70 hover:border-slate-500',
          ].join(' ')}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">GAEB-Datei hier ablegen</h2>
              <p className="text-slate-300">
                Unterstützt werden XML-basierte GAEB-Dateien wie <code>.x82</code>.
              </p>
            </div>

            <div>
              <label
                htmlFor="gaeb-file-input"
                className="inline-flex cursor-pointer items-center justify-center rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300"
              >
                GAEB-Datei auswählen
              </label>
              <input
                id="gaeb-file-input"
                type="file"
                accept=".x82,.xml,text/xml,application/xml"
                className="sr-only"
                onChange={onInputChange}
              />
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        </section>

        {gaebDocument ? (
          <section className="grid gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
            <section
              aria-label="GAEB Baumstruktur"
              className="pane-scrollbar max-h-[calc(100vh-14rem)] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900/70 p-6"
            >
              <div className="sticky top-0 z-10 -mx-2 mb-5 border-b border-slate-800 bg-slate-900/95 px-2 pb-4 backdrop-blur-sm">
                <h2 className="text-xl font-semibold">Baumstruktur</h2>
                <p className="mt-2 text-sm text-slate-400">
                  {gaebDocument.projectName || 'Projekt ohne Namen'} · LV {gaebDocument.boqName || '—'} · DP{' '}
                  {gaebDocument.dp || '—'}
                </p>
              </div>

              <ul className="space-y-1.5">
                {gaebDocument.nodes.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    selectedNodeId={selectedNodeId}
                    collapsedNodeIds={collapsedNodeIds}
                    onSelect={setSelectedNodeId}
                    onToggle={toggleNode}
                    ozPath={[]}
                  />
                ))}
              </ul>
            </section>

            <DetailPanel document={gaebDocument} node={selectedNode} />
          </section>
        ) : null}
      </div>
    </main>
  );
}

type TreeNodeProps = {
  node: GaebNode;
  depth: number;
  selectedNodeId: string | null;
  collapsedNodeIds: string[];
  onSelect: (nodeId: string) => void;
  onToggle: (nodeId: string) => void;
  ozPath: string[];
};

function TreeNode({
  node,
  depth,
  selectedNodeId,
  collapsedNodeIds,
  onSelect,
  onToggle,
  ozPath,
}: TreeNodeProps) {
  const isSelected = node.id === selectedNodeId;
  const hasChildren = node.children.length > 0;
  const isCollapsed = collapsedNodeIds.includes(node.id);
  const icon = node.kind === 'category' ? '📁' : '📄';
  const connectorClass = depth === 0 ? '' : 'before:absolute before:-left-4 before:top-0 before:h-full before:w-px before:bg-slate-700';
  const fullOz = getFullOz(node, ozPath);

  return (
    <li className={`relative ${connectorClass}`}>
      <div className="flex items-start gap-2">
        {hasChildren ? (
          <button
            type="button"
            aria-label={`Knoten ${node.title} ${isCollapsed ? 'aufklappen' : 'zuklappen'}`}
            className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-slate-600 bg-slate-950 text-xs text-slate-200 hover:border-cyan-400"
            onClick={() => onToggle(node.id)}
          >
            {isCollapsed ? '+' : '−'}
          </button>
        ) : (
          <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-500">·</span>
        )}

        <button
          type="button"
          aria-label={`Eintrag ${node.title} auswählen`}
          className={[
            'grid min-w-0 flex-1 grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-2 rounded-md px-2 py-1.5 text-left transition',
            isSelected ? 'bg-cyan-400/12 text-cyan-100 ring-1 ring-cyan-500/30' : 'hover:bg-slate-800/70',
          ].join(' ')}
          onClick={() => onSelect(node.id)}
        >
          <span aria-hidden="true" className="pt-0.5 text-lg leading-none">
            {icon}
          </span>
          {fullOz ? (
            <span className="mt-0.5 shrink-0 self-start rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
              {fullOz}
            </span>
          ) : null}
          <span className="min-w-0 break-words text-sm font-medium leading-5 text-slate-100">
            {node.title}
          </span>
        </button>
      </div>

      {hasChildren && !isCollapsed ? (
        <ul className="ml-5 mt-1 space-y-1 border-l border-dashed border-slate-700 pl-3">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              collapsedNodeIds={collapsedNodeIds}
              onSelect={onSelect}
              onToggle={onToggle}
              ozPath={appendOzPath(ozPath, node.rNoPart)}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function DetailPanel({ document, node }: { document: GaebDocument; node: GaebNode | null }) {
  return (
    <section
      aria-label="Details zum ausgewählten Baumelement"
      className="pane-scrollbar max-h-[calc(100vh-14rem)] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900/70 p-6"
    >
      <div className="sticky top-0 z-10 -mx-2 border-b border-slate-800 bg-slate-900/95 px-2 pb-4 backdrop-blur-sm">
        <h2 className="text-xl font-semibold">Inhalte</h2>
        <p className="mt-2 text-sm text-slate-400">
          {document.projectName || 'Projekt ohne Namen'} · {document.boqName || 'Leistungsverzeichnis'}
        </p>
      </div>

      {node ? (
        <div className="mt-5 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Ausgewähltes Element</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-50">{node.title}</h3>
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
            <DetailField label="OZ" value={getNodePathOz(document.nodes, node.id)} />
            <DetailField label="Typ" value={mapKind(node.kind)} />
            <DetailField label="Menge" value={node.quantity} />
            <DetailField label="Einheit" value={node.unit} />
            <DetailField label="EP" value={node.unitPrice} />
            <DetailField label="GP" value={node.totalPrice} />
          </dl>

          <TextBlock label="Kurztext" value={node.shortText || node.title} />
          <TextBlock label="Langtext" value={node.detailText || 'Kein Langtext vorhanden.'} />
        </div>
      ) : (
        <p className="mt-5 text-slate-300">Wähle links ein Baumelement aus, um seine Inhalte zu sehen.</p>
      )}
    </section>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="mt-1 text-base text-slate-100">{value || '—'}</dd>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <h4 className="mb-2 text-sm font-semibold text-slate-100">{label}</h4>
      <p className="whitespace-pre-wrap leading-7 text-slate-300">{value}</p>
    </section>
  );
}

function flattenNodes(nodes: GaebNode[]): GaebNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);
}

function findNodeById(nodes: GaebNode[], nodeId: string): GaebNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const inChildren = findNodeById(node.children, nodeId);

    if (inChildren) {
      return inChildren;
    }
  }

  return null;
}

function getNodePathOz(nodes: GaebNode[], nodeId: string, ozPath: string[] = []): string | undefined {
  for (const node of nodes) {
    const nextPath = appendOzPath(ozPath, node.rNoPart);

    if (node.id === nodeId) {
      return nextPath.length > 0 ? nextPath.join('.') : undefined;
    }

    const inChildren = getNodePathOz(node.children, nodeId, nextPath);

    if (inChildren) {
      return inChildren;
    }
  }

  return undefined;
}

function getFullOz(node: GaebNode, ozPath: string[]): string | undefined {
  const fullPath = appendOzPath(ozPath, node.rNoPart);
  return fullPath.length > 0 ? fullPath.join('.') : undefined;
}

function appendOzPath(ozPath: string[], oz?: string): string[] {
  return oz ? [...ozPath, oz] : ozPath;
}

function mapKind(kind: GaebNode['kind']): string {
  switch (kind) {
    case 'category':
      return 'Gruppe';
    case 'item':
      return 'Position';
    case 'remark':
      return 'Hinweis';
    default:
      return kind;
  }
}
