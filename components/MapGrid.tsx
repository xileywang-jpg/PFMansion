
import React, { useEffect, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import TileCard from './TileCard';
import { isInNetworkMode, sendAttackNPC } from '../ws/network';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw, Check, X, XCircle, Ghost, PawPrint, Skull, Heart, Swords } from 'lucide-react';
import { Direction, TileInstance, DirectionalEdges, GameNPC } from '../types';

const TILE_SIZE = 140;

// NPC 图标映射
const NPCIcon: Record<string, React.ReactNode> = {
  GHOST: <Ghost size={20} className="text-purple-400" />,
  BEAST: <PawPrint size={20} className="text-orange-400" />,
  SPIRIT: <Skull size={20} className="text-cyan-400" />,
  ZOMBIE: <Heart size={20} className="text-green-400" />,
};

const MapGrid: React.FC = () => {
  const {
    map, players, npcs, activePlayerId, movePlayer, activeCard,
    pendingTile, pendingTargetPosition, pendingTileRotation, rotatePendingTile, confirmTilePlacement, isPlacementValid,
    setHoveredTileId, cancelTilePlacement
  } = useGameStore();

  const activePlayer = players[activePlayerId];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (pendingTile) {
        if (e.key.toLowerCase() === 'r') rotatePendingTile();
        if (e.key === 'Enter' || e.key === ' ') {
            if (isPlacementValid()) confirmTilePlacement();
        }
        if (e.key === 'Escape') cancelTilePlacement();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingTile, rotatePendingTile, confirmTilePlacement, isPlacementValid, activeCard, cancelTilePlacement]);

  const ghostTileInstance: TileInstance | null = useMemo(() => {
    if (!pendingTile || !pendingTargetPosition) return null;
    const rotateEdges = (edges: DirectionalEdges, rotation: number): DirectionalEdges => {
        const r = ((rotation % 360) + 360) % 360;
        if (r === 0) return edges;
        let newEdges = { ...edges };
        const steps = r / 90;
        for (let i = 0; i < steps; i++) {
            const temp = { ...newEdges };
            newEdges[Direction.East] = temp[Direction.North];
            newEdges[Direction.South] = temp[Direction.East];
            newEdges[Direction.West] = temp[Direction.South];
            newEdges[Direction.North] = temp[Direction.West];
        }
        return newEdges;
    };
    // Fix: Added missing 'droppedItems' property to match TileInstance interface
    return {
        instanceId: 'ghost',
        defId: pendingTile.id,
        x: pendingTargetPosition.x,
        y: pendingTargetPosition.y,
        rotation: pendingTileRotation,
        edges: rotateEdges(pendingTile.edges, pendingTileRotation),
        hasEventTriggered: false,
        visibility: 'VISIBLE',
        droppedItems: []
    };
  }, [pendingTile, pendingTargetPosition, pendingTileRotation]);

  const isValid = isPlacementValid();
  if (!activePlayer) return <div className="relative w-full h-full bg-[#0c0c0e] flex items-center justify-center text-zinc-500 uppercase tracking-widest animate-pulse">协议启动中...</div>;

  return (
    <div className="relative w-full h-full bg-[#0c0c0e] overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] opacity-60" />
      
      <div className="relative transition-transform duration-500 ease-in-out z-10" style={{ width: 0, height: 0, transform: `translate(${-activePlayer.position.x * TILE_SIZE}px, ${-activePlayer.position.y * TILE_SIZE}px)` }}>
        {Object.values(map).map((tile: TileInstance) => {
          // 找出当前在这个地块上的所有玩家
          const playersOnThisTile = Object.values(players).filter(p => p.position.x === tile.x && p.position.y === tile.y);
          const isActivePlayerHere = activePlayer.position.x === tile.x && activePlayer.position.y === tile.y;

          return (
            <div key={tile.instanceId} className="absolute transition-all duration-500" style={{ left: tile.x * TILE_SIZE, top: tile.y * TILE_SIZE, width: 128, height: 128 }} onMouseEnter={() => setHoveredTileId(`${tile.x},${tile.y}`)} onMouseLeave={() => setHoveredTileId(null)}>
              <TileCard tile={tile} isActive={isActivePlayerHere} playersOnTile={playersOnThisTile} />
            </div>
          );
        })}

        {ghostTileInstance && (
            <div className="absolute transition-all duration-200 z-50" style={{ left: ghostTileInstance.x * TILE_SIZE, top: ghostTileInstance.y * TILE_SIZE, width: 128, height: 128 }}>
                <div className={`w-full h-full rounded-sm transition-all duration-300 ${isValid ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-black shadow-lg' : 'ring-2 ring-red-500 opacity-50 grayscale'}`}>
                    <TileCard tile={ghostTileInstance} isActive={false} playersOnTile={[]} />
                </div>
            </div>
        )}

        {/* ========== Phase X: NPC 渲染 ========== */}
        {Object.values(npcs).map((npc: GameNPC) => {
          if (npc.isDead) return null;
          return (
            <div
              key={npc.instanceId}
              className="absolute z-30 flex flex-col items-center justify-center cursor-pointer hover:scale-110 transition-transform group"
              style={{ left: npc.position.x * TILE_SIZE + 64 - 16, top: npc.position.y * TILE_SIZE + 64 - 16, width: 32, height: 32 }}
              title={`${npc.name} (${npc.health}/${npc.maxHealth} HP) - 点击攻击`}
              onClick={() => {
                if (isInNetworkMode()) {
                  sendAttackNPC(npc.instanceId);
                } else {
                  useGameStore.getState().showFeedback('只能在网络模式下攻击 NPC', 'error');
                }
              }}
            >
              <div className="w-8 h-8 rounded-full bg-red-900/80 border-2 border-red-500 flex items-center justify-center shadow-lg group-hover:bg-red-800 transition-colors">
                {NPCIcon[npc.type] || <Ghost size={20} className="text-red-400" />}
                <Swords size={10} className="absolute -bottom-1 -right-1 text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {/* HP 条 */}
              <div className="w-8 h-1 bg-zinc-700 rounded-full mt-0.5 overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${(npc.health / npc.maxHealth) * 100}%` }}
                />
              </div>
              {/* 名称标签 */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] text-red-400 font-bold whitespace-nowrap bg-black/80 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {npc.name}
              </div>
            </div>
          );
        })}

        {!activeCard && !pendingTile && (
            <div className="absolute z-20 w-32 h-32 pointer-events-none" style={{ left: activePlayer.position.x * TILE_SIZE, top: activePlayer.position.y * TILE_SIZE }}>
                <button onClick={() => movePlayer(Direction.North)} className="absolute -top-12 left-1/2 -translate-x-1/2 bg-zinc-800/80 p-2 rounded-full hover:bg-zinc-700 pointer-events-auto border border-zinc-600"><ArrowUp size={16} /></button>
                <button onClick={() => movePlayer(Direction.South)} className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-zinc-800/80 p-2 rounded-full hover:bg-zinc-700 pointer-events-auto border border-zinc-600"><ArrowDown size={16} /></button>
                <button onClick={() => movePlayer(Direction.West)} className="absolute top-1/2 -left-12 -translate-y-1/2 bg-zinc-800/80 p-2 rounded-full hover:bg-zinc-700 pointer-events-auto border border-zinc-600"><ArrowLeft size={16} /></button>
                <button onClick={() => movePlayer(Direction.East)} className="absolute top-1/2 -right-12 -translate-y-1/2 bg-zinc-800/80 p-2 rounded-full hover:bg-zinc-700 pointer-events-auto border border-zinc-600"><ArrowRight size={16} /></button>
            </div>
        )}
      </div>

      {pendingTile && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-zinc-900/90 p-3 rounded-lg border border-zinc-700 backdrop-blur shadow-2xl z-50">
            <div className="flex flex-col items-center mr-2">
                <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1">旋转</span>
                <button onClick={rotatePendingTile} className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200 border border-zinc-600 transition-colors" title="旋转 (R)"><RotateCw size={20} /></button>
            </div>
            <div className="w-px h-10 bg-zinc-700 mx-2" />
            <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1">确认</span>
                <button onClick={confirmTilePlacement} disabled={!isValid} className={`p-3 rounded border flex items-center gap-2 font-bold text-sm transition-all ${isValid ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white' : 'bg-zinc-800 border-zinc-600 text-zinc-500 cursor-not-allowed'}`}>
                    {isValid ? <Check size={20} /> : <X size={20} />}
                    <span>放置房间</span>
                </button>
            </div>
            <div className="w-px h-10 bg-zinc-700 mx-2" />
            <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider mb-1">取消</span>
                <button onClick={cancelTilePlacement} className="p-3 bg-zinc-800 hover:bg-red-900/30 rounded text-zinc-400 hover:text-red-400 border border-zinc-600 hover:border-red-900 transition-colors" title="取消 (Esc)"><XCircle size={20} /></button>
            </div>
        </div>
      )}
    </div>
  );
};

export default MapGrid;
