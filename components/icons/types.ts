export interface AnimatedIconHandle {
    startAnimation: () => void;
    stopAnimation: () => void;
}

export interface AnimatedIconProps {
    size?: number;
    className?: string;
    strokeWidth?: number;
    color?: string;
}

export function scaledStrokeWidth(strokeWidth: number, viewBoxSize: number, baseSize = 24): number {
    return strokeWidth * (viewBoxSize / baseSize);
}
