# Provider recovery

Cross-service compatibility is a core differentiator and must degrade gracefully.

When an exact provider match fails:

1. Explain that the same recording was not verified.
2. Offer the closest verified version with artist, title, duration, and provider evidence.
3. Let the user approve the substitution when confidence is below the automatic threshold.
4. Keep the social session available while noncritical metadata resolves.
5. Record a bounded failure or recovery code for reliability analysis.

Never silently substitute a materially different recording while claiming perfect synchronization.
