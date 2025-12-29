---
title: "On Simplicity in Software"
date: 2025-12-29 14:30:00 -0000
tags: [software, design, philosophy]
---

I've been thinking about simplicity in software design lately. There's a great quote from Rich Hickey that captures this well:

> Simplicity is not about counting things. It's about disentangling things. When things are interleaved together, that is complex. When they're separate, that is simple.

This resonates deeply with my experience. The best code I've written isn't the cleverest - it's the code that separates concerns cleanly, making each piece understandable in isolation.

The hardest part isn't writing simple code initially. It's resisting the urge to add "just one more feature" or to anticipate every possible future use case. YAGNI (You Aren't Gonna Need It) is harder to practice than to preach.

## Simplicity in this blog

I applied this philosophy to building this blog:

- No CSS frameworks - just vanilla CSS with custom properties
- No JavaScript frameworks - plain JavaScript for progressive enhancement
- No complex build processes - Jekyll handles everything
- No external dependencies beyond GitHub Pages

Could I have used a fancy static site generator with hot reload, TypeScript, and Tailwind? Sure. But each dependency is a liability - security updates, breaking changes, complexity debt.

Sometimes the simplest solution is the best solution.
