import React, { useEffect, useRef } from "react";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}

const FloatingParticles: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let particles: Particle[] = [];
        let animationFrameId: number;

        // We'll use the PMX Green accent color
        const baseColor = "126, 200, 67"; // RGB for #7ec843 / var(--accent)

        // Mouse coordinates
        let mouseX = -1000;
        let mouseY = -1000;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const initParticles = () => {
            particles = [];
            // Calculate a good number of particles based on screen size (e.g. 1 per 10,000 pixels)
            const numParticles = Math.floor((canvas.width * canvas.height) / 10000);
            for (let i = 0; i < numParticles; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 0.8, // Speed X
                    vy: (Math.random() - 0.5) * 0.8, // Speed Y
                    radius: Math.random() * 2 + 1, // Radius between 1 and 3
                });
            }
        };

        const drawParticles = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Distance inside which particles connect to mouse
            const mouseActiveRadius = 150;

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Move particle
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around screen
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${baseColor}, 0.5)`;
                ctx.fill();

                // Check distance to mouse
                const dxMouse = p.x - mouseX;
                const dyMouse = p.y - mouseY;
                const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

                if (distMouse < mouseActiveRadius) {
                    // Draw line to mouse
                    const alphaMouse = 1 - distMouse / mouseActiveRadius;
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(${baseColor}, ${alphaMouse * 0.4})`; // Faint line
                    ctx.lineWidth = 1;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouseX, mouseY);
                    ctx.stroke();

                    // Optionally add a slight magnetic pull towards cursor
                    // p.vx -= dxMouse * 0.0001;
                    // p.vy -= dyMouse * 0.0001; 
                }

                // Draw connections between nearby particles
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 100) { // Connect particles within 100px
                        // If both are near mouse, draw line stronger
                        const distP2Mouse = Math.sqrt(Math.pow(p2.x - mouseX, 2) + Math.pow(p2.y - mouseY, 2));
                        if (distMouse < mouseActiveRadius && distP2Mouse < mouseActiveRadius) {
                            const alpha = 1 - dist / 100;
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(${baseColor}, ${alpha * 0.6})`;
                            ctx.lineWidth = 1;
                            ctx.moveTo(p.x, p.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    }
                }
            }

            animationFrameId = requestAnimationFrame(drawParticles);
        };

        window.addEventListener("resize", resize);

        // Track mouse
        const handleMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };
        const handleMouseLeave = () => {
            mouseX = -1000;
            mouseY = -1000;
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseout", handleMouseLeave);

        resize();
        drawParticles();

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseout", handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none", // Let clicks pass through to the form
                zIndex: 0, // Put it behind the form
            }}
        />
    );
};

export default FloatingParticles;
