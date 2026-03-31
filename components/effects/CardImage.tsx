/**
 * CardImage - 角色/地块卡面占位符组件
 * 
 * 用于显示角色立绘和地块卡面的区域。
 * 当前使用占位符，未来替换为真实图片时只需修改此组件。
 * 
 * 使用方式：
 *   <CardImage 
 *     src={character.portraitUrl} 
 *     alt={character.name}
 *     size="portrait"  // portrait | card | thumbnail
 *     fallbackIcon={User}
 *   />
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, HelpCircle, Image } from 'lucide-react';

// ==================== 类型定义 ====================

export type CardImageSize = 'portrait' | 'card' | 'thumbnail';

// ==================== 尺寸规格 ====================

export const CARD_IMAGE_SIZES: Record<CardImageSize, { width: number; height: number; aspectRatio: string }> = {
  /** 角色立绘大图（PlayerInspectionModal 使用） */
  portrait: { width: 288, height: 432, aspectRatio: '2:3' },
  /** 地块卡面图（TileInspector 建议尺寸） */
  card: { width: 288, height: 432, aspectRatio: '2:3' },
  /** 缩略图（玩家头像 128px） */
  thumbnail: { width: 128, height: 128, aspectRatio: '1:1' },
};

// ==================== 占位符样式配置 ====================

const PLACEHOLDER_STYLES = {
  portrait: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    pattern: 'radial-gradient(circle at 30% 30%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
  },
  card: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #1f1f3a 50%, #151525 100%)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    pattern: 'radial-gradient(circle at 70% 70%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)',
  },
  thumbnail: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    pattern: 'none',
  },
};

// ==================== 组件 ====================

interface CardImageProps {
  /** 图片 URL，为空时显示占位符 */
  src?: string;
  /** 图片描述文字 */
  alt?: string;
  /** 尺寸规格 */
  size?: CardImageSize;
  /** 自定义类名 */
  className?: string;
  /** 占位符图标 */
  fallbackIcon?: React.ComponentType<{ size?: number; className?: string }>;
  /** 是否显示加载动画 */
  showLoading?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 是否圆角裁剪（用于头像） */
  rounded?: boolean;
}

const CardImage: React.FC<CardImageProps> = ({
  src,
  alt = 'image',
  size = 'portrait',
  className = '',
  fallbackIcon: FallbackIcon = User,
  showLoading = false,
  onClick,
  rounded = false,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const sizeConfig = CARD_IMAGE_SIZES[size];
  const styleConfig = PLACEHOLDER_STYLES[size];

  // 是否显示图片（src 存在、加载成功、无错误）
  const showImage = src && isLoaded && !hasError;

  return (
    <motion.div
      className={`
        relative overflow-hidden bg-zinc-900 border
        ${rounded ? 'rounded-full' : 'rounded-xl'}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{
        width: sizeConfig.width,
        height: sizeConfig.height,
        borderColor: styleConfig.borderColor,
        background: showImage ? undefined : styleConfig.background,
      }}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* 背景纹理 */}
      {styleConfig.pattern !== 'none' && (
        <div
          className="absolute inset-0 opacity-50"
          style={{ background: styleConfig.pattern }}
        />
      )}

      {/* 加载状态 */}
      {showLoading && !isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}

      {/* 实际图片 */}
      {showImage && (
        <motion.img
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}

      {/* 占位符 */}
      {(!src || hasError) && !showLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <FallbackIcon 
            size={size === 'thumbnail' ? 32 : 48} 
            className="text-zinc-600 mb-2"
          />
          {size !== 'thumbnail' && (
            <span className="text-[10px] text-zinc-700 uppercase tracking-wider">
              {hasError ? '加载失败' : '暂无图片'}
            </span>
          )}
        </div>
      )}

      {/* 未来替换提示（开发时可见） */}
      {process.env.NODE_ENV === 'development' && !src && size !== 'thumbnail' && (
        <div className="absolute bottom-1 right-1">
          <span className="text-[8px] text-zinc-800 uppercase tracking-tighter">
            {size}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default CardImage;

// ==================== 便捷组件 ====================

/**
 * 角色立绘占位符（固定 288x432）
 */
export const CharacterPortrait: React.FC<{
  src?: string;
  name?: string;
  className?: string;
  onClick?: () => void;
}> = ({ src, name, className, onClick }) => (
  <CardImage
    src={src}
    alt={name || '角色立绘'}
    size="portrait"
    className={className}
    onClick={onClick}
    fallbackIcon={User}
  />
);

/**
 * 地块卡面占位符（固定 288x432）
 */
export const TileCardImage: React.FC<{
  src?: string;
  name?: string;
  className?: string;
  onClick?: () => void;
}> = ({ src, name, className, onClick }) => (
  <CardImage
    src={src}
    alt={name || '地块卡面'}
    size="card"
    className={className}
    onClick={onClick}
    fallbackIcon={HelpCircle}
  />
);

/**
 * 缩略图占位符（固定 128x128 圆形）
 */
export const ThumbnailImage: React.FC<{
  src?: string;
  name?: string;
  className?: string;
  onClick?: () => void;
}> = ({ src, name, className, onClick }) => (
  <CardImage
    src={src}
    alt={name || '缩略图'}
    size="thumbnail"
    className={className}
    onClick={onClick}
    fallbackIcon={Image}
    rounded
  />
);
