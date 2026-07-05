'use client';

import { motion } from 'motion/react';
import type { SVGProps } from 'react';

export function LayoutList({ className, size = 18, animate, ...props }: SVGProps<SVGSVGElement> & { size?: number; animate?: string }) {
    return (
        <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            animate={animate}
            {...(props as any)}
        >
            <motion.rect
                x="3" y="5" width="6" height="4" rx="1"
                variants={{ hover: { scaleX: 1.08, originX: '0%', transition: { type: 'spring', stiffness: 400, damping: 20 } } }}
            />
            <motion.rect
                x="3" y="13" width="6" height="4" rx="1"
                variants={{ hover: { scaleX: 1.08, originX: '0%', transition: { type: 'spring', stiffness: 400, damping: 20, delay: 0.04 } } }}
            />
            <motion.line
                x1="13" y1="7" x2="21" y2="7"
                variants={{ hover: { scaleX: [1, 1.12, 1], transition: { duration: 0.35 } } }}
            />
            <motion.line
                x1="13" y1="11" x2="21" y2="11"
                variants={{ hover: { scaleX: [1, 0.85, 1], transition: { duration: 0.35, delay: 0.05 } } }}
            />
            <motion.line
                x1="13" y1="15" x2="21" y2="15"
                variants={{ hover: { scaleX: [1, 1.08, 1], transition: { duration: 0.35, delay: 0.1 } } }}
            />
            <motion.line
                x1="13" y1="19" x2="21" y2="19"
                variants={{ hover: { scaleX: [1, 0.9, 1], transition: { duration: 0.35, delay: 0.15 } } }}
            />
        </motion.svg>
    );
}
