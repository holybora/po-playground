# Polymarket Binary Arbitrage Bot

Paper trading bot that scans Polymarket binary markets for arbitrage opportunities where `YES_ask + NO_ask < $1.00`.

## How it works

In binary markets, one side (YES or NO) always settles at $1.00. If both sides can be acquired for a combined cost below $1.00, the profit is guaranteed regardless of outcome. The bot continuously scans for these pricing inefficiencies and simulates trades.

## Quick start

```bash
npm install
npm start
```

The bot runs with sensible defaults -- no configuration needed. It will discover the top 50 most liquid binary markets and poll prices every 2 seconds.

## Configuration

All settings can be overridden via environment variables (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `MAX_MARKETS` | 50 | Markets to monitor |
| `PRICE_POLL_MS` | 2000 | Poll interval (ms) |
| `ARB_THRESHOLD` | 0.998 | Max combined cost to trigger |
| `MIN_PROFIT_BPS` | 20 | Min profit in basis points |
| `POSITION_SIZE_USD` | 100 | Paper position size |
| `MAX_OPEN_POSITIONS` | 20 | Max concurrent positions |
| `LOG_LEVEL` | info | debug/info/warn/error |

## Architecture

```
MarketScanner (Gamma API) → PriceMonitor (CLOB SDK) → ArbitrageDetector → PaperTradeEngine → TradeStore
```

- **MarketScanner**: Discovers active binary markets via Gamma API (refreshes every 5 min)
- **PriceMonitor**: Fetches YES/NO order books in parallel via `@polymarket/clob-client`
- **ArbitrageDetector**: Checks if `YES_ask + NO_ask < threshold`
- **PaperTradeEngine**: Simulates trades, enforces position limits, tracks P&L
- **TradeStore**: Persists trades to `data/paper-trades.json` for resume on restart
