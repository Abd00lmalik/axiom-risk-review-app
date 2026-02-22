"use client"

import { useEffect, useRef } from "react"

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animFrame: number
    let t = 0
    const GRID = 52

    const nodes: { x: number; y: number; phase: number; speed: number }[] = []

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      nodes.length  = 0
      for (let x = GRID; x < canvas.width; x += GRID) {
        for (let y = GRID; y < canvas.height; y += GRID) {
          if (Math.random() < 0.045) {
            nodes.push({ x, y, phase: Math.random() * Math.PI * 2, speed: 0.005 + Math.random() * 0.007 })
          }
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 0.007

      // Grid lines
      ctx.lineWidth = 0.5
      for (let x = GRID; x < canvas.width; x += GRID) {
        ctx.globalAlpha = 0.5
        ctx.strokeStyle = "hsl(220, 25%, 10%)"
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = GRID; y < canvas.height; y += GRID) {
        ctx.globalAlpha = 0.5
        ctx.strokeStyle = "hsl(220, 25%, 10%)"
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }

      // Pulsing nodes
      nodes.forEach((node) => {
        const pulse = Math.sin(t * node.speed * 80 + node.phase)
        const alpha = 0.12 + pulse * 0.14
        ctx.globalAlpha = alpha * 0.35
        ctx.strokeStyle = "hsl(197, 100%, 47%)"
        ctx.lineWidth = 0.8
        ctx.beginPath(); ctx.arc(node.x, node.y, 5 + pulse * 3, 0, Math.PI * 2); ctx.stroke()
        ctx.globalAlpha = alpha
        ctx.fillStyle = "hsl(197, 100%, 47%)"
        ctx.beginPath(); ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2); ctx.fill()
      })

      // Sweep line
      const sweepY = ((t * 16) % (canvas.height + 100)) - 50
      const sweepGrad = ctx.createLinearGradient(0, sweepY - 35, 0, sweepY + 35)
      sweepGrad.addColorStop(0, "transparent")
      sweepGrad.addColorStop(0.45, "hsl(197 100% 47% / 0.07)")
      sweepGrad.addColorStop(0.5, "hsl(197 100% 47% / 0.14)")
      sweepGrad.addColorStop(0.55, "hsl(197 100% 47% / 0.07)")
      sweepGrad.addColorStop(1, "transparent")
      ctx.globalAlpha = 1
      ctx.fillStyle = sweepGrad
      ctx.fillRect(0, sweepY - 35, canvas.width, 70)

      // Corner glows
      const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, canvas.width * 0.4)
      g1.addColorStop(0, "hsl(213 94% 60% / 0.06)"); g1.addColorStop(1, "transparent")
      ctx.fillStyle = g1; ctx.fillRect(0, 0, canvas.width, canvas.height)

      const g2 = ctx.createRadialGradient(canvas.width, canvas.height, 0, canvas.width, canvas.height, canvas.width * 0.45)
      g2.addColorStop(0, "hsl(197 100% 47% / 0.05)"); g2.addColorStop(1, "transparent")
      ctx.fillStyle = g2; ctx.fillRect(0, 0, canvas.width, canvas.height)

      animFrame = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener("resize", resize)
    return () => { cancelAnimationFrame(animFrame); window.removeEventListener("resize", resize) }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} aria-hidden="true" />
}