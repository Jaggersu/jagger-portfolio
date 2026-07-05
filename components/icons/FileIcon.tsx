'use client';

import { motion } from 'motion/react';
import type { SVGProps } from 'react';

export function FileIcon({ className, size = 18, animate, ...props }: SVGProps<SVGSVGElement> & { size?: number; animate?: string }) {
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
            <motion.path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                variants={{ hover: { y: -1, transition: { type: 'spring', stiffness: 400, damping: 18 } } }}
            />
            <motion.polyline
                points="14 2 14 8 20 8"
                variants={{ hover: { opacity: [1, 0.5, 1], transition: { duration: 0.4 } } }}
            />
            <motion.line x1="16" y1="13" x2="8" y2="13"
                variants={{ hover: { scaleX: [1, 1.1, 1], transition: { duration: 0.35, delay: 0.05 } } }}
            />
            <motion.line x1="16" y1="17" x2="8" y2="17"
                variants={{ hover: { scaleX: [1, 0.85, 1], transition: { duration: 0.35, delay: 0.1 } } }}
            />
            <motion.line x1="10" y1="9" x2="8" y2="9"
                variants={{ hover: { scaleX: [1, 1.05, 1], transition: { duration: 0.3 } } }}
            />
        </motion.svg>
    );
}
