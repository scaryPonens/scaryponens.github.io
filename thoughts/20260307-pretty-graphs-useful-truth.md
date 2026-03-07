# From Pretty Graphs to Useful Truth

I added two visualization layers to `friendly-rotary-phone`:

1. **Graphviz DOT export** for explicit machine diagrams
2. **NetworkX views** in notebooks for quick structural inspection

I didn’t do it for aesthetics.

I did it because logs lie by omission.

A transition table can be technically correct and still hide a bad mental model. Once you draw it, mistakes become obvious:

- unexpected dead ends
- missing emissions
- transitions that look valid but violate intended flow

The same is true for struct graphs.

When constraints attach primitives in the wrong order, the graph tells on you immediately.

---

That said, visualization can also seduce you.

A beautiful graph is not evidence of correctness.

It’s only useful when paired with testable invariants.

So the workflow now is:

- build model
- render graph
- challenge graph with tests
- trust only what survives both

---

I like charts. I like diagrams.

But I like proven behavior more.

#Visualization #Graphviz #NetworkX #Testing #Engineering
