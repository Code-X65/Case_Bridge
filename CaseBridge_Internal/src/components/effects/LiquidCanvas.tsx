import { useRef, useEffect } from 'react';

interface Orb {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
}

export default function LiquidCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;

        // Configuration
        const ORB_COUNT = 6;
        const SPEED_SCALE = 0.5;
        const COLORS = [
            'rgba(79, 70, 229, 0.6)',   // Indigo
            'rgba(6, 182, 212, 0.5)',   // Cyan
            'rgba(147, 51, 234, 0.4)',  // Purple
            'rgba(37, 99, 235, 0.5)',   // Blue
        ];

        // Initialize Orbs
        const orbs: Orb[] = [];

        const initOrbs = () => {
            orbs.length = 0;
            for (let i = 0; i < ORB_COUNT; i++) {
                orbs.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * SPEED_SCALE,
                    vy: (Math.random() - 0.5) * SPEED_SCALE,
                    radius: Math.min(width, height) * (0.3 + Math.random() * 0.3), // 30-60% of screen min dim
                    color: COLORS[Math.floor(Math.random() * COLORS.length)]
                });
            }
        };

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            initOrbs();
        };

        window.addEventListener('resize', resize);
        resize();

        // Animation Loop
        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Create a deep base background
            ctx.fillStyle = '#0A0F1E';
            ctx.fillRect(0, 0, width, height);

            // Draw Orbs
            // We use 'screen' or 'lighter' to make overlapping colors glow
            ctx.globalCompositeOperation = 'screen';

            orbs.forEach(orb => {
                // Update position
                orb.x += orb.vx;
                orb.y += orb.vy;

                // Bounce off edges (with margin)
                if (orb.x < -orb.radius) orb.vx = Math.abs(orb.vx);
                if (orb.x > width + orb.radius) orb.vx = -Math.abs(orb.vx);
                if (orb.y < -orb.radius) orb.vy = Math.abs(orb.vy);
                if (orb.y > height + orb.radius) orb.vy = -Math.abs(orb.vy);

                // Draw gradient circle
                const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
                gradient.addColorStop(0, orb.color);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.globalCompositeOperation = 'source-over';

            // Add subtle noise overlay in canvas (optional, but CSS usually handles this better for performance)
            // kept simple here for max FPS.

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none z-0"
            style={{ filter: 'blur(80px)' }} // The magic blur for "liquid" look
        />
    );
}
