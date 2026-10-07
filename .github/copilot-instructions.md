# Copilot instructions

Follow [`AGENTS.md`](../AGENTS.md) (single source of truth) and [`.brain/CONVENTIONS.md`](../.brain/CONVENTIONS.md).
Key points: money uses decimals, never floats; stock only via StockService; journals only via PostingService; tenant from the JWT; web UI only from `components/ui`; mobile screens → providers → repositories.
