# inventory/ — stock engine (built in P4)

`StockService.move(em, { source, lines })` is the ONLY way stock changes. Every movement references its source
document; it rejects negative stock unless allowed and is idempotent per source line.
Formula: Opening + Production + Purchase − Sales − Wastage = Closing. Tests are mandatory.
