import type { WbsComputed, WbsState } from '../../types/wbs'
import { MAX_DEPTH, nodeDepth } from '../../lib/wbs/tree'
import WbsNodeCard from './WbsNodeCard'

interface Props {
  state: WbsState
  computed: WbsComputed
  selectedId: string
  onSelect: (id: string) => void
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
}

export default function WbsTreeView({
  state,
  computed,
  selectedId,
  onSelect,
  onAddChild,
  onDelete,
}: Props) {
  const renderNode = (id: string) => {
    const node = state.nodes[id]
    return (
      <li key={id}>
        <WbsNodeCard
          node={node}
          rollup={computed.perNode[id]}
          selected={id === selectedId}
          canAddChild={nodeDepth(state.nodes, id) < MAX_DEPTH}
          onSelect={onSelect}
          onAddChild={onAddChild}
          onDelete={onDelete}
        />
        {node.childIds.length > 0 && <ul>{node.childIds.map(renderNode)}</ul>}
      </li>
    )
  }

  return (
    <div className="overflow-x-auto pb-6">
      <ul className="wbs-tree">{renderNode(state.rootId)}</ul>
    </div>
  )
}
